'use client';

// 連續專注天數的火焰徽章（資料由 useStreak 取得後傳入）
export default function StreakBadge({ streak, loading }) {
  if (loading) return null;
  return (
    <span className="streak-badge" title="連續專注天數">
      <span className="flame" aria-hidden>🔥</span>
      <span className="streak-text">連續專注</span>
      <span className="streak-num">{streak}</span>
      <span className="streak-label">天</span>
    </span>
  );
}

// 今天尚未有紀錄時督促使用者，已有紀錄則顯示鼓勵文字
export function StreakHint({ streak, startedToday }) {
  return (
    <div className="streak-hint">
      {startedToday ? `你已連續專注 ${streak} 天，繼續保持！` : '今天還沒開始專注喔！'}
    </div>
  );
}
