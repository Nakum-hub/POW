import { createClient } from "npm:@supabase/supabase-js@2";

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

function buildFallbackExplanation(
  repo: {
    name: string;
    description?: string | null;
    language?: string | null;
    stars?: number | null;
    forks?: number | null;
    commits?: number | null;
    quality_score?: number | null;
    languages?: Record<string, number> | null;
  },
  audience: "hr" | "technical",
) {
  const topLanguages = Object.entries(repo.languages || {})
    .sort(([, left], [, right]) => Number(right) - Number(left))
    .slice(0, 3)
    .map(([language, percent]) => `${language} (${percent}%)`)
    .join(", ");

  if (audience === "hr") {
    return [
      `${repo.name} is a ${repo.language || "software"} project that highlights real delivery work rather than a portfolio placeholder.`,
      repo.description
        ? `It appears to solve ${repo.description.toLowerCase()}.`
        : "It demonstrates product ownership, execution, and maintainability across a real codebase.",
      `The repository shows sustained execution with ${repo.commits || 0} commits, ${repo.stars || 0} stars, ${repo.forks || 0} forks, and a ${Math.round(Number(repo.quality_score || 0) * 100)}% quality score.`,
      "That combination suggests the developer can ship, maintain, and communicate work that other teams can rely on.",
    ].join("\n\n");
  }

  return [
    `Repository: ${repo.name}`,
    `Primary stack: ${repo.language || "Unknown"}${topLanguages ? ` with supporting languages ${topLanguages}.` : "."}`,
    repo.description ? `Focus area: ${repo.description}` : "Focus area: application or service implementation.",
    `Signals: ${repo.commits || 0} commits, ${repo.stars || 0} stars, ${repo.forks || 0} forks, and ${Math.round(Number(repo.quality_score || 0) * 100)}% quality.`,
    "This points to active maintenance, non-trivial ownership, and enough delivery history to discuss architecture, tradeoffs, and engineering discipline in an interview.",
  ].join("\n\n");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { repo_id, audience } = await req.json();

    const { data: repo, error: repoError } = await supabase
      .from("repositories")
      .select("*")
      .eq("id", repo_id)
      .eq("user_id", user.id)
      .single();

    if (repoError || !repo) {
      return new Response(JSON.stringify({ error: "Repo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const languages = (repo.languages || {}) as Record<string, number>;
    const topLanguages = Object.entries(languages)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 3)
      .map(([lang, pct]) => `${lang} (${pct}%)`)
      .join(", ");

    const prompt = audience === "hr"
      ? `You are explaining a software project to a non-technical HR recruiter or hiring manager. Be clear, use no jargon, focus on business value, problem solving, and what this project reveals about the developer's work ethic and capability. Keep it under 120 words.

Project: ${repo.name}
Description: ${repo.description || "No description"}
Primary language: ${repo.language}
Languages used: ${topLanguages || "Not available"}
Stars: ${repo.stars}, Forks: ${repo.forks}
Commits: ${repo.commits}

Write a 2-3 paragraph plain-English explanation of what this project is, what problem it solves, and what it shows about the developer.`
      : `You are explaining a software project to a senior software engineer or technical lead who will evaluate this project for hiring decisions. Be precise, technical, and direct. Focus on architecture, technologies, design decisions, complexity, and code quality indicators. Keep it under 180 words.

Project: ${repo.name}
Description: ${repo.description || "No description"}
Primary language: ${repo.language}
Languages breakdown: ${topLanguages || "Not available"}
Stars: ${repo.stars}, Forks: ${repo.forks}
Commits: ${repo.commits}
Quality score: ${Math.round(Number(repo.quality_score || 0) * 100)}%

Write a concise technical assessment covering: what the project does, technology stack, architectural approach, complexity level, and what this demonstrates about the developer's technical skills.`;

    const fallbackExplanation = buildFallbackExplanation(repo, audience);
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const anthropicModel = Deno.env.get("ANTHROPIC_MODEL");

    if (!anthropicApiKey || !anthropicModel) {
      return new Response(JSON.stringify({ explanation: fallbackExplanation, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let explanation = fallbackExplanation;

    try {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (anthropicRes.ok) {
        const aiData = await anthropicRes.json();
        explanation = aiData.content?.[0]?.text || fallbackExplanation;
      }
    } catch {
      explanation = fallbackExplanation;
    }

    return new Response(JSON.stringify({ explanation, source: explanation === fallbackExplanation ? "fallback" : "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
