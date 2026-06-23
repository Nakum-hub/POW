// ---------------------------------------------------------------------------
// Pure logic for the SkillOS repository analyzer.
//
// Everything in this file is a pure function over plain data: no `Deno.*`
// calls, no `npm:` imports, no network or database access. That's
// deliberate -- it's what makes this file importable from both the Deno
// edge function (index.ts) and from Vitest (analyzer-core.test.ts) without
// either side needing to fake the other's runtime.
//
// index.ts owns all I/O (GitHub fetches, Supabase reads/writes, SSE
// streaming) and orchestrates by calling the functions below. If you change
// a scoring formula or detection rule, change it here -- index.ts should
// never duplicate this logic.
// ---------------------------------------------------------------------------

export interface ContentRule {
  pattern: RegExp;
  skill: string;
  category: string;
}

// Maps real import / usage patterns to skills in the seeded `skills` table.
export const CONTENT_RULES: ContentRule[] = [
  { pattern: /from\s+['"]react['"]|require\(\s*['"]react['"]\s*\)/, skill: "React", category: "framework" },
  { pattern: /from\s+['"]react-native['"]/, skill: "Mobile Development", category: "concept" },
  { pattern: /from\s+['"]vue['"]|createApp\(/, skill: "Vue", category: "framework" },
  { pattern: /from\s+['"]@angular\/core['"]/, skill: "Angular", category: "framework" },
  { pattern: /from\s+['"]express['"]|require\(\s*['"]express['"]\s*\)/, skill: "Express", category: "framework" },
  { pattern: /from\s+fastapi\s+import|import\s+fastapi/, skill: "FastAPI", category: "framework" },
  { pattern: /from\s+flask\s+import|import\s+flask/, skill: "Flask", category: "framework" },
  { pattern: /^\s*import\s+django|from\s+django[.\s]/m, skill: "Django", category: "framework" },
  { pattern: /import\s+org\.springframework/, skill: "Spring", category: "framework" },
  { pattern: /from\s+['"](graphql|@apollo\/client|@apollo\/server)['"]/, skill: "GraphQL", category: "framework" },
  { pattern: /from\s+['"](pg|postgres|@supabase\/supabase-js)['"]|import\s+psycopg2/, skill: "PostgreSQL", category: "database" },
  { pattern: /from\s+['"](mongoose|mongodb)['"]|import\s+pymongo/, skill: "MongoDB", category: "database" },
  { pattern: /from\s+['"](redis|ioredis)['"]|import\s+redis/, skill: "Redis", category: "database" },
  { pattern: /from\s+['"](mysql2?|mariadb)['"]|import\s+pymysql/, skill: "MySQL", category: "database" },
  { pattern: /from\s+['"](@elastic\/elasticsearch|elasticsearch)['"]/, skill: "Elasticsearch", category: "database" },
  { pattern: /from\s+['"](vitest|jest|@testing-library\/[\w-]+|mocha|chai)['"]|import\s+pytest|require\(\s*['"](jest|mocha|chai)['"]\s*\)/, skill: "Testing", category: "practice" },
  { pattern: /from\s+['"](redux|@reduxjs\/toolkit|zustand|mobx|recoil|jotai)['"]|createStore\(/, skill: "State Management", category: "concept" },
  { pattern: /from\s+['"](jsonwebtoken|passport|bcrypt(js)?|next-auth)['"]|import\s+(jwt|passlib|bcrypt)/, skill: "Authentication Systems", category: "concept" },
  { pattern: /import\s+(tensorflow|torch|sklearn|keras|numpy|pandas)|from\s+['"]@tensorflow\/tfjs['"]/, skill: "Machine Learning", category: "concept" },
  { pattern: /from\s+['"](d3|recharts|chart\.js|plotly\.js|@nivo\/[\w-]+)['"]/, skill: "Data Visualization", category: "concept" },
  { pattern: /from\s+['"](aws-sdk|@aws-sdk\/[\w-]+)['"]|import\s+boto3/, skill: "AWS", category: "devops" },
  { pattern: /from\s+['"]@google-cloud\/[\w-]+['"]/, skill: "GCP", category: "devops" },
  { pattern: /from\s+['"]@azure\/[\w-]+['"]/, skill: "Azure", category: "devops" },
  { pattern: /gin-gonic\/gin|fiber\.New\(/, skill: "Go", category: "language" },
];

interface ConceptRuleAny {
  concept: string;
  when: string[]; // any one of these present triggers the concept (OR)
}

interface ConceptRuleAllGroups {
  concept: string;
  whenAllGroups: string[][]; // at least one skill from EVERY group must be present (AND of ORs)
}

type ConceptRule = ConceptRuleAny | ConceptRuleAllGroups;

// Concept skills are inferred from the concrete skills detected in a repo.
//
// "Full-Stack Development" deliberately uses whenAllGroups, not `when`: a
// repo with only React and zero backend code is a frontend repo, not a
// full-stack one. Requiring at least one skill from BOTH the backend and
// frontend groups is what actually justifies the label -- this is exactly
// the "evidence over keyword padding" promise the product makes elsewhere.
export const CONCEPT_INFERENCE: ConceptRule[] = [
  { concept: "Backend Development", when: ["Express", "FastAPI", "Flask", "Django", "Spring"] },
  { concept: "Frontend Development", when: ["React", "Vue", "Angular"] },
  {
    concept: "Full-Stack Development",
    whenAllGroups: [
      ["Express", "FastAPI", "Flask", "Django", "Spring"],
      ["React", "Vue", "Angular"],
    ],
  },
  { concept: "REST API Design", when: ["Express", "FastAPI", "Flask", "Django", "Spring"] },
  { concept: "Database Design", when: ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch"] },
  { concept: "System Design", when: ["Redis", "Docker", "Kubernetes"] },
];

// File extension -> language skill (real signal from the repo file tree).
export const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  rb: "Ruby",
  php: "PHP",
  cpp: "C++", cc: "C++", cxx: "C++", hpp: "C++",
};

// Languages-API name -> language skill.
export const LANGUAGE_NAME_SKILL: Record<string, string> = {
  TypeScript: "TypeScript", JavaScript: "JavaScript", Python: "Python", Go: "Go",
  Rust: "Rust", Java: "Java", Ruby: "Ruby", PHP: "PHP", "C++": "C++",
};

export const SKILL_CATEGORY: Record<string, string> = {
  TypeScript: "language", JavaScript: "language", Python: "language", Go: "language",
  Rust: "language", Java: "language", Ruby: "language", PHP: "language", "C++": "language",
};

// Files worth opening for content analysis, by extension.
export const PRIORITY_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "py", "go", "rs", "java", "rb", "php",
]);

// Patterns that indicate hardcoded secrets (lowers the security score).
export const SECRET_PATTERNS: RegExp[] = [
  /(?:password|passwd)\s*[:=]\s*['"][^'"]{6,}['"]/i,
  /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"]{12,}['"]/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/,
];
export const ENV_USAGE = /process\.env\.|import\.meta\.env\.|Deno\.env\.get|os\.environ|System\.getenv/;

export const SNIPPET_MAX = 300;

export function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

export function snippetAround(content: string, index: number): { snippet: string; lines: number[] } {
  const before = content.slice(0, index);
  const startLine = before.split("\n").length; // 1-based line of the match
  const lines = content.split("\n");
  const from = Math.max(0, startLine - 1);
  const to = Math.min(lines.length, startLine + 2);
  const snippet = lines.slice(from, to).join("\n").slice(0, SNIPPET_MAX);
  const lineNumbers: number[] = [];
  for (let i = from + 1; i <= to; i += 1) lineNumbers.push(i);
  return { snippet, lines: lineNumbers };
}

export interface ContentDetection {
  skill: string;
  category: string;
  snippet: string;
  lines: number[];
}

// Runs CONTENT_RULES against one file's raw text. Returns one detection per
// matching rule (a file can demonstrate multiple skills at once, e.g. a
// React component that also imports a state-management library).
export function detectContentSkills(content: string): ContentDetection[] {
  const detections: ContentDetection[] = [];
  for (const rule of CONTENT_RULES) {
    const match = rule.pattern.exec(content);
    if (match && match.index !== undefined) {
      const { snippet, lines } = snippetAround(content, match.index);
      detections.push({ skill: rule.skill, category: rule.category, snippet, lines });
    }
  }
  return detections;
}

// Whether this single file's content trips any hardcoded-secret pattern.
// Mirrors the original inline loop: presence is boolean per file, the
// caller is responsible for counting across files in a repo.
export function fileHasSecretPattern(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

export function fileUsesEnvVars(content: string): boolean {
  return ENV_USAGE.test(content);
}

// Language skills from extensions (file tree) + the GitHub Languages API.
export function detectLanguageSkills(
  fileStructure: string[],
  languagePercents: Record<string, number>,
): Set<string> {
  const languages = new Set<string>();
  for (const path of fileStructure) {
    const lang = EXTENSION_LANGUAGE[extensionOf(path)];
    if (lang) languages.add(lang);
  }
  for (const langName of Object.keys(languagePercents)) {
    const skill = LANGUAGE_NAME_SKILL[langName];
    if (skill) languages.add(skill);
  }
  return languages;
}

export interface TreeSignals {
  hasReadme: boolean;
  hasLinter: boolean;
  hasCI: boolean;
  hasTypes: boolean;
  hasSecurityMd: boolean;
  hasDockerfile: boolean;
  hasTerraform: boolean;
  hasK8s: boolean;
  testFileCount: number;
  totalFileCount: number;
}

// Tree-shape signals: things you can tell about a repo from its file paths
// alone, with no file content needed.
export function detectTreeSignals(fileStructure: string[]): TreeSignals {
  const lowerPaths = fileStructure.map((p) => p.toLowerCase());
  const totalFileCount = Math.max(fileStructure.length, 1);
  const testFileCount = lowerPaths.filter(
    (p) => /(^|\/)tests?\//.test(p) || /\.(test|spec)\./.test(p) || /(^|\/)__tests__\//.test(p),
  ).length;

  return {
    hasReadme: lowerPaths.some((p) => p.startsWith("readme") || p.endsWith("/readme.md")),
    hasLinter: lowerPaths.some(
      (p) =>
        /\.eslintrc/.test(p) ||
        /eslint\.config\./.test(p) ||
        /\.pylintrc/.test(p) ||
        /(^|\/)ruff\.toml/.test(p) ||
        /\.flake8/.test(p),
    ),
    hasCI: lowerPaths.some((p) => p.includes(".github/workflows/") || p === ".gitlab-ci.yml" || p === ".circleci/config.yml"),
    hasTypes: lowerPaths.some((p) => p.endsWith("tsconfig.json")) || lowerPaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx")),
    hasSecurityMd: lowerPaths.some((p) => p === "security.md" || p.endsWith("/security.md")),
    hasDockerfile: lowerPaths.some((p) => p.endsWith("dockerfile") || p.includes("docker-compose")),
    hasTerraform: lowerPaths.some((p) => p.endsWith(".tf")),
    hasK8s: lowerPaths.some((p) => p.includes("k8s/") || p.includes("kubernetes/") || p.includes("helm/") || p.endsWith("chart.yaml")),
    testFileCount,
    totalFileCount,
  };
}

// Given the skills already detected in a repo, returns which higher-level
// concept skills (e.g. "Full-Stack Development") should also be recorded.
export function inferConceptSkills(detectedSkills: Set<string>): string[] {
  const inferred: string[] = [];
  for (const rule of CONCEPT_INFERENCE) {
    if ("when" in rule) {
      if (rule.when.some((skill) => detectedSkills.has(skill))) {
        inferred.push(rule.concept);
      }
    } else if (rule.whenAllGroups.every((group) => group.some((skill) => detectedSkills.has(skill)))) {
      inferred.push(rule.concept);
    }
  }
  return inferred;
}

export function computeTestingScore(testFileCount: number, totalFileCount: number): number {
  return Math.min(100, Math.round((testFileCount / totalFileCount) * 300));
}

export function computeSecurityScore(secretsFound: number, envUsageFound: boolean, hasSecurityMd: boolean): number {
  const raw = 70 - secretsFound * 20 + (envUsageFound ? 10 : 0) + (hasSecurityMd ? 20 : 0);
  return Math.max(0, Math.min(100, raw));
}

export interface QualityScoreInputs {
  hasReadme: boolean;
  hasLinter: boolean;
  hasTypes: boolean;
  isFork: boolean;
  hasCI: boolean;
}

export function computeQualityScore(inputs: QualityScoreInputs): number {
  let score = 0;
  if (inputs.hasReadme) score += 25;
  if (inputs.hasLinter) score += 20;
  if (inputs.hasTypes) score += 15;
  if (!inputs.isFork) score += 20;
  if (inputs.hasCI) score += 20;
  return Math.min(100, score);
}

export function computeComplexityScore(fileCount: number, languageCount: number): number {
  return Math.min(100, Math.round(Math.log2(fileCount * languageCount + 1) * 12));
}

export function computeMaturityScore(
  testingScore: number,
  securityScore: number,
  qualityScore: number,
  complexityScore: number,
): number {
  return Math.round((testingScore + securityScore + qualityScore + complexityScore) / 4);
}
