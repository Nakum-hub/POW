import type {
  Profile,
  RepoAnalysis,
  Repository,
  Skill,
  SkillCategory,
  SkillEvidence,
  UserSkill,
} from '../types';

export interface DeveloperSearchResult {
  user_id: string;
  github_id: string;
  name: string;
  avatar_url: string;
  show_confidence: boolean;
  skills: Array<{ name: string; category: SkillCategory; confidence: number }>;
}

export interface PublicProfilePayload {
  profile: Profile;
  skills: UserSkill[];
  repos: Repository[];
  repoCount: number;
}

interface DemoState {
  profiles: Profile[];
  repositories: Repository[];
  userSkills: UserSkill[];
  repoAnalyses: RepoAnalysis[];
}

const DEMO_SIGNED_IN_KEY = 'skillos.demo.signed-in';
const DEMO_STATE_KEY = 'skillos.demo.state.v1';
export const DEMO_USER_ID = 'demo-user-1';

const now = new Date().toISOString();
const dayMs = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * dayMs).toISOString();

const skillsCatalog = {
  typescript: buildSkill('skill-typescript', 'TypeScript', 'language'),
  react: buildSkill('skill-react', 'React', 'framework'),
  postgresql: buildSkill('skill-postgresql', 'PostgreSQL', 'database'),
  docker: buildSkill('skill-docker', 'Docker', 'devops'),
  testing: buildSkill('skill-testing', 'Testing Strategy', 'practice'),
  systemDesign: buildSkill('skill-system-design', 'System Design', 'concept'),
  python: buildSkill('skill-python', 'Python', 'language'),
  go: buildSkill('skill-go', 'Go', 'language'),
  cicd: buildSkill('skill-cicd', 'CI/CD', 'devops'),
  nextjs: buildSkill('skill-nextjs', 'Next.js', 'framework'),
  aws: buildSkill('skill-aws', 'AWS', 'devops'),
  graphql: buildSkill('skill-graphql', 'GraphQL', 'concept'),
  nodejs: buildSkill('skill-nodejs', 'Node.js', 'framework'),
  security: buildSkill('skill-security', 'Application Security', 'practice'),
  redis: buildSkill('skill-redis', 'Redis', 'database'),
};

const baseProfiles: Profile[] = [
  buildProfile(DEMO_USER_ID, 'aaravrao', 'Aarav Rao'),
  buildProfile('demo-user-2', 'mayachen', 'Maya Chen'),
  buildProfile('demo-user-3', 'luisortega', 'Luis Ortega'),
  buildProfile('demo-user-4', 'nikhilmehta', 'Nikhil Mehta'),
];

