import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function todayLocalDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return todayLocalDate(d);
}

// 以「使用者本地時區」的今天 00:00:00 ~ 23:59:59.999 換算成 UTC ISO 字串。
// created_at 是 timestamptz（UTC 儲存），直接傳本地時間字串會被當成 UTC，
// 導致本地 00:00 ~ 08:00（GMT+8）建立的紀錄被排除。
export function todayRangeUTC(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchStudyDays(userId) {
  if (!userId) return [];
  const { data, error } = await supabase()
    .from('study_sessions')
    .select('created_at')
    .eq('user_id', userId);
  if (error) return [];
  const days = new Set();
  (data || []).forEach((row) => {
    if (!row.created_at) return;
    // created_at 是 UTC，需轉成本地日期，否則凌晨的場次會被算成前一天
    const t = new Date(row.created_at);
    if (Number.isNaN(t.getTime())) return;
    days.add(todayLocalDate(t));
  });
  return [...days];
}

export function computeStreak(studyDays) {
  if (!studyDays || studyDays.length === 0) return 0;
  const set = new Set(studyDays);
  const today = todayLocalDate();
  const yesterday = localDateOffset(1);
  if (!set.has(today) && !set.has(yesterday)) return 0;
  let cursor = set.has(today) ? today : yesterday;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    const [y, m, d] = cursor.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    cursor = todayLocalDate(dt);
  }
  return streak;
}

export async function fetchTodaySeconds(userId) {
  if (!userId) return 0;
  const { start, end } = todayRangeUTC();
  const { data, error } = await supabase()
    .from('study_sessions')
    .select('duration')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end);
  if (error) return 0;
  return (data || []).reduce((sum, r) => sum + (r.duration || 0), 0);
}

// 讀取連續專注天數；refreshKey 改變時會重新查詢（例如房間的 presence 更新）
export function useStreak(userId, refreshKey) {
  const [state, setState] = useState({ streak: 0, startedToday: false, loading: true });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const days = await fetchStudyDays(userId);
      if (!active) return;
      setState({
        streak: computeStreak(days),
        startedToday: days.includes(todayLocalDate()),
        loading: false,
      });
    })();
    return () => { active = false; };
  }, [userId, refreshKey]);

  return state;
}
