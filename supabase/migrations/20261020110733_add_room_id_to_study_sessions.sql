/*
# Add room_id column to study_sessions

1. Modified Tables
- `study_sessions`
  - new column `room_id` (text, nullable) — which room the session was recorded in.
    Nullable so existing rows and non-room sessions remain valid.
2. Security
- No policy changes; existing anon CRUD policies already cover the new column.
3. Indexes
- `idx_study_sessions_room_created` on (room_id, created_at desc) for room
  leaderboard queries filtered by today.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN room_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_sessions_room_created
  ON study_sessions (room_id, created_at DESC);