const baseRepositories: Repository[] = [
  buildRepository({
    id: 'repo-signalboard',
    userId: DEMO_USER_ID,
    githubId: 101,
    name: 'signalboard',
    fullName: 'aaravrao/signalboard',
    description: 'A multi-tenant product analytics dashboard with event ingestion and role-based access.',
    language: 'TypeScript',
    languages: { TypeScript: 64, SQL: 18, CSS: 10, Shell: 8 },
    stars: 142,
    forks: 21,
    commits: 468,
    lastActivityDays: 4,
    dependencies: ['react', 'vite', 'supabase', 'tailwindcss'],
    patterns: ['spa', 'event-driven', 'multi-tenant'],
    fileStructure: ['src', 'supabase', 'docs'],
    qualityScore: 0.91,
  }),
  buildRepository({
    id: 'repo-orchid-api',
    userId: DEMO_USER_ID,
    githubId: 102,
    name: 'orchid-api',
    fullName: 'aaravrao/orchid-api',
    description: 'A Go API for workflow orchestration, queue processing, and resilient background jobs.',
    language: 'Go',
    languages: { Go: 82, SQL: 12, Shell: 6 },
    stars: 88,
    forks: 17,
    commits: 312,
    lastActivityDays: 9,
    dependencies: ['postgres', 'redis', 'docker'],
    patterns: ['api', 'worker', 'queue'],
    fileStructure: ['cmd', 'internal', 'migrations'],
    qualityScore: 0.87,
  }),
  buildRepository({
    id: 'repo-atlas-worker',
    userId: DEMO_USER_ID,
    githubId: 103,
    name: 'atlas-worker',
    fullName: 'aaravrao/atlas-worker',
    description: 'Python automation service for document ingestion, OCR, and scoring pipelines.',
    language: 'Python',
    languages: { Python: 79, Dockerfile: 9, Shell: 12 },
    stars: 61,
    forks: 12,
    commits: 229,
    lastActivityDays: 16,
    dependencies: ['fastapi', 'pydantic', 'redis'],
    patterns: ['worker', 'automation', 'api'],
    fileStructure: ['app', 'jobs', 'tests'],
    qualityScore: 0.83,
  }),
  buildRepository({
    id: 'repo-vector-queue',
    userId: DEMO_USER_ID,
    githubId: 104,
    name: 'vector-queue',
    fullName: 'aaravrao/vector-queue',
    description: 'A durable queue abstraction for high-throughput event processing and observability.',
    language: 'TypeScript',
    languages: { TypeScript: 71, YAML: 13, Shell: 16 },
    stars: 74,
    forks: 10,
    commits: 187,
    lastActivityDays: 27,
    dependencies: ['node', 'redis', 'prometheus'],
    patterns: ['queue', 'observability', 'distributed systems'],
    fileStructure: ['packages', 'infra', 'scripts'],
    qualityScore: 0.79,
  }),
  buildRepository({
    id: 'repo-lighthouse',
    userId: 'demo-user-2',
    githubId: 201,
    name: 'lighthouse',
    fullName: 'mayachen/lighthouse',
    description: 'Next.js growth platform for product teams with experiment reporting and alerts.',
    language: 'TypeScript',
    languages: { TypeScript: 69, SQL: 14, CSS: 17 },
    stars: 118,
    forks: 19,
    commits: 356,
    lastActivityDays: 7,
    dependencies: ['next', 'postgres', 'vercel'],
    patterns: ['ssr', 'analytics', 'multi-tenant'],
    fileStructure: ['app', 'packages', 'db'],
    qualityScore: 0.9,
  }),
  buildRepository({
    id: 'repo-opsdeck',
    userId: 'demo-user-2',
    githubId: 202,
    name: 'opsdeck',
    fullName: 'mayachen/opsdeck',
    description: 'Operational dashboard for incident triage with GraphQL APIs and workflow automation.',
    language: 'TypeScript',
    languages: { TypeScript: 77, GraphQL: 9, Shell: 14 },
    stars: 76,
    forks: 11,
    commits: 241,
    lastActivityDays: 13,
    dependencies: ['graphql', 'node', 'docker'],
    patterns: ['dashboard', 'api', 'automation'],
    fileStructure: ['src', 'graphql', 'scripts'],
    qualityScore: 0.86,
  }),
  buildRepository({
    id: 'repo-pipeline-kit',
    userId: 'demo-user-3',
    githubId: 301,
    name: 'pipeline-kit',
    fullName: 'luisortega/pipeline-kit',
    description: 'Deployment and CI toolkit for shipping internal services across AWS environments.',
    language: 'Go',
    languages: { Go: 68, HCL: 20, Shell: 12 },
    stars: 133,
    forks: 27,
    commits: 402,
    lastActivityDays: 5,
    dependencies: ['terraform', 'aws', 'docker'],
    patterns: ['infra', 'cli', 'devops'],
    fileStructure: ['cmd', 'infra', 'docs'],
    qualityScore: 0.88,
  }),
  buildRepository({
    id: 'repo-authshield',
    userId: 'demo-user-3',
    githubId: 302,
    name: 'authshield',
    fullName: 'luisortega/authshield',
    description: 'Authentication gateway focused on RBAC, token hardening, and auditability.',
    language: 'Python',
    languages: { Python: 74, YAML: 12, Shell: 14 },
    stars: 96,
    forks: 15,
    commits: 279,
    lastActivityDays: 18,
    dependencies: ['python', 'redis', 'postgres'],
    patterns: ['security', 'gateway', 'service'],
    fileStructure: ['src', 'tests', 'infra'],
    qualityScore: 0.85,
  }),
  buildRepository({
    id: 'repo-dataweave',
    userId: 'demo-user-4',
    githubId: 401,
    name: 'dataweave',
    fullName: 'nikhilmehta/dataweave',
    description: 'Data platform for warehouse syncs, validation, and contract-based schema checks.',
    language: 'Python',
    languages: { Python: 81, SQL: 11, Shell: 8 },
    stars: 109,
    forks: 20,
    commits: 331,
    lastActivityDays: 11,
    dependencies: ['python', 'postgres', 'airflow'],
    patterns: ['etl', 'validation', 'data platform'],
    fileStructure: ['pipelines', 'checks', 'docs'],
    qualityScore: 0.89,
  }),
  buildRepository({
    id: 'repo-graphmesh',
    userId: 'demo-user-4',
    githubId: 402,
    name: 'graphmesh',
    fullName: 'nikhilmehta/graphmesh',
    description: 'GraphQL federation service with caching, persistence, and incremental delivery.',
    language: 'TypeScript',
    languages: { TypeScript: 72, GraphQL: 15, Shell: 13 },
    stars: 82,
    forks: 14,
    commits: 218,
    lastActivityDays: 24,
    dependencies: ['graphql', 'node', 'redis'],
    patterns: ['api gateway', 'graphql', 'caching'],
    fileStructure: ['packages', 'schema', 'tests'],
    qualityScore: 0.84,
  }),
];

