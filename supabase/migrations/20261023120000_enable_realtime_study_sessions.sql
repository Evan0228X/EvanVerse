/*
# Enable Realtime for study_sessions

1. Purpose
- 房間排行榜訂閱 study_sessions 的 INSERT 事件，存檔後立刻更新（不必按 F5）。
- Supabase Realtime 只會推送在 `supabase_realtime` publication 內的資料表，
  因此必須把 study_sessions 加入該 publication。
2. Security
- 不改動任何 policy。Realtime 會套用既有的 anon SELECT policy（目前允許全部讀取），
  因此匿名（anon key）用戶端可以收到事件。
3. Notes
- 可重複執行：若已在 publication 內則略過。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'study_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
  END IF;
END $$;
