import { createClient } from "@supabase/supabase-js";
import {
  PRIORITY_EXTENSIONS,
  SKILL_CATEGORY,
  computeComplexityScore,
  computeMaturityScore,
  computeQualityScore,
  computeSecurityScore,
  computeTestingScore,
  detectContentSkills,
  detectLanguageSkills,
  detectTreeSignals,
  extensionOf,
  fileHasSecretPattern,
  fileUsesEnvVars,
  inferConceptSkills,
} from "./analyzer-core.ts";

// ---------------------------------------------------------------------------
// SkillOS repository analyzer (real code analysis)
//
// This Edge Function reads a user's GitHub repositories and turns them into
// evidence-backed skill signals. Unlike a metadata-only heuristic, it opens
// real source files, matches import/usage patterns, and stores the actual
// file path, a code snippet, and line numbers as evidence. Repository scores
// (testing / security / quality / complexity / maturity) are derived from
// real file-level signals.
//
// All of the actual detection/scoring logic lives in ./analyzer-core.ts,
// which has zero Deno/network/database dependencies and is unit tested
// directly (analyzer-core.test.ts). This file owns I/O only: GitHub fetches,
// Supabase reads/writes, SSE streaming, and orchestration.
//
// The HTTP contract (POST -> Server-Sent Events stream of {progress, stage,
// done, repos_analyzed, skills_detected, error}) is unchanged, so the
// frontend `analyzeRepositories()` client works without modification.
// ---------------------------------------------------------------------------

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  updated_at: string;
  default_branch: string;
  languages_url: string;
  topics?: string[];
}

interface TreeEntry {
  path: string;
  type: string;
}

const MAX_REPOS = 20;
const MAX_FILES_PER_REPO = 15;
const MAX_FILE_BYTES = 200_000;

function getCorsHeaders(req: Request) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    Deno.env.get("SITE_URL") || "",
    Deno.env.get("ALLOWED_ORIGIN") || "",
  ].filter(Boolean);

  const origin = req.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Fetch GitHub with exponential backoff on rate limiting, and a pre-emptive
// pause when the remaining quota is nearly exhausted.
async function githubFetch(
  url: string,
  headers: Record<string, string>,
  retries = 3,
): Promise<Response> {
  const res = await fetch(url, { headers });

  const remaining = parseInt(res.headers.get("X-RateLimit-Remaining") ?? "", 10);
  const reset = parseInt(res.headers.get("X-RateLimit-Reset") ?? "", 10);

  if ((res.status === 429 || res.status === 403) && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "", 10);
    let waitMs: number;
    if (!Number.isNaN(retryAfter)) {
      waitMs = retryAfter * 1000;
    } else if (!Number.isNaN(reset)) {
      waitMs = Math.max(reset * 1000 - Date.now(), 1000);
    } else {
      waitMs = (4 - retries) * 2000 + 1000; // 1s, 3s, 5s ...
    }
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 20_000)));
    return githubFetch(url, headers, retries - 1);
  }

  // Be polite: if we're nearly out of quota, pause briefly before the reset.
  if (!Number.isNaN(remaining) && remaining < 10 && !Number.isNaN(reset)) {
    const waitMs = Math.max(reset * 1000 - Date.now(), 0);
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 15_000)));
  }

  return res;
}