const baseUserSkills: UserSkill[] = [
  buildUserSkill('user-skill-ts', DEMO_USER_ID, skillsCatalog.typescript, 92, [
    { repo_id: 'repo-signalboard', score: 0.96 },
    { repo_id: 'repo-vector-queue', score: 0.88 },
  ]),
  buildUserSkill('user-skill-react', DEMO_USER_ID, skillsCatalog.react, 89, [
    { repo_id: 'repo-signalboard', score: 0.94 },
  ]),
  buildUserSkill('user-skill-postgres', DEMO_USER_ID, skillsCatalog.postgresql, 81, [
    { repo_id: 'repo-signalboard', score: 0.79 },
    { repo_id: 'repo-orchid-api', score: 0.84 },
  ]),
  buildUserSkill('user-skill-docker', DEMO_USER_ID, skillsCatalog.docker, 84, [
    { repo_id: 'repo-orchid-api', score: 0.87 },
    { repo_id: 'repo-atlas-worker', score: 0.8 },
  ]),
  buildUserSkill('user-skill-testing', DEMO_USER_ID, skillsCatalog.testing, 76, [
    { repo_id: 'repo-signalboard', score: 0.74 },
    { repo_id: 'repo-atlas-worker', score: 0.78 },
  ]),
  buildUserSkill('user-skill-system-design', DEMO_USER_ID, skillsCatalog.systemDesign, 73, [
    { repo_id: 'repo-orchid-api', score: 0.72 },
    { repo_id: 'repo-vector-queue', score: 0.75 },
  ]),
  buildUserSkill('user-skill-python', DEMO_USER_ID, skillsCatalog.python, 68, [
    { repo_id: 'repo-atlas-worker', score: 0.86 },
  ]),
  buildUserSkill('user-skill-go', DEMO_USER_ID, skillsCatalog.go, 64, [
    { repo_id: 'repo-orchid-api', score: 0.83 },
  ]),
  buildUserSkill('user-skill-cicd', DEMO_USER_ID, skillsCatalog.cicd, 79, [
    { repo_id: 'repo-orchid-api', score: 0.76 },
    { repo_id: 'repo-vector-queue', score: 0.81 },
  ]),
  buildUserSkill('user-skill-maya-next', 'demo-user-2', skillsCatalog.nextjs, 91),
  buildUserSkill('user-skill-maya-ts', 'demo-user-2', skillsCatalog.typescript, 88),
  buildUserSkill('user-skill-maya-postgres', 'demo-user-2', skillsCatalog.postgresql, 77),
  buildUserSkill('user-skill-maya-graphql', 'demo-user-2', skillsCatalog.graphql, 73),
  buildUserSkill('user-skill-luis-go', 'demo-user-3', skillsCatalog.go, 90),
  buildUserSkill('user-skill-luis-aws', 'demo-user-3', skillsCatalog.aws, 86),
  buildUserSkill('user-skill-luis-security', 'demo-user-3', skillsCatalog.security, 79),
  buildUserSkill('user-skill-luis-docker', 'demo-user-3', skillsCatalog.docker, 82),
  buildUserSkill('user-skill-nikhil-python', 'demo-user-4', skillsCatalog.python, 89),
  buildUserSkill('user-skill-nikhil-graphql', 'demo-user-4', skillsCatalog.graphql, 84),
  buildUserSkill('user-skill-nikhil-redis', 'demo-user-4', skillsCatalog.redis, 76),
  buildUserSkill('user-skill-nikhil-system', 'demo-user-4', skillsCatalog.systemDesign, 71),
];

