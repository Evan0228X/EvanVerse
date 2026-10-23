const GOAL_KEY = 'co-study-daily-goal';

export function getDailyGoalMinutes() {
  if (typeof window === 'undefined') return 0;
  const v = Number(localStorage.getItem(GOAL_KEY));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function setDailyGoalMinutes(minutes) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, String(Math.max(0, Math.floor(minutes || 0))));
}
