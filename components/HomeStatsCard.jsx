'use client';

import { useEffect, useState } from 'react';
import { getUserId, getNickname } from '@/components/NicknameGate';
import { fetchTodaySeconds, useStreak } from '@/lib/streak';
import StreakBadge, { StreakHint } from '@/components/StreakBadge';
import { getDailyGoalMinutes, setDailyGoalMinutes } from '@/lib/goal';

function fmtDuration(sec) {
  const s = Math.max(0, sec | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}小時${m}分`;
  if (m > 0) return `${m}分`;
  return `${s}秒`;
}

function fmtMin(min) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}小時${m}分` : `${h}小時`;
  }
  return `${min}分`;
}

export default function HomeStatsCard() {
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [todaySec, setTodaySec] = useState(0);
  const [goalMin, setGoalMin] = useState(0);
  const [goalInput, setGoalInput] = useState('');
  const [loading, setLoading] = useState(true);
  const { streak, startedToday, loading: streakLoading } = useStreak(userId);

  useEffect(() => {
    setUserId(getUserId());
    setNickname(getNickname());
    setGoalMin(getDailyGoalMinutes());
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const today = await fetchTodaySeconds(userId);
      if (!active) return;
      setTodaySec(today);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userId]);

  const goalSec = goalMin * 60;
  const pct = goalSec > 0 ? Math.min(100, Math.round((todaySec / goalSec) * 100)) : 0;

  const saveGoal = () => {
    const v = Number(goalInput);
    if (Number.isFinite(v) && v > 0) {
      setDailyGoalMinutes(v);
      setGoalMin(v);
      setGoalInput('');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="subtitle">載入中…</div>
      </div>
    );
  }

  return (
    <div className="card home-stats">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h2 className="card-title" style={{ margin: 0 }}>今日學習</h2>
        <StreakBadge streak={streak} loading={streakLoading} />
      </div>

      <div className="muted small" style={{ marginBottom: 4 }}>今日已學習</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
        {fmtDuration(todaySec)}
      </div>

      {goalMin > 0 ? (
        <>
          <div className="goal-bar-track">
            <div className="goal-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="goal-bar-row">
            <span>目標 {fmtMin(goalMin)} · {pct}%</span>
            {pct >= 100
              ? <span className="goal-done">目標達成！</span>
              : <span>還差 {fmtDuration(Math.max(0, goalSec - todaySec))}</span>}
          </div>
          <button className="link-btn" style={{ marginTop: 6 }} onClick={() => { setGoalInput(String(goalMin)); setGoalMin(0); }}>
            調整目標
          </button>
        </>
      ) : (
        <div className="goal-set">
          <div className="muted small" style={{ marginBottom: 8 }}>設定今日目標</div>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, height: 42 }}
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="例如 120（分鐘）"
            />
            <button className="btn btn-primary" style={{ height: 42 }} onClick={saveGoal} disabled={!Number(goalInput) > 0}>
              設定
            </button>
          </div>
        </div>
      )}

      {!streakLoading && <StreakHint streak={streak} startedToday={startedToday} />}
    </div>
  );
}