const baseRepoAnalyses: RepoAnalysis[] = [
  buildRepoAnalysis('analysis-signalboard', 'repo-signalboard', 82, 91, 78, 74, 88),
  buildRepoAnalysis('analysis-orchid', 'repo-orchid-api', 79, 87, 81, 68, 84),
  buildRepoAnalysis('analysis-atlas', 'repo-atlas-worker', 74, 83, 73, 71, 79),
  buildRepoAnalysis('analysis-vector', 'repo-vector-queue', 77, 79, 69, 65, 76),
  buildRepoAnalysis('analysis-lighthouse', 'repo-lighthouse', 81, 90, 76, 72, 86),
  buildRepoAnalysis('analysis-opsdeck', 'repo-opsdeck', 75, 86, 72, 69, 80),
  buildRepoAnalysis('analysis-pipeline', 'repo-pipeline-kit', 78, 88, 82, 67, 85),
  buildRepoAnalysis('analysis-authshield', 'repo-authshield', 76, 85, 88, 64, 82),
  buildRepoAnalysis('analysis-dataweave', 'repo-dataweave', 79, 89, 74, 70, 86),
  buildRepoAnalysis('analysis-graphmesh', 'repo-graphmesh', 77, 84, 75, 66, 81),
];

const baseSkillEvidence: Record<string, SkillEvidence[]> = {
  'user-skill-ts': [
    buildSkillEvidence('evidence-ts-1', 'user-skill-ts', 'repo-signalboard', 'src/routes/events.tsx', 0.96, [
      'Typed event contracts for ingestion and filtering.',
      'Reusable hooks with strict inferred return types.',
    ]),
    buildSkillEvidence('evidence-ts-2', 'user-skill-ts', 'repo-vector-queue', 'packages/core/queue.ts', 0.88, [
      'Generic queue interfaces with typed retry policies.',
      'Compile-time guarantees around payload serialization.',
    ]),
  ],
  'user-skill-react': [
    buildSkillEvidence('evidence-react-1', 'user-skill-react', 'repo-signalboard', 'src/pages/Dashboard.tsx', 0.94, [
      'Composed dashboard widgets with client-side routing and derived UI state.',
      'Accessible loading and empty-state patterns.',
    ]),
  ],
  'user-skill-postgres': [
    buildSkillEvidence('evidence-postgres-1', 'user-skill-postgres', 'repo-signalboard', 'supabase/migrations/001_init.sql', 0.79, [
      'Normalized tenant-aware analytics schema.',
      'Index strategy for event lookups and reporting.',
    ]),
    buildSkillEvidence('evidence-postgres-2', 'user-skill-postgres', 'repo-orchid-api', 'internal/store/workflows.sql', 0.84, [
      'Transactional writes for workflow steps and retries.',
      'Careful use of row locking to avoid duplicate execution.',
    ]),
  ],
  'user-skill-docker': [
    buildSkillEvidence('evidence-docker-1', 'user-skill-docker', 'repo-orchid-api', 'Dockerfile', 0.87, [
      'Multi-stage build for small production images.',
      'Separate build and runtime concerns.',
    ]),
    buildSkillEvidence('evidence-docker-2', 'user-skill-docker', 'repo-atlas-worker', 'docker-compose.yml', 0.8, [
      'Local worker stack with Redis and health checks.',
      'Consistent environment-based service configuration.',
    ]),
  ],
  'user-skill-testing': [
    buildSkillEvidence('evidence-testing-1', 'user-skill-testing', 'repo-signalboard', 'src/__tests__/dashboard.test.tsx', 0.74, [
      'Scenario coverage for dashboard filters and loading states.',
      'Assertions on accessible text and route transitions.',
    ]),
    buildSkillEvidence('evidence-testing-2', 'user-skill-testing', 'repo-atlas-worker', 'tests/test_jobs.py', 0.78, [
      'Pipeline tests for retry logic and failure isolation.',
      'Mocks around external OCR providers.',
    ]),
  ],
  'user-skill-system-design': [
    buildSkillEvidence('evidence-system-1', 'user-skill-system-design', 'repo-orchid-api', 'docs/architecture.md', 0.72, [
      'Separates ingestion, orchestration, and worker execution responsibilities.',
      'Documents failure modes and retry behavior.',
    ]),
    buildSkillEvidence('evidence-system-2', 'user-skill-system-design', 'repo-vector-queue', 'README.md', 0.75, [
      'Explains queue durability, visibility timeouts, and observability.',
      'Describes tradeoffs between throughput and delivery guarantees.',
    ]),
  ],
  'user-skill-python': [
    buildSkillEvidence('evidence-python-1', 'user-skill-python', 'repo-atlas-worker', 'app/jobs/score_pipeline.py', 0.86, [
      'Typed orchestration for OCR scoring pipelines.',
      'Structured error handling around third-party services.',
    ]),
  ],
  'user-skill-go': [
    buildSkillEvidence('evidence-go-1', 'user-skill-go', 'repo-orchid-api', 'internal/workflows/runner.go', 0.83, [
      'Concurrent workflow scheduling with bounded worker pools.',
      'Separation between transport and business logic.',
    ]),
  ],
  'user-skill-cicd': [
    buildSkillEvidence('evidence-cicd-1', 'user-skill-cicd', 'repo-orchid-api', '.github/workflows/release.yml', 0.76, [
      'Checks formatting, tests, security scans, and release packaging.',
      'Gates deployments behind branch and environment policies.',
    ]),
    buildSkillEvidence('evidence-cicd-2', 'user-skill-cicd', 'repo-vector-queue', '.github/workflows/ci.yml', 0.81, [
      'Matrix builds across Node versions.',
      'Publishes package artifacts only after test and lint success.',
    ]),
  ],
};

const baseState: DemoState = {
  profiles: baseProfiles,
  repositories: baseRepositories,
  userSkills: baseUserSkills,
  repoAnalyses: baseRepoAnalyses,
};

function buildSkill(id: string, name: string, category: SkillCategory): Skill {
  return { id, name, category, created_at: now };
}

function buildProfile(id: string, githubId: string, name: string): Profile {
  return {
    id,
    github_id: githubId,
    name,
    avatar_url: '',
    is_public: true,
    show_confidence: true,
    last_analyzed_at: daysAgo(2),
    created_at: daysAgo(120),
    updated_at: daysAgo(2),
  };
}

function buildRepository(input: {
  id: string;
  userId: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  commits: number;
  lastActivityDays: number;
  dependencies: string[];
  patterns: string[];
  fileStructure: string[];
  qualityScore: number;
}): Repository {
  return {
    id: input.id,
    user_id: input.userId,
    github_id: String(input.githubId),
    name: input.name,
    full_name: input.fullName,
    description: input.description,
    language: input.language,
    languages: input.languages,
    stars: input.stars,
    forks: input.forks,
    is_fork: false,
    commits: input.commits,
    last_activity_days: input.lastActivityDays,
    dependencies: input.dependencies,
    patterns: input.patterns,
    file_structure: input.fileStructure,
    quality_score: input.qualityScore,
    created_at: daysAgo(input.lastActivityDays + 160),
    updated_at: daysAgo(input.lastActivityDays),
  };
}

function buildUserSkill(
  id: string,
  userId: string,
  skill: Skill,
  confidence: number,
  evidence: Array<{ repo_id: string; score: number }> = []
): UserSkill {
  return {
    id,
    user_id: userId,
    skill_id: skill.id,
    confidence,
    created_at: daysAgo(90),
    updated_at: daysAgo(3),
    skill,
    evidence,
  };
}

