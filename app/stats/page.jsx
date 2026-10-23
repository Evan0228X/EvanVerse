'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId, getNickname } from '@/components/NicknameGate';
import FocusHeatmap from '@/components/FocusHeatmap';
import StudyReportModal from '@/components/StudyReportModal';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const PIE_COLORS = ['#22d3ee', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c', '#2dd4bf'];

function fmtDuration(sec) {
  const s = Math.max(0, sec | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}小時${m}分`;
  if (m > 0) return `${m}分`;
  return `${s}秒`;
}

function last7Days() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function StatsPage() {
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    setUserId(getUserId());
    setNickname(getNickname());
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data, error: qErr } = await supabase()
        .from('study_sessions')
        .select('subject, duration, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (qErr) { setError(qErr.message); return; }
      setSessions(data || []);
    })();
    return () => { active = false; };
  }, [userId]);

  const dailyData = (() => {
    const days = last7Days();
    const map = Object.fromEntries(days.map((d) => [d, 0]));
    (sessions || []).forEach((row) => {
      const d = (row.created_at || '').slice(0, 10);
      if (d in map) map[d] += row.duration || 0;
    });
    return days.map((d) => {
      const date = new Date(d);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return { date: label, seconds: map[d], label: fmtDuration(map[d]) };
    });
  })();

  const subjectData = (() => {
    const map = {};
    (sessions || []).forEach((row) => {
      const k = row.subject || '未分類';
      map[k] = (map[k] || 0) + (row.duration || 0);
    });
    return Object.entries(map)
      .map(([name, seconds]) => ({ name, value: seconds, label: fmtDuration(seconds) }))
      .sort((a, b) => b.value - a.value);
  })();

  const totalSec = (sessions || []).reduce((sum, r) => sum + (r.duration || 0), 0);

  if (!userId) {
    return <div className="container"><div className="subtitle">載入中…</div></div>;
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 className="title" style={{ margin: 0 }}>學習統計</h1>
        <a className="top-action-btn" href="/" title="回首頁" aria-label="回首頁">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </a>
      </div>

      <div className="card">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="muted small">使用者</div>
            <div>{nickname || '匿名'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted small">累計學習</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtDuration(totalSec)}</div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => setShowReport(true)}
          disabled={sessions === null}
        >
          生成學習戰報
        </button>
      </div>

      {error && <div className="error">讀取紀錄失敗：{error}</div>}

      <FocusHeatmap userId={userId} />

      {sessions === null ? (
        <div className="card"><div className="subtitle">載入中…</div></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <h2 className="card-title">還沒有學習紀錄</h2>
          <p className="muted">進房間計時，按下「結束」後紀錄會出現在這裡。</p>
          <a className="btn btn-primary" href="/" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>開始學習</a>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="card-title">最近 7 天每日學習時長</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dailyData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,78,110,0.3)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7a90" />
                  <YAxis
                    tickFormatter={(v) => fmtDuration(v)}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7a90"
                    width={72}
                  />
                  <Tooltip formatter={(v) => fmtDuration(v)} contentStyle={{ borderRadius: 8, background: '#0f1623', border: '1px solid rgba(56,78,110,0.5)', color: '#e5edf5' }} />
                  <Bar dataKey="seconds" name="學習時長" radius={[6, 6, 0, 0]} fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">各科目學習時間占比</h2>
            {subjectData.length === 0 ? (
              <p className="muted">尚無資料</p>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name} ${fmtDuration(entry.value)}`}
                      labelLine={false}
                    >
                      {subjectData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtDuration(v)} contentStyle={{ borderRadius: 8, background: '#0f1623', border: '1px solid rgba(56,78,110,0.5)', color: '#e5edf5' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {showReport && (
        <StudyReportModal
          sessions={sessions || []}
          nickname={nickname}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
