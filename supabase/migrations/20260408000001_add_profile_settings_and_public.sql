-- Add profile settings columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_confidence boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz;

-- Indexes for public search and filtering
CREATE INDEX IF NOT EXISTS idx_profiles_github_id_public
  ON profiles(github_id) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_user_skills_confidence
  ON user_skills(confidence DESC);

-- Replace restrictive profile policy with public-profile access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Anyone can view public profiles"
  ON profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

-- Allow authenticated users to see public developer skills
DROP POLICY IF EXISTS "Users can view own skills" ON user_skills;

CREATE POLICY "Users can view own skills or public developer skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_skills.user_id
        AND profiles.is_public = true
    )
  );

-- Allow authenticated users to see public repositories
DROP POLICY IF EXISTS "Users can view own repositories" ON repositories;

CREATE POLICY "Users can view own or public repositories"
  ON repositories FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = repositories.user_id
        AND profiles.is_public = true
    )
  );

-- Allow anon access to public profiles, skills, and repositories
CREATE POLICY "Anon can view public profiles"
  ON profiles FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Anon can view public user_skills"
  ON user_skills FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_skills.user_id
        AND profiles.is_public = true
    )
  );

CREATE POLICY "Anon can view public repositories"
  ON repositories FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = repositories.user_id
        AND profiles.is_public = true
    )
  );

CREATE POLICY "Anon can view skills table"
  ON skills FOR SELECT
  TO anon
  USING (true);