function buildRepoAnalysis(
  id: string,
  repoId: string,
  complexity: number,
  quality: number,
  security: number,
  testing: number,
  maturity: number
): RepoAnalysis {
  return {
    id,
    repo_id: repoId,
    complexity_score: complexity,
    quality_score: quality,
    security_score: security,
    testing_score: testing,
    maturity_score: maturity,
    created_at: daysAgo(2),
  };
}

function buildSkillEvidence(
  id: string,
  userSkillId: string,
  repoId: string,
  filePath: string,
  score: number,
  lines: string[]
): SkillEvidence {
  return {
    id,
    user_skill_id: userSkillId,
    repo_id: repoId,
    file_path: filePath,
    code_snippet: lines.join('\n'),
    line_numbers: lines.map((_, index) => index + 1),
    score,
    flags: [],
    created_at: daysAgo(2),
  };
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readState(): DemoState {
  if (typeof window === 'undefined') {
    return cloneState(baseState);
  }

  const raw = window.localStorage.getItem(DEMO_STATE_KEY);
  if (!raw) {
    return cloneState(baseState);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : cloneState(baseState.profiles),
      repositories: Array.isArray(parsed.repositories) ? parsed.repositories : cloneState(baseState.repositories),
      userSkills: Array.isArray(parsed.userSkills) ? parsed.userSkills : cloneState(baseState.userSkills),
      repoAnalyses: Array.isArray(parsed.repoAnalyses) ? parsed.repoAnalyses : cloneState(baseState.repoAnalyses),
    };
  } catch {
    return cloneState(baseState);
  }
}

function writeState(state: DemoState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
}

function ensureDemoUserInState(state: DemoState): DemoState {
  if (state.profiles.some((profile) => profile.id === DEMO_USER_ID)) {
    return state;
  }

  return {
    profiles: [...state.profiles, ...cloneState(baseState.profiles.filter((profile) => profile.id === DEMO_USER_ID))],
    repositories: [
      ...state.repositories,
      ...cloneState(baseState.repositories.filter((repo) => repo.user_id === DEMO_USER_ID)),
    ],
    userSkills: [
      ...state.userSkills,
      ...cloneState(baseState.userSkills.filter((skill) => skill.user_id === DEMO_USER_ID)),
    ],
    repoAnalyses: [
      ...state.repoAnalyses,
      ...cloneState(
        baseState.repoAnalyses.filter((analysis) =>
          baseState.repositories.some((repo) => repo.user_id === DEMO_USER_ID && repo.id === analysis.repo_id)
        )
      ),
    ],
  };
}

function withRepoObjects(skills: UserSkill[], repositories: Repository[]) {
  return skills.map((skill) => ({
    ...skill,
    evidence: (skill.evidence || []).map((item) => ({
      ...item,
      repo: repositories.find((repo) => repo.id === item.repo_id),
    })),
  }));
}

export function isDemoSignedIn() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEMO_SIGNED_IN_KEY) === 'true';
}

export function setDemoSignedIn(signedIn: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DEMO_SIGNED_IN_KEY, signedIn ? 'true' : 'false');
}

export function getDemoProfile(userId: string) {
  const state = ensureDemoUserInState(readState());
  return state.profiles.find((profile) => profile.id === userId) ?? null;
}

export function getDemoCurrentProfile() {
  return getDemoProfile(DEMO_USER_ID);
}

export async function fetchDemoUserRepositories(userId: string) {
  const state = ensureDemoUserInState(readState());
  return state.repositories
    .filter((repo) => repo.user_id === userId)
    .sort((left, right) => right.stars - left.stars);
}

export async function fetchDemoUserSkills(userId: string) {
  const state = ensureDemoUserInState(readState());
  const repositories = state.repositories.filter((repo) => repo.user_id === userId);
  return withRepoObjects(
    state.userSkills
      .filter((skill) => skill.user_id === userId)
      .sort((left, right) => right.confidence - left.confidence),
    repositories
  );
}

