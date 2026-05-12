/*
  # SkillOS Database Schema

  ## Overview
  Complete database schema for SkillOS - Developer Credit Infrastructure platform.
  This migration creates all tables needed for skill analysis, repository tracking, and user profiles.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, FK to auth.users) - User profile ID
  - `github_id` (text) - GitHub username
  - `name` (text) - Full name
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### `repositories`
  - `id` (uuid, PK) - Repository ID
  - `user_id` (uuid, FK) - Owner user ID
  - `github_id` (text) - GitHub repository ID
  - `name` (text) - Repository name
  - `full_name` (text) - Full repository name (owner/repo)
  - `description` (text) - Repository description
  - `language` (text) - Primary language
  - `languages` (jsonb) - Language breakdown
  - `stars` (integer) - Star count
  - `forks` (integer) - Fork count
  - `is_fork` (boolean) - Whether this is a forked repo
  - `commits` (integer) - Total commits
  - `last_activity_days` (integer) - Days since last activity
  - `dependencies` (jsonb) - Array of dependencies
  - `patterns` (jsonb) - Detected code patterns
  - `file_structure` (jsonb) - File structure array
  - `quality_score` (numeric) - Computed quality score (0-1)
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### `skills`
  - `id` (uuid, PK) - Skill ID
  - `name` (text, unique) - Skill name
  - `category` (text) - Category (language, framework, concept, devops, practice, database)
  - `created_at` (timestamptz) - Record creation time
  
  ### `user_skills`
  - `id` (uuid, PK) - User skill ID
  - `user_id` (uuid, FK) - User ID
  - `skill_id` (uuid, FK) - Skill ID
  - `confidence` (integer) - Confidence score (0-100)
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### `skill_evidence`
  - `id` (uuid, PK) - Evidence ID
  - `user_skill_id` (uuid, FK) - User skill ID
  - `repo_id` (uuid, FK) - Repository ID
  - `file_path` (text) - File path
  - `code_snippet` (text) - Code snippet
  - `line_numbers` (jsonb) - Array of line numbers
  - `score` (numeric) - Evidence score
  - `flags` (jsonb) - Integrity flags
  - `created_at` (timestamptz) - Record creation time
  
  ### `repo_analysis`
  - `id` (uuid, PK) - Analysis ID
  - `repo_id` (uuid, FK) - Repository ID
  - `complexity_score` (integer) - Complexity score (0-100)
  - `quality_score` (integer) - Quality score (0-100)
  - `security_score` (integer) - Security score (0-100)
  - `testing_score` (integer) - Testing coverage score (0-100)
  - `maturity_score` (integer) - Overall maturity score (0-100)
  - `created_at` (timestamptz) - Analysis time
  
  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Skills table is read-only for all authenticated users
  - Proper indexes for performance
*/

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  github_id text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  description text DEFAULT '',
  language text DEFAULT '',
  languages jsonb DEFAULT '{}',
  stars integer DEFAULT 0,
  forks integer DEFAULT 0,
  is_fork boolean DEFAULT false,
  commits integer DEFAULT 0,
  last_activity_days integer DEFAULT 0,
  dependencies jsonb DEFAULT '[]',
  patterns jsonb DEFAULT '[]',
  file_structure jsonb DEFAULT '[]',
  quality_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, github_id)
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('language', 'framework', 'concept', 'devops', 'practice', 'database')),
  created_at timestamptz DEFAULT now()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create skill_evidence table
CREATE TABLE IF NOT EXISTS skill_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  repo_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  code_snippet text DEFAULT '',
  line_numbers jsonb DEFAULT '[]',
  score numeric DEFAULT 0,
  flags jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Create repo_analysis table
CREATE TABLE IF NOT EXISTS repo_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  complexity_score integer DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),
  quality_score integer DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  security_score integer DEFAULT 0 CHECK (security_score >= 0 AND security_score <= 100),
  testing_score integer DEFAULT 0 CHECK (testing_score >= 0 AND testing_score <= 100),
  maturity_score integer DEFAULT 0 CHECK (maturity_score >= 0 AND maturity_score <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_skill_id ON skill_evidence(user_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_repo_id ON skill_evidence(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_analysis_repo_id ON repo_analysis(repo_id);
CREATE INDEX IF NOT EXISTS idx_profiles_github_id ON profiles(github_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_analysis ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Repositories policies
CREATE POLICY "Users can view own repositories"
  ON repositories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories"
  ON repositories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories"
  ON repositories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories"
  ON repositories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Skills policies (read-only for all authenticated users)
CREATE POLICY "All users can view skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- User skills policies
CREATE POLICY "Users can view own skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Skill evidence policies
CREATE POLICY "Users can view own skill evidence"
  ON skill_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_evidence.user_skill_id
      AND user_skills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own skill evidence"
  ON skill_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_evidence.user_skill_id
      AND user_skills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own skill evidence"
  ON skill_evidence FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_evidence.user_skill_id
      AND user_skills.user_id = auth.uid()
    )
  );

-- Repo analysis policies
CREATE POLICY "Users can view own repo analysis"
  ON repo_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE repositories.id = repo_analysis.repo_id
      AND repositories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own repo analysis"
  ON repo_analysis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE repositories.id = repo_analysis.repo_id
      AND repositories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own repo analysis"
  ON repo_analysis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE repositories.id = repo_analysis.repo_id
      AND repositories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE repositories.id = repo_analysis.repo_id
      AND repositories.user_id = auth.uid()
    )
  );

-- Insert predefined skills
INSERT INTO skills (name, category) VALUES
  ('Python', 'language'),
  ('JavaScript', 'language'),
  ('TypeScript', 'language'),
  ('Rust', 'language'),
  ('Go', 'language'),
  ('Java', 'language'),
  ('C++', 'language'),
  ('Ruby', 'language'),
  ('PHP', 'language'),
  ('React', 'framework'),
  ('Vue', 'framework'),
  ('Angular', 'framework'),
  ('Django', 'framework'),
  ('Flask', 'framework'),
  ('FastAPI', 'framework'),
  ('Express', 'framework'),
  ('Spring', 'framework'),
  ('GraphQL', 'framework'),
  ('Backend Development', 'concept'),
  ('Frontend Development', 'concept'),
  ('Full-Stack Development', 'concept'),
  ('REST API Design', 'concept'),
  ('Database Design', 'concept'),
  ('Authentication Systems', 'concept'),
  ('State Management', 'concept'),
  ('System Design', 'concept'),
  ('Machine Learning', 'concept'),
  ('Data Visualization', 'concept'),
  ('Mobile Development', 'concept'),
  ('Docker', 'devops'),
  ('Kubernetes', 'devops'),
  ('CI/CD', 'devops'),
  ('AWS', 'devops'),
  ('GCP', 'devops'),
  ('Azure', 'devops'),
  ('Terraform', 'devops'),
  ('Testing', 'practice'),
  ('Security Practices', 'practice'),
  ('Code Review', 'practice'),
  ('Agile', 'practice'),
  ('PostgreSQL', 'database'),
  ('MySQL', 'database'),
  ('MongoDB', 'database'),
  ('Redis', 'database'),
  ('Elasticsearch', 'database')
ON CONFLICT (name) DO NOTHING;