// 考試倒數行事曆的本地資料（完全存在 localStorage，不使用任何後端）
const DDAY_KEY = 'co-study-ddays';

export const MAX_DDAYS = 3;

const DAY_MS = 86400000;

// 本地時區的 YYYY-MM-DD
export function toDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 顯示用：10/23
export function fmtDateShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function loadDDays() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DDAY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((it) => it && typeof it.name === 'string' && typeof it.date === 'string' && it.date)
      .slice(0, MAX_DDAYS)
      .map((it) => ({ id: it.id || `${it.date}-${it.name}`, name: it.name, date: it.date }));
  } catch {
    return [];
  }
}

export function saveDDays(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DDAY_KEY, JSON.stringify(list));
  } catch {}
}

// 距目標日還有幾天（以本地日期為準，0 表示今天）
export function daysUntil(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}