export async function fetchDemoSkillEvidence(userSkillId: string) {
  const state = ensureDemoUserInState(readState());
  return (baseSkillEvidence[userSkillId] || []).map((item) => ({
    ...item,
    repo: state.repositories.find((repo) => repo.id === item.repo_id),
  }));
}

export async function fetchDemoRepoAnalysis(repoId: string) {
  const state = ensureDemoUserInState(readState());
  return state.repoAnalyses.find((analysis) => analysis.repo_id === repoId) ?? null;
}

export async function updateDemoProfileVisibility(
  userId: string,
  updates: Pick<Profile, 'is_public' | 'show_confidence'>
) {
  let state = ensureDemoUserInState(readState());
  state = {
    ...state,
    profiles: state.profiles.map((profile) =>
      profile.id === userId
        ? {
            ...profile,
            ...updates,
            updated_at: new Date().toISOString(),
          }
        : profile
    ),
  };

  writeState(state);
  return state.profiles.find((profile) => profile.id === userId) ?? null;
}

export async function deleteDemoAnalysis(userId: string) {
  const currentState = ensureDemoUserInState(readState());
  const remainingRepos = currentState.repositories.filter((repo) => repo.user_id !== userId);
  const remainingRepoIds = new Set(remainingRepos.map((repo) => repo.id));

  const nextState: DemoState = {
    profiles: currentState.profiles.map((profile) =>
      profile.id === userId
        ? {
            ...profile,
            last_analyzed_at: null,
            updated_at: new Date().toISOString(),
          }
        : profile
    ),
    repositories: remainingRepos,
    userSkills: currentState.userSkills.filter((skill) => skill.user_id !== userId),
    repoAnalyses: currentState.repoAnalyses.filter((analysis) => remainingRepoIds.has(analysis.repo_id)),
  };

  writeState(nextState);
}

