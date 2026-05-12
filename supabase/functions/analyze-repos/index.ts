import { createClient } from "npm:@supabase/supabase-js@2";

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
  languages_url: string;
  topics?: string[];
}

interface SkillRule {
  skill: string;
  category: string;
  signals: Array<{
    match: string[];
    weight: number;
  }>;
}

const SKILL_RULES: SkillRule[] = [
  {
    skill: "Backend Development",
    category: "concept",
    signals: [
      { match: ["fastapi", "express", "django", "flask", "spring"], weight: 0.35 },
      { match: ["rest_api", "api"], weight: 0.25 },
      { match: ["orm", "prisma", "sqlalchemy"], weight: 0.2 },
      { match: ["middleware"], weight: 0.1 },
    ],
  },
  {
    skill: "REST API Design",
    category: "concept",
    signals: [
      { match: ["rest_api", "api", "rest"], weight: 0.35 },
      { match: ["fastapi", "express"], weight: 0.2 },
      { match: ["pydantic", "joi"], weight: 0.2 },
    ],
  },
  {
    skill: "Database Design",
    category: "concept",
    signals: [
      { match: ["orm", "prisma", "sqlalchemy"], weight: 0.35 },
      { match: ["migrations", "migration"], weight: 0.2 },
      { match: ["database", "db"], weight: 0.25 },
    ],
  },
  {
    skill: "Authentication Systems",
    category: "concept",
    signals: [
      { match: ["jwt", "jsonwebtoken", "auth"], weight: 0.4 },
      { match: ["oauth", "passport"], weight: 0.3 },
      { match: ["bcrypt", "passlib"], weight: 0.2 },
    ],
  },
  {
    skill: "Frontend Development",
    category: "concept",
    signals: [
      { match: ["react", "vue", "angular", "svelte"], weight: 0.35 },
      { match: ["component", "responsive"], weight: 0.25 },
      { match: ["state"], weight: 0.2 },
    ],
  },
  {
    skill: "Full-Stack Development",
    category: "concept",
    signals: [
      { match: ["fullstack", "full-stack", "frontend", "backend"], weight: 0.3 },
      { match: ["api", "react", "next", "express"], weight: 0.25 },
    ],
  },
  {
    skill: "React",
    category: "framework",
    signals: [
      { match: ["react"], weight: 0.4 },
      { match: ["react-dom", "react-query"], weight: 0.2 },
      { match: ["component"], weight: 0.2 },
    ],
  },
  {
    skill: "Vue",
    category: "framework",
    signals: [{ match: ["vue", "nuxt", "vuex"], weight: 0.5 }],
  },
  {
    skill: "Angular",
    category: "framework",
    signals: [{ match: ["angular", "nx"], weight: 0.5 }],
  },
  {
    skill: "Django",
    category: "framework",
    signals: [{ match: ["django"], weight: 0.6 }],
  },
  {
    skill: "FastAPI",
    category: "framework",
    signals: [{ match: ["fastapi", "pydantic"], weight: 0.5 }],
  },
  {
    skill: "Flask",
    category: "framework",
    signals: [{ match: ["flask", "jinja"], weight: 0.5 }],
  },
  {
    skill: "Express",
    category: "framework",
    signals: [{ match: ["express", "node"], weight: 0.5 }],
  },
  {
    skill: "GraphQL",
    category: "framework",
    signals: [{ match: ["graphql", "apollo", "hasura"], weight: 0.5 }],
  },
  {
    skill: "Next.js",
    category: "framework",
    signals: [{ match: ["next", "nextjs", "next.js"], weight: 0.5 }],
  },
  {
    skill: "TypeScript",
    category: "language",
    signals: [
      { match: ["typescript"], weight: 0.5 },
      { match: ["interface", "type"], weight: 0.3 },
    ],
  },
  {
    skill: "Python",
    category: "language",
    signals: [
      { match: ["python", "pydantic", "fastapi", "django", "flask"], weight: 0.4 },
      { match: ["pip"], weight: 0.3 },
    ],
  },
  {
    skill: "JavaScript",
    category: "language",
    signals: [
      { match: ["javascript", "express", "node"], weight: 0.4 },
      { match: ["npm"], weight: 0.2 },
    ],
  },
  {
    skill: "Go",
    category: "language",
    signals: [{ match: ["go", "golang", "gin", "fiber"], weight: 0.5 }],
  },
  {
    skill: "Rust",
    category: "language",
    signals: [{ match: ["rust", "cargo", "actix", "tokio"], weight: 0.5 }],
  },
  {
    skill: "PostgreSQL",
    category: "database",
    signals: [{ match: ["postgres", "postgresql", "psql", "pg"], weight: 0.5 }],
  },
  {
    skill: "MongoDB",
    category: "database",
    signals: [{ match: ["mongo", "mongodb", "mongoose"], weight: 0.5 }],
  },
  {
    skill: "Redis",
    category: "database",
    signals: [{ match: ["redis", "cache"], weight: 0.4 }],
  },
  {
    skill: "Docker",
    category: "devops",
    signals: [{ match: ["docker", "dockerfile", "compose", "container"], weight: 0.5 }],
  },
  {
    skill: "Kubernetes",
    category: "devops",
    signals: [{ match: ["kubernetes", "k8s", "helm", "kubectl"], weight: 0.5 }],
  },
  {
    skill: "AWS",
    category: "devops",
    signals: [{ match: ["aws", "lambda", "s3", "ec2", "cloudformation"], weight: 0.5 }],
  },
  {
    skill: "CI/CD",
    category: "devops",
    signals: [
      { match: ["github", "workflow", "actions"], weight: 0.4 },
      { match: ["deployment"], weight: 0.2 },
    ],
  },
  {
    skill: "Machine Learning",
    category: "concept",
    signals: [
      { match: ["ml", "machine-learning", "tensorflow", "pytorch", "sklearn", "keras", "model"], weight: 0.4 },
    ],
  },
  {
    skill: "Testing",
    category: "practice",
    signals: [{ match: ["test", "pytest", "jest", "vitest", "cypress", "playwright", "spec", "mocha", "chai"], weight: 0.4 }],
  },
  {
    skill: "Java",
    category: "language",
    signals: [{ match: ["java", "spring", "maven", "gradle"], weight: 0.5 }],
  },
  {
    skill: "Ruby",
    category: "language",
    signals: [{ match: ["ruby", "rails", "gem"], weight: 0.5 }],
  },
  {
    skill: "PHP",
    category: "language",
    signals: [{ match: ["php", "laravel", "symfony", "composer"], weight: 0.5 }],
  },
  {
    skill: "C++",
    category: "language",
    signals: [{ match: ["cpp", "c++", "cmake", "clang"], weight: 0.5 }],
  },
  {
    skill: "Spring",
    category: "framework",
    signals: [{ match: ["spring", "springboot", "spring-boot"], weight: 0.5 }],
  },
  {
    skill: "MySQL",
    category: "database",
    signals: [{ match: ["mysql", "mariadb"], weight: 0.5 }],
  },
  {
    skill: "Elasticsearch",
    category: "database",
    signals: [{ match: ["elasticsearch", "elastic", "kibana"], weight: 0.5 }],
  },
  {
    skill: "GCP",
    category: "devops",
    signals: [{ match: ["gcp", "google-cloud", "gke", "bigquery", "pubsub"], weight: 0.5 }],
  },
  {
    skill: "Azure",
    category: "devops",
    signals: [{ match: ["azure", "az-", "azuredevops"], weight: 0.5 }],
  },
  {
    skill: "Terraform",
    category: "devops",
    signals: [{ match: ["terraform", "hcl", ".tf"], weight: 0.5 }],
  },
  {
    skill: "State Management",
    category: "concept",
    signals: [{ match: ["redux", "zustand", "mobx", "recoil", "vuex", "pinia"], weight: 0.5 }],
  },
  {
    skill: "System Design",
    category: "concept",
    signals: [{ match: ["microservice", "grpc", "message-queue", "kafka", "rabbitmq", "event-driven"], weight: 0.45 }],
  },
  {
    skill: "Mobile Development",
    category: "concept",
    signals: [{ match: ["react-native", "flutter", "expo", "ios", "android", "swift", "kotlin"], weight: 0.5 }],
  },
  {
    skill: "Security Practices",
    category: "practice",
    signals: [{ match: ["security", "vulnerability", "owasp", "cve", "pen-test", "sast"], weight: 0.45 }],
  },
  {
    skill: "Data Visualization",
    category: "concept",
    signals: [{ match: ["d3", "chart", "plotly", "tableau", "visualization", "dashboard"], weight: 0.4 }],
  },
];

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
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function computeQualityScore(repo: GitHubRepo, hasReadme: boolean, hasTests: boolean): number {
  let score = 0;
  if (repo.description && repo.description.length > 10) score += 0.15;
  if (hasReadme) score += 0.2;
  if (hasTests) score += 0.2;
  if (repo.stargazers_count > 0) score += 0.1;
  if (repo.forks_count > 0) score += 0.1;
  if (!repo.fork) score += 0.1;

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.updated_at).getTime()) / 86_400_000
  );
  if (daysSinceUpdate < 365) score += 0.15;

  return Math.min(Math.round(score * 100) / 100, 1);
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

    const response = await fetch(url, { headers: githubHeaders });
    if (!response.ok) {
      if (githubHeaders.Authorization) {
        const fallback = await fetch(publicUrl, { headers: githubHeaders });
        if (!fallback.ok) {
          throw new Error("Failed to fetch GitHub repos");
        }
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
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

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

    if (github_token) {
      githubHeaders.Authorization = `Bearer ${github_token}`;
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("github_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const repos = await fetchRepositoryPages(profile.github_id, githubHeaders);

    // Guard: check for recent analysis (throttle to once per 5 minutes)
    const { data: profileRow } = await supabaseClient
      .from("profiles")
      .select("last_analyzed_at")
      .eq("id", user.id)
      .single();

    if (profileRow?.last_analyzed_at) {
      const minutesSince = (Date.now() - new Date(profileRow.last_analyzed_at).getTime()) / 60000;
      if (minutesSince < 5) {
        return new Response(
          JSON.stringify({ error: `Analysis was run ${Math.round(minutesSince)} min ago. Please wait ${Math.ceil(5 - minutesSince)} more minutes.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: allSkills, error: skillsError } = await supabaseClient
      .from("skills")
      .select("*");

    if (skillsError) {
      throw skillsError;
    }

    const { data: existingRepos, error: existingReposError } = await supabaseClient
      .from("repositories")
      .select("id, github_id")
      .eq("user_id", user.id);

    if (existingReposError) {
      throw existingReposError;
    }

    const currentGithubRepoIds = new Set(repos.map((repo) => String(repo.id)));
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (payload: Record<string, unknown>) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    };

    void (async () => {
      const analyzedRepoIds = new Set<string>();
      const skillScores: Record<string, { scores: number[]; repos: Array<{ repoId: string; score: number }> }> = {};
      let processedRepos = 0;
      let hadRepoFailures = false;

      try {
        for (const repo of repos) {
          try {
            const languagesRes = await fetch(repo.languages_url, { headers: githubHeaders }).catch(() => null);
            const languagesData = languagesRes?.ok
              ? await languagesRes.json() as Record<string, number>
              : {};

            const totalBytes = Object.values(languagesData).reduce((sum, bytes) => sum + bytes, 0);
            const languagePercents: Record<string, number> = {};

            if (totalBytes > 0) {
              for (const [lang, bytes] of Object.entries(languagesData)) {
                languagePercents[lang] = Math.round((bytes / totalBytes) * 100);
              }
            } else if (repo.language) {
              languagePercents[repo.language] = 100;
            }

            let commitCount = 0;
            try {
              const commitsRes = await fetch(
                `https://api.github.com/repos/${repo.full_name}/commits?per_page=1`,
                { headers: githubHeaders },
              );
              const linkHeader = commitsRes.headers.get("Link") || "";
              const match = linkHeader.match(/page=(\d+)>; rel="last"/);
              commitCount = match ? parseInt(match[1], 10) : 1;
            } catch {
              commitCount = 1;
            }

            const treeRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/git/trees/HEAD?recursive=0`,
              { headers: githubHeaders },
            ).catch(() => null);

            let hasReadme = false;
            let hasTests = false;
            let fileStructure: string[] = [];

            if (treeRes?.ok) {
              const tree = await treeRes.json();
              fileStructure = (tree.tree || []).map((item: { path: string }) => item.path);
              const files = fileStructure.map((path) => path.toLowerCase());
              hasReadme = files.some((file) => file.startsWith("readme"));
              hasTests = files.some((file) =>
                file.includes("test") || file.includes("spec") || file === "__tests__" || file === "tests"
              );
            }

            const qualityScore = computeQualityScore(repo, hasReadme, hasTests);
            const complexityScore = Math.min(Math.round(commitCount / 5), 100);
            const testingScore = hasTests ? 70 : 10;
            const securityScore = repo.fork ? 30 : 50;
            const maturityScore = Math.round(
              (qualityScore * 100 + complexityScore + testingScore) / 3,
            );

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
              last_activity_days: Math.floor(
                (Date.now() - new Date(repo.updated_at).getTime()) / 86_400_000,
              ),
              dependencies: [],
              patterns: [],
              file_structure: fileStructure,
              quality_score: qualityScore,
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

            const { error: repoAnalysisError } = await supabaseClient
              .from("repo_analysis")
              .upsert(
                {
                  repo_id: repoId,
                  quality_score: Math.round(qualityScore * 100),
                  complexity_score: complexityScore,
                  testing_score: testingScore,
                  security_score: securityScore,
                  maturity_score: maturityScore,
                },
                { onConflict: "repo_id" },
              );

            if (repoAnalysisError) {
              throw repoAnalysisError;
            }

            const repoTopics = repo.topics || [];
            const repoName = repo.name.toLowerCase();
            const repoDesc = (repo.description || "").toLowerCase();

            for (const rule of SKILL_RULES) {
              let matchedWeight = 0;

              for (const signal of rule.signals) {
                const inLang = signal.match.some((match) =>
                  Object.keys(languagePercents).some((language) =>
                    language.toLowerCase().includes(match.toLowerCase())
                  )
                );
                const inName = signal.match.some((match) => repoName.includes(match.toLowerCase()));
                const inTopics = signal.match.some((match) =>
                  repoTopics.some((topic) => topic.toLowerCase().includes(match.toLowerCase()))
                );
                const inDesc = signal.match.some((match) => repoDesc.includes(match.toLowerCase()));

                if (inLang || inName || inTopics || inDesc) {
                  matchedWeight += signal.weight;
                }
              }

              if (matchedWeight > 0) {
                const score = Math.min(matchedWeight, 1) * 0.7;
                if (!skillScores[rule.skill]) {
                  skillScores[rule.skill] = { scores: [], repos: [] };
                }
                skillScores[rule.skill].scores.push(score);
                skillScores[rule.skill].repos.push({ repoId, score });
              }
            }
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

        const detectedSkillIds = new Set<string>();

        for (const [skillName, data] of Object.entries(skillScores)) {
          const skill = allSkills?.find((entry: { id: string; name: string }) => entry.name === skillName);
          if (!skill) continue;

          detectedSkillIds.add(skill.id);

          const sorted = [...data.scores].sort((a, b) => b - a);
          const topScores = sorted.slice(0, 3);
          const confidence = Math.round(
            (topScores.reduce((sum, score) => sum + score, 0) / topScores.length) * 100,
          );

          const { data: userSkill, error: userSkillError } = await supabaseClient
            .from("user_skills")
            .upsert(
              {
                user_id: user.id,
                skill_id: skill.id,
                confidence,
              },
              { onConflict: "user_id,skill_id" },
            )
            .select("id")
            .single();

          if (userSkillError || !userSkill) {
            throw userSkillError || new Error("Failed to save user skill");
          }

          await supabaseClient.from("skill_evidence").delete().eq("user_skill_id", userSkill.id);

          const evidenceRows = data.repos.map(({ repoId, score }) => ({
            user_skill_id: userSkill.id,
            repo_id: repoId,
            file_path: "repository-signal",
            code_snippet: "",
            line_numbers: [],
            score,
            flags: [],
          }));

          if (evidenceRows.length > 0) {
            const { error: evidenceError } = await supabaseClient
              .from("skill_evidence")
              .insert(evidenceRows);

            if (evidenceError) {
              throw evidenceError;
            }
          }
        }

        if (!hadRepoFailures) {
          const { data: existingUserSkills, error: existingUserSkillsError } = await supabaseClient
            .from("user_skills")
            .select("id, skill_id")
            .eq("user_id", user.id);

          if (existingUserSkillsError) {
            throw existingUserSkillsError;
          }

          const staleUserSkillIds = (existingUserSkills || [])
            .filter((entry: { id: string; skill_id: string }) => !detectedSkillIds.has(entry.skill_id))
            .map((entry: { id: string }) => entry.id);

          if (staleUserSkillIds.length > 0) {
            const { error: staleSkillsError } = await supabaseClient
              .from("user_skills")
              .delete()
              .in("id", staleUserSkillIds);

            if (staleSkillsError) {
              throw staleSkillsError;
            }
          }
        }

        const staleRepoIds = (existingRepos || [])
          .filter((repo: { id: string; github_id: string }) => !currentGithubRepoIds.has(repo.github_id))
          .map((repo: { id: string }) => repo.id);

        if (staleRepoIds.length > 0) {
          const { error: staleReposError } = await supabaseClient
            .from("repositories")
            .delete()
            .in("id", staleRepoIds);

          if (staleReposError) {
            throw staleReposError;
          }
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
        await writeEvent({
          progress: 100,
          stage: message,
          done: true,
          error: message,
        });
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
