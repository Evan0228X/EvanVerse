/*
# Create study_sessions table (single-tenant, no auth)

1. New Tables
- `study_sessions`
  - `id` (uuid, primary key)
  - `user_id` (text, not null) — the browser-generated random UUID identifying a local user
  - `subject` (text, not null) — study subject/category label
  - `duration` (integer, not null) — session length in seconds
  - `created_at` (timestamptz, default now()) — when the session was recorded
2. Security
- Enable RLS on `study_sessions`.
- Allow anon + authenticated CRUD: the app uses a browser-generated random user_id
  with no Supabase sign-in, so anon-key access is required for reads and writes.
  Rows are effectively scoped per-device by the user_id column, but since there is
  no auth, the DB cannot enforce ownership — anon access is intentional.
3. Indexes
- `idx_study_sessions_user_created` on (user_id, created_at desc) for stats queries
*/

CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  duration integer NOT NULL CHECK (duration >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_study_sessions" ON study_sessions;
CREATE POLICY "anon_select_study_sessions" ON study_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_study_sessions" ON study_sessions;
CREATE POLICY "anon_insert_study_sessions" ON study_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_study_sessions" ON study_sessions;
CREATE POLICY "anon_update_study_sessions" ON study_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_study_sessions" ON study_sessions;
CREATE POLICY "anon_delete_study_sessions" ON study_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created
  ON study_sessions (user_id, created_at DESC);
