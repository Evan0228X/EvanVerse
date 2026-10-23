/*
# Add note column to study_sessions (學習日誌)

1. Modified Tables
- `study_sessions`
  - new column `note` (text, nullable) — 使用者在「結束並儲存」後寫下的學習心得/筆記。
    Nullable 是因為使用者可以選擇略過，且既有資料列沒有筆記。
2. Security
- 不改動 policy：既有的 anon SELECT/INSERT/UPDATE policy 已涵蓋新欄位，
  筆記是在既有資料列上以 UPDATE 寫入。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'note'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN note text;
  END IF;
END $$;