async function fetchRepositoryPages(
  githubUsername: string,
  githubHeaders: Record<string, string>,
): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const authenticatedUrl = `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`;
    const publicUrl = `https://api.github.com/users/${githubUsername}/repos?per_page=100&page=${page}&sort=updated`;
    const url = githubHeaders.Authorization ? authenticatedUrl : publicUrl;

    const response = await githubFetch(url, githubHeaders);
    if (!response.ok) {
      if (githubHeaders.Authorization) {
        const fallback = await githubFetch(publicUrl, githubHeaders);
        if (!fallback.ok) throw new Error("Failed to fetch GitHub repos");
        const repos = (await fallback.json()) as GitHubRepo[];
        allRepos.push(...repos);
        if (repos.length < 100) break;
      } else {
        throw new Error("Failed to fetch GitHub repos");
      }
    } else {
      const repos = (await response.json()) as GitHubRepo[];
      allRepos.push(...repos);
      if (repos.length < 100) break;
    }

    page += 1;
    if (page > 5) break; // hard cap on pagination
  }

  return allRepos;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { github_token } = await req.json().catch(() => ({ github_token: "" }));
    const githubHeaders: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "SkillOS-Analyzer",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (github_token) githubHeaders.Authorization = `Bearer ${github_token}`;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("github_id, last_analyzed_at")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Throttle: at most once per 5 minutes.
    if (profile.last_analyzed_at) {
      const minutesSince = (Date.now() - new Date(profile.last_analyzed_at).getTime()) / 60000;
      if (minutesSince < 5) {
        return new Response(
          JSON.stringify({ error: `Analysis was run ${Math.round(minutesSince)} min ago. Please wait ${Math.ceil(5 - minutesSince)} more minutes.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const allRepos = await fetchRepositoryPages(profile.github_id, githubHeaders);
    const repos = allRepos.slice(0, MAX_REPOS);

    const { data: allSkills, error: skillsError } = await supabaseClient.from("skills").select("*");
    if (skillsError) throw skillsError;

    const { data: existingRepos, error: existingReposError } = await supabaseClient
      .from("repositories")
      .select("id, github_id")
      .eq("user_id", user.id);
    if (existingReposError) throw existingReposError;

    const currentGithubRepoIds = new Set(repos.map((repo) => String(repo.id)));
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (payload: Record<string, unknown>) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    };

    void (async () => {
      const analyzedRepoIds = new Set<string>();
      // skill name -> aggregated detection across repos
      const skillScores: Record<
        string,
        {
          category: string;
          scores: number[];
          evidence: Array<{ repoId: string; score: number; file_path: string; code_snippet: string; line_numbers: number[] }>;
        }
      > = {};
      let processedRepos = 0;
      let hadRepoFailures = false;

      const recordSkill = (
        skill: string,
        category: string,
        repoId: string,
        score: number,
        filePath: string,
        snippet: string,
        lineNumbers: number[],
      ) => {
        if (!skillScores[skill]) skillScores[skill] = { category, scores: [], evidence: [] };
        skillScores[skill].scores.push(score);
        skillScores[skill].evidence.push({
          repoId,
          score,
          file_path: filePath,
          code_snippet: snippet,
          line_numbers: lineNumbers,
        });
      };

      try {
        for (const repo of repos) {
          try {
            // --- Languages ---
            const languagesRes = await githubFetch(repo.languages_url, githubHeaders).catch(() => null);
            const languagesData = languagesRes?.ok
              ? (await languagesRes.json()) as Record<string, number>
              : {};
            const totalBytes = Object.values(languagesData).reduce((sum, b) => sum + b, 0);
            const languagePercents: Record<string, number> = {};
            if (totalBytes > 0) {
              for (const [lang, bytes] of Object.entries(languagesData)) {
                languagePercents[lang] = Math.round((bytes / totalBytes) * 100);
              }
            } else if (repo.language) {
              languagePercents[repo.language] = 100;
            }
            const languageCount = Math.max(Object.keys(languagePercents).length, 1);

            // --- Commit count (best-effort, used for context) ---
            let commitCount = 0;
            try {
              const commitsRes = await githubFetch(
                `https://api.github.com/repos/${repo.full_name}/commits?per_page=1`,
                githubHeaders,
              );
              const linkHeader = commitsRes.headers.get("Link") || "";
              const match = linkHeader.match(/page=(\d+)>; rel="last"/);
              commitCount = match ? parseInt(match[1], 10) : 1;
            } catch {
              commitCount = 1;
            }

            // --- Recursive file tree ---
            const branch = repo.default_branch || "HEAD";
            const treeRes = await githubFetch(
              `https://api.github.com/repos/${repo.full_name}/git/trees/${branch}?recursive=1`,
              githubHeaders,
            ).catch(() => null);

            let fileStructure: string[] = [];
            if (treeRes?.ok) {
              const tree = await treeRes.json();
              fileStructure = ((tree.tree || []) as TreeEntry[])
                .filter((item) => item.type === "blob")
                .map((item) => item.path);
            }

            const treeSignals = detectTreeSignals(fileStructure);

            // --- Read priority source files for real evidence ---
            const priorityFiles = fileStructure
              .filter((p) => PRIORITY_EXTENSIONS.has(extensionOf(p)))
              .sort((a, b) => a.split("/").length - b.split("/").length) // shallow first
              .slice(0, MAX_FILES_PER_REPO);

            let secretsFound = 0;
            let envUsageFound = false;
            const repoDetectedSkills = new Set<string>();

            for (const filePath of priorityFiles) {
              try {
                const contentRes = await githubFetch(
                  `https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${branch}`,
                  { ...githubHeaders, Accept: "application/vnd.github.raw+json" },
                );
                if (!contentRes.ok) continue;

                // The contents endpoint usually returns raw text with the raw
                // media type, but can fall back to a JSON envelope with base64
                // content. Handle both so analysis is robust.
                let raw = await contentRes.text();
                if (raw.startsWith("{") && contentRes.headers.get("Content-Type")?.includes("json")) {
                  try {
                    const parsed = JSON.parse(raw) as { content?: string; encoding?: string };
                    if (parsed.encoding === "base64" && parsed.content) {
                      raw = atob(parsed.content.replace(/\n/g, ""));
                    }
                  } catch {
                    // leave raw as-is
                  }
                }
                if (raw.length > MAX_FILE_BYTES) continue;

                if (fileUsesEnvVars(raw)) envUsageFound = true;
                if (fileHasSecretPattern(raw)) secretsFound += 1;

                for (const detection of detectContentSkills(raw)) {
                  recordSkill(detection.skill, detection.category, "PENDING", 0.9, filePath, detection.snippet, detection.lines);
                  repoDetectedSkills.add(detection.skill);
                }
              } catch {
                // ignore unreadable files
              }
            }

            // --- Language skills from extensions + languages API (real signal) ---
            const extLanguages = detectLanguageSkills(fileStructure, languagePercents);
            for (const lang of extLanguages) {
              recordSkill(lang, SKILL_CATEGORY[lang] || "language", "PENDING", 0.8, "language-signal", "", []);
              repoDetectedSkills.add(lang);
            }

            // --- Tree-based devops skills (real signal) ---
            if (treeSignals.hasDockerfile) { recordSkill("Docker", "devops", "PENDING", 0.85, "Dockerfile", "", []); repoDetectedSkills.add("Docker"); }
            if (treeSignals.hasTerraform) { recordSkill("Terraform", "devops", "PENDING", 0.85, "*.tf", "", []); repoDetectedSkills.add("Terraform"); }
            if (treeSignals.hasK8s) { recordSkill("Kubernetes", "devops", "PENDING", 0.8, "k8s manifests", "", []); repoDetectedSkills.add("Kubernetes"); }
            if (treeSignals.hasCI) { recordSkill("CI/CD", "devops", "PENDING", 0.8, ".github/workflows", "", []); repoDetectedSkills.add("CI/CD"); }
            if (treeSignals.testFileCount > 0 && !repoDetectedSkills.has("Testing")) {
              recordSkill("Testing", "practice", "PENDING", 0.75, "test files", "", []);
              repoDetectedSkills.add("Testing");
            }

            // --- Inferred concept skills ---
            for (const concept of inferConceptSkills(repoDetectedSkills)) {
              recordSkill(concept, "concept", "PENDING", 0.7, "inferred from stack", "", []);
              repoDetectedSkills.add(concept);
            }

            // --- Real scores ---
            const testingScore = computeTestingScore(treeSignals.testFileCount, treeSignals.totalFileCount);
            const securityScore = computeSecurityScore(secretsFound, envUsageFound, treeSignals.hasSecurityMd);
            const qualityScore100 = computeQualityScore({
              hasReadme: treeSignals.hasReadme,
              hasLinter: treeSignals.hasLinter,
              hasTypes: treeSignals.hasTypes,
              isFork: repo.fork,
              hasCI: treeSignals.hasCI,
            });
            const complexityScore = computeComplexityScore(fileStructure.length, languageCount);
            const maturityScore = computeMaturityScore(testingScore, securityScore, qualityScore100, complexityScore);

            const repoData = {
              user_id: user.id,
              github_id: String(repo.id),
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description || "",
              language: repo.language || "",
              languages: languagePercents,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              is_fork: repo.fork,
              commits: commitCount,
              last_activity_days: Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / 86_400_000),
              dependencies: [],
              patterns: Array.from(repoDetectedSkills),
              file_structure: fileStructure.slice(0, 500),
              quality_score: Math.round(qualityScore100) / 100,
            };

            const { data: repositoryRecord, error: repoUpsertError } = await supabaseClient
              .from("repositories")
              .upsert(repoData, { onConflict: "user_id,github_id" })
              .select("id")
              .single();
            if (repoUpsertError || !repositoryRecord) {
              throw repoUpsertError || new Error("Failed to save repository");
            }

            const repoId = repositoryRecord.id;
            analyzedRepoIds.add(repoId);

            // Bind this repo's PENDING evidence rows to the real repo id.
            for (const data of Object.values(skillScores)) {
              for (const ev of data.evidence) {
                if (ev.repoId === "PENDING") ev.repoId = repoId;
              }
            }

            const { error: repoAnalysisError } = await supabaseClient
              .from("repo_analysis")
              .upsert(
                {
                  repo_id: repoId,
                  quality_score: qualityScore100,
                  complexity_score: complexityScore,
                  testing_score: testingScore,
                  security_score: securityScore,
                  maturity_score: maturityScore,
                },
                { onConflict: "repo_id" },
              );
            if (repoAnalysisError) throw repoAnalysisError;
          } catch (repoError) {
            hadRepoFailures = true;
            console.error(`Failed to analyze repo ${repo.full_name}:`, repoError);
          } finally {
            processedRepos += 1;
            await writeEvent({
              progress: repos.length === 0 ? 100 : Math.round((processedRepos / repos.length) * 100),
              stage: `Analyzing ${repo.name}...`,
              done: false,
            });
          }
        }

        // --- Persist skills + evidence ---
        const detectedSkillIds = new Set<string>();

        for (const [skillName, data] of Object.entries(skillScores)) {
          const skill = (allSkills || []).find((entry: { id: string; name: string }) => entry.name === skillName);
          if (!skill) continue;
          detectedSkillIds.add(skill.id);

          const sorted = [...data.scores].sort((a, b) => b - a);
          const top = sorted.slice(0, 3);
          const confidence = Math.max(
            1,
            Math.min(100, Math.round((top.reduce((s, v) => s + v, 0) / top.length) * 100)),
          );

          const { data: userSkill, error: userSkillError } = await supabaseClient
            .from("user_skills")
            .upsert({ user_id: user.id, skill_id: skill.id, confidence }, { onConflict: "user_id,skill_id" })
            .select("id")
            .single();
          if (userSkillError || !userSkill) throw userSkillError || new Error("Failed to save user skill");

          await supabaseClient.from("skill_evidence").delete().eq("user_skill_id", userSkill.id);

          // Keep the strongest, real evidence rows (prefer ones with snippets).
          const evidenceRows = data.evidence
            .filter((ev) => ev.repoId && ev.repoId !== "PENDING")
            .sort((a, b) => (b.code_snippet ? 1 : 0) - (a.code_snippet ? 1 : 0))
            .slice(0, 10)
            .map((ev) => ({
              user_skill_id: userSkill.id,
              repo_id: ev.repoId,
              file_path: ev.file_path,
              code_snippet: ev.code_snippet,
              line_numbers: ev.line_numbers,
              score: ev.score,
              flags: [],
            }));

          if (evidenceRows.length > 0) {
            const { error: evidenceError } = await supabaseClient.from("skill_evidence").insert(evidenceRows);
            if (evidenceError) throw evidenceError;
          }
        }

        // --- Stale cleanup (only on a clean run) ---
        if (!hadRepoFailures) {
          const { data: existingUserSkills, error: existingUserSkillsError } = await supabaseClient
            .from("user_skills")
            .select("id, skill_id")
            .eq("user_id", user.id);
          if (existingUserSkillsError) throw existingUserSkillsError;

          const staleUserSkillIds = (existingUserSkills || [])
            .filter((entry: { id: string; skill_id: string }) => !detectedSkillIds.has(entry.skill_id))
            .map((entry: { id: string }) => entry.id);

          if (staleUserSkillIds.length > 0) {
            const { error: staleSkillsError } = await supabaseClient.from("user_skills").delete().in("id", staleUserSkillIds);
            if (staleSkillsError) throw staleSkillsError;
          }
        }

        const staleRepoIds = (existingRepos || [])
          .filter((repo: { id: string; github_id: string }) => !currentGithubRepoIds.has(repo.github_id))
          .map((repo: { id: string }) => repo.id);

        if (staleRepoIds.length > 0) {
          const { error: staleReposError } = await supabaseClient.from("repositories").delete().in("id", staleRepoIds);
          if (staleReposError) throw staleReposError;
        }

        await supabaseClient
          .from("profiles")
          .update({ last_analyzed_at: new Date().toISOString() })
          .eq("id", user.id);

        await writeEvent({
          progress: 100,
          stage: "Complete!",
          done: true,
          repos_analyzed: analyzedRepoIds.size,
          skills_detected: detectedSkillIds.size,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("analyze-repos stream failed:", error);
        await writeEvent({ progress: 100, stage: message, done: true, error: message });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
