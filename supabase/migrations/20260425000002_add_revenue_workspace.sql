-- Revenue workspace and recruiter pipeline

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  plan_key text NOT NULL DEFAULT 'starter' CHECK (plan_key IN ('starter', 'growth', 'scale', 'enterprise')),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  seats integer NOT NULL DEFAULT 1 CHECK (seats >= 1),
  monthly_price integer NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  monthly_value_target integer NOT NULL DEFAULT 0 CHECK (monthly_value_target >= 0),
  current_period_end timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruiter_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruiter_list_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES recruiter_lists(id) ON DELETE CASCADE,
  developer_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'outreach', 'screen', 'interview', 'offer', 'won', 'archived')),
  fit_score integer NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(list_id, developer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_lists_owner_id ON recruiter_lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_list_candidates_list_id ON recruiter_list_candidates(list_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_list_candidates_developer_user_id ON recruiter_list_candidates(developer_user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_list_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own recruiter lists"
  ON recruiter_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own recruiter lists"
  ON recruiter_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recruiter lists"
  ON recruiter_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recruiter lists"
  ON recruiter_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own recruiter list candidates"
  ON recruiter_list_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recruiter_lists
      WHERE recruiter_lists.id = recruiter_list_candidates.list_id
        AND recruiter_lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recruiter list candidates"
  ON recruiter_list_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recruiter_lists
      WHERE recruiter_lists.id = recruiter_list_candidates.list_id
        AND recruiter_lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recruiter list candidates"
  ON recruiter_list_candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recruiter_lists
      WHERE recruiter_lists.id = recruiter_list_candidates.list_id
        AND recruiter_lists.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recruiter_lists
      WHERE recruiter_lists.id = recruiter_list_candidates.list_id
        AND recruiter_lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recruiter list candidates"
  ON recruiter_list_candidates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recruiter_lists
      WHERE recruiter_lists.id = recruiter_list_candidates.list_id
        AND recruiter_lists.owner_id = auth.uid()
    )
  );