export async function analyzeDemoRepositories(
  userId: string,
  onProgress?: (progress: number, stage: string) => void
) {
  const steps = [
    { progress: 12, stage: 'Checking repository catalog...' },
    { progress: 34, stage: 'Evaluating code patterns...' },
    { progress: 58, stage: 'Scoring repository quality...' },
    { progress: 81, stage: 'Linking evidence to skills...' },
    { progress: 100, stage: 'Publishing refreshed profile...' },
  ];

  for (const step of steps) {
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    onProgress?.(step.progress, step.stage);
  }

  const restoredState = ensureDemoUserInState(readState());
  const userRepoIds = new Set(
    baseState.repositories.filter((repo) => repo.user_id === userId).map((repo) => repo.id)
  );

  const nextState: DemoState = {
    profiles: restoredState.profiles.map((profile) =>
      profile.id === userId
        ? {
            ...profile,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : profile
    ),
    repositories: [
      ...restoredState.repositories.filter((repo) => repo.user_id !== userId),
      ...cloneState(baseState.repositories.filter((repo) => repo.user_id === userId)),
    ],
    userSkills: [
      ...restoredState.userSkills.filter((skill) => skill.user_id !== userId),
      ...cloneState(baseState.userSkills.filter((skill) => skill.user_id === userId)),
    ],
    repoAnalyses: [
      ...restoredState.repoAnalyses.filter((analysis) => !userRepoIds.has(analysis.repo_id)),
      ...cloneState(baseState.repoAnalyses.filter((analysis) => userRepoIds.has(analysis.repo_id))),
    ],
  };

  writeState(nextState);

  return {
    repos_analyzed: nextState.repositories.filter((repo) => repo.user_id === userId).length,
    skills_detected: nextState.userSkills.filter((skill) => skill.user_id === userId).length,
  };
}

export async function deleteDemoAccount(userId: string) {
  const currentState = ensureDemoUserInState(readState());
  const removedRepoIds = new Set(
    currentState.repositories.filter((repo) => repo.user_id === userId).map((repo) => repo.id)
  );

  const nextState: DemoState = {
    profiles: currentState.profiles.filter((profile) => profile.id !== userId),
    repositories: currentState.repositories.filter((repo) => repo.user_id !== userId),
    userSkills: currentState.userSkills.filter((skill) => skill.user_id !== userId),
    repoAnalyses: currentState.repoAnalyses.filter((analysis) => !removedRepoIds.has(analysis.repo_id)),
  };

  writeState(nextState);
}

export async function searchDemoDevelopers(
  query: string,
  minConfidence: number,
  category: 'all' | SkillCategory
) {
  const state = ensureDemoUserInState(readState());
  const normalizedQuery = query.trim().toLowerCase();
  const results = new Map<string, DeveloperSearchResult>();

  state.userSkills.forEach((userSkill) => {
    const profile = state.profiles.find((candidate) => candidate.id === userSkill.user_id);
    const skill = userSkill.skill;
    if (!profile?.is_public || !skill) {
      return;
    }

    if (userSkill.confidence < minConfidence) {
      return;
    }

    if (category !== 'all' && skill.category !== category) {
      return;
    }

    if (normalizedQuery && !skill.name.toLowerCase().includes(normalizedQuery)) {
      return;
    }

    if (!results.has(profile.id)) {
      results.set(profile.id, {
        user_id: profile.id,
        github_id: profile.github_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        show_confidence: profile.show_confidence,
        skills: [],
      });
    }

    results.get(profile.id)?.skills.push({
      name: skill.name,
      category: skill.category,
      confidence: userSkill.confidence,
    });
  });

  return Array.from(results.values())
    .map((developer) => ({
      ...developer,
      skills: developer.skills.sort((left, right) => right.confidence - left.confidence),
    }))
    .sort((left, right) => (right.skills[0]?.confidence ?? 0) - (left.skills[0]?.confidence ?? 0));
}

export async function fetchDemoTopRepositories(userId: string, limit = 3) {
  const repositories = await fetchDemoUserRepositories(userId);
  return repositories
    .sort((left, right) => right.quality_score - left.quality_score)
    .slice(0, limit)
    .map((repo) => ({
      name: repo.name,
      stars: repo.stars,
      language: repo.language,
      quality_score: repo.quality_score,
    }));
}

export async function fetchDemoPublicProfile(githubId: string): Promise<PublicProfilePayload | null> {
  const state = ensureDemoUserInState(readState());
  const profile = state.profiles.find(
    (candidate) => candidate.github_id.toLowerCase() === githubId.toLowerCase() && candidate.is_public
  );

  if (!profile) {
    return null;
  }

  const repos = state.repositories
    .filter((repo) => repo.user_id === profile.id)
    .sort((left, right) => right.stars - left.stars);

  return {
    profile,
    skills: withRepoObjects(
      state.userSkills
        .filter((skill) => skill.user_id === profile.id)
        .sort((left, right) => right.confidence - left.confidence),
      repos
    ),
    repos: repos.slice(0, 6),
    repoCount: repos.length,
  };
}

export function generateDemoExplanation(repoId: string, audience: 'hr' | 'technical') {
  const state = ensureDemoUserInState(readState());
  const repo = state.repositories.find((candidate) => candidate.id === repoId);
  if (!repo) {
    return '';
  }

  if (audience === 'hr') {
    return [
      `${repo.name} is a ${repo.language} project that demonstrates ownership of a business-critical product area rather than a toy example.`,
      `The repository shows sustained execution with ${repo.commits} commits, ${repo.stars} stars, and a quality score of ${Math.round(
        repo.quality_score * 100
      )}%.`,
      `From a hiring perspective, it signals the ability to ship maintainable features, work across multiple parts of a stack, and keep momentum on a real product over time.`,
      `The strongest evidence comes from ${Object.keys(repo.languages).join(', ')}, plus clear patterns around ${repo.patterns.join(
        ', '
      )}.`,
    ].join('\n\n');
  }

  return [
    `Repository: ${repo.name}`,
    `Primary stack: ${repo.language} with supporting technologies ${Object.keys(repo.languages).join(', ')}.`,
    `Architecture signals: ${repo.patterns.join(', ')}.`,
    `Operational footprint: ${repo.dependencies.join(', ')}.`,
    `The codebase appears technically mature, with ${repo.commits} commits and a ${Math.round(
      repo.quality_score * 100
    )}% quality score, which suggests active maintenance, clear structure, and working delivery practices.`,
  ].join('\n\n');
}
