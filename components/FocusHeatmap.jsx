'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { todayLocalDate } from '@/lib/streak';

// 顯示約半年的資料（27 週）
const WEEKS = 27;
const DAY_MS = 86400000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// 當天專注分鐘數 → 顏色深淺（0 為空白）
function levelOf(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

function fmtHM(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} 小時 ${m} 分鐘`;
  if (m > 0) return `${m} 分鐘`;
  return `${s} 秒`;
}

function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export default function FocusHeatmap({ userId }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      // 以本地時區回推 WEEKS 週（再多抓一週，涵蓋格子起始那週的前幾天），
      // 再轉成 UTC ISO 給 timestamptz 比對
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (WEEKS + 1) * 7);
      const { data, error: qErr } = await supabase()
        .from('study_sessions')
        .select('duration, created_at')
        .eq('user_id', userId)
        .gte('created_at', from.toISOString());
      if (!active) return;
      if (qErr) { setError(qErr.message); setSessions([]); return; }
      setSessions(data || []);
    })();
    return () => { active = false; };
  }, [userId]);

  const { cols, monthLabels, totalSec, activeDays } = useMemo(() => {
    const byDay = new Map();
    (sessions || []).forEach((row) => {
      if (!row.created_at) return;
      const t = new Date(row.created_at);
      if (Number.isNaN(t.getTime())) return;
      // created_at 是 UTC，換算成本地日期才會落在正確的格子
      const key = todayLocalDate(t);
      byDay.set(key, (byDay.get(key) || 0) + (row.duration || 0));
    });

    const today = new Date();
    const todayKey = todayLocalDate(today);
    const cursor = startOfWeek(new Date(today.getTime() - (WEEKS - 1) * 7 * DAY_MS));

    const columns = [];
    const labels = [];
    for (let w = 0; w < WEEKS; w++) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(cursor);
        const key = todayLocalDate(day);
        const sec = byDay.get(key) || 0;
        week.push({ key, sec, level: key > todayKey ? -1 : levelOf(Math.floor(sec / 60)) });
        cursor.setDate(cursor.getDate() + 1);
      }
      columns.push(week);
      const firstOfMonth = week.find((c) => Number(c.key.slice(8, 10)) === 1);
      labels.push(
        firstOfMonth ? `${Number(firstOfMonth.key.slice(5, 7))}月`
        : w === 0 ? `${Number(week[0].key.slice(5, 7))}月`
        : ''
      );
    }

    let total = 0;
    let days = 0;
    const gridStartKey = columns[0][0].key;
    byDay.forEach((sec, key) => {
      if (key < gridStartKey) return;
      total += sec;
      if (sec > 0) days += 1;
    });

    return { cols: columns, monthLabels: labels, totalSec: total, activeDays: days };
  }, [sessions]);

  return (
    <div className="card">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <h2 className="card-title" style={{ margin: 0 }}>專注熱力圖</h2>
        <span className="muted small">近半年（以本地日期計算）</span>
      </div>

      <div className="muted small" style={{ marginBottom: 14 }}>
        {sessions === null
          ? '載入中…'
          : `累計 ${fmtHM(totalSec)} · 有紀錄 ${activeDays} 天`}
      </div>

      {error && <div className="error">讀取熱力圖失敗：{error}</div>}

      <div className="heatmap">
        <div className="hm-scroll">
          <div className="hm-months-row">
            <span className="hm-gutter" />
            <div className="hm-months">
              {monthLabels.map((label, i) => <span key={i}>{label}</span>)}
            </div>
          </div>

          <div className="hm-body">
            <div className="hm-weekdays">
              {WEEKDAYS.map((d, i) => <span key={d}>{i % 2 === 1 ? d : ''}</span>)}
            </div>
            <div className="hm-grid">
              {cols.map((week) => week.map((cell) => (
                <div
                  key={cell.key}
                  className={`hm-cell${cell.level < 0 ? ' is-future' : ''}`}
                  data-level={cell.level < 0 ? 0 : cell.level}
                  title={cell.level < 0 ? undefined : `${cell.key} · ${cell.sec > 0 ? fmtHM(cell.sec) : '沒有紀錄'}`}
                />
              )))}
            </div>
          </div>

          <div className="hm-legend">
            <span>較少</span>
            <div className="hm-cell" data-level={0} />
            <div className="hm-cell" data-level={1} />
            <div className="hm-cell" data-level={2} />
            <div className="hm-cell" data-level={3} />
            <div className="hm-cell" data-level={4} />
            <span>較多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
