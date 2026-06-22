/*
  # Fix github_id casing

  ## Why
  Public profile lookups previously used a case-insensitive `ILIKE` match while the
  `profiles.github_id` column only had a case-sensitive `UNIQUE` constraint. That mismatch
  meant two usernames differing only in case (e.g. `Octocat` vs `octocat`) could both be
  inserted, and a public lookup could resolve to the wrong identity.

  ## What this migration does
  1. Normalizes every existing `github_id` to lowercase so application code can match on a
     canonical form (`.eq('github_id', value.toLowerCase())`).
  2. Adds a functional UNIQUE index on `lower(github_id)` so the database enforces
     case-insensitive uniqueness from now on and keeps the lookup fast.

  ## Notes
  - If two rows currently differ only by case, the index creation will fail. That collision
    must be resolved manually before re-running, which is the correct, safe behavior.
*/

-- 1. Canonicalize existing data to lowercase.
UPDATE profiles
SET github_id = lower(github_id)
WHERE github_id <> lower(github_id);

-- 2. Enforce case-insensitive uniqueness and fast lookup.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_github_id_lower
  ON profiles (lower(github_id));
