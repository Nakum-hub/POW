export interface Profile {
  id: string;
  github_id: string;
  name: string;
  avatar_url: string;
  is_public: boolean;
  show_confidence: boolean;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanKey = 'starter' | 'growth' | 'scale' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface PlanEntitlements {
  search_results_limit: number;
  saved_lists_limit: number;
  saved_candidates_limit: number;
  monthly_exports_limit: number;
  seats_included: number;
  ai_briefs_limit: number;
  supports_customer_portal: boolean;
  includes_pipeline_analytics: boolean;
  includes_white_glove_onboarding: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_key: PlanKey;
  status: SubscriptionStatus;
  seats: number;
  monthly_price: number;
  monthly_value_target: number;
  current_period_end: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type PipelineStage = 'new' | 'outreach' | 'screen' | 'interview' | 'offer' | 'won' | 'archived';

export interface RecruiterList {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  candidate_count: number;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  user_id: string;
  github_id: string;
  name: string;
  full_name: string;
  description: string;
  language: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  is_fork: boolean;
  commits: number;
  last_activity_days: number;
  dependencies: string[];
  patterns: string[];
  file_structure: string[];
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export type SkillCategory = 'language' | 'framework' | 'concept' | 'devops' | 'practice' | 'database';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  skill?: Skill;
  evidence?: Array<{
    repo_id?: string;
    repo?: Repository;
    score?: number;
    flags?: IntegrityFlag[];
    snippets?: Array<{
      file: string;
      lines: Array<{ line: number; text: string }>;
    }>;
  }>;
}

export interface IntegrityFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  msg: string;
}

export interface SkillEvidence {
  id: string;
  user_skill_id: string;
  repo_id: string;
  file_path: string;
  code_snippet: string;
  line_numbers: number[];
  score: number;
  flags: IntegrityFlag[];
  created_at: string;
  repo?: Repository;
}

export interface RepoAnalysis {
  id: string;
  repo_id: string;
  complexity_score: number;
  quality_score: number;
  security_score: number;
  testing_score: number;
  maturity_score: number;
  created_at: string;
}

export interface MaturityScores {
  quality: number;
  complexity: number;
  security: number;
  testing: number;
  overall: number;
}

export interface AnalysisResults {
  maturity: MaturityScores;
  totalRepos: number;
  analyzedRepos: number;
  flaggedRepos: number;
}

export interface SkillWithEvidence extends UserSkill {
  skill: Skill;
  evidence: Array<{
    repo: Repository;
    score: number;
    flags: IntegrityFlag[];
    snippets: Array<{
      file: string;
      lines: Array<{ line: number; text: string }>;
    }>;
  }>;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  updated_at: string;
  created_at: string;
}

export interface SkillConnection {
  source: string;
  target: string;
}

export interface SkillNode {
  id: string;
  category: SkillCategory;
  confidence: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface ProjectExplanation {
  explanation: string;
}

export interface ArchitectureNode {
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
  bg?: string;
}

export interface ArchitectureEdge {
  from: number;
  to: number;
  dashed?: boolean;
}

export interface ArchitectureData {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface CandidateProfile {
  name: string;
  github_id: string;
  avatar: string;
  title: string;
  repos: number;
  maturity: number;
  skills: SkillWithEvidence[];
}

export type ViewType = 'login' | 'analysis' | 'dashboard' | 'skills' | 'repos' | 'search' | 'explainer' | 'settings';

export interface AppState {
  currentView: ViewType;
  user: Profile | null;
  repos: Repository[];
  skills: SkillWithEvidence[];
  analysisResults: AnalysisResults | null;
  selectedSkill: SkillWithEvidence | null;
  selectedRepo: Repository | null;
  searchQuery: string;
  sidebarOpen: boolean;
  analysisProgress: number;
  analysisStage: string;
  isAnalyzing: boolean;
}

export interface DeveloperSkillSignal {
  name: string;
  category: SkillCategory;
  confidence: number;
}

export interface DeveloperSearchResult {
  user_id: string;
  github_id: string;
  name: string;
  avatar_url: string;
  show_confidence: boolean;
  skills: DeveloperSkillSignal[];
}

export interface PipelineDeveloperProfile extends DeveloperSearchResult {
  top_repositories: Array<{
    name: string;
    stars: number;
    language: string;
    quality_score: number;
  }>;
}

export interface RecruiterListCandidate {
  id: string;
  list_id: string;
  developer_user_id: string;
  stage: PipelineStage;
  fit_score: number;
  notes: string;
  created_at: string;
  updated_at: string;
  developer?: PipelineDeveloperProfile;
}
