'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const REFRESH_MS = 30000;
// Presence 發出變動後，等資料寫入 DB 完成再重抓，避免抓到舊資料
const PRESENCE_REFRESH_DELAY_MS = 1500;

// 以「使用者本地時區」的今天 00:00:00 ~ 23:59:59.999 換算成 UTC ISO 字串。
// Supabase 的 created_at 是 timestamptz（UTC 儲存），若直接傳本地時間字串會被當成 UTC，
// 導致本地 00:00 ~ 08:00（GMT+8）建立的紀錄被排除。
function localDayRangeUTC(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmtDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} 小時 ${m} 分鐘`;
  if (m > 0) return `${m} 分鐘`;
  return `${s} 秒`;
}

function shortId(id) {
  return (id || '').slice(0, 5) || '未知';
}

// 用 Presence 的成員資料補齊 user_id → 暱稱的對照表（DB 沒有存暱稱）
function presenceNicknames(presenceState) {
  const map = {};
  if (!presenceState) return map;
  Object.entries(presenceState).forEach(([key, arr]) => {
    const meta = (arr && arr[0]) || {};
    const id = meta.userId || key;
    if (meta.nickname) map[id] = meta.nickname;
  });
  return map;
}

export default function RoomLeaderboard({ roomId, selfUserId, nickname, presenceState }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reloadRef = useRef(null);

  const nicknames = useMemo(() => {
    const map = presenceNicknames(presenceState);
    if (selfUserId && nickname) map[selfUserId] = nickname;
    return map;
  }, [presenceState, selfUserId, nickname]);

  // Presence 上的今日秒數變動時（開始／暫停／存檔）重新抓取排行榜
  const refreshSignal = useMemo(() => {
    if (!presenceState) return 0;
    return Object.values(presenceState).reduce((sum, arr) => {
      const meta = (arr && arr[0]) || {};
      return sum + (meta.todaySec || 0);
    }, 0);
  }, [presenceState]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const sb = supabase();

    const load = async () => {
      const { start, end } = localDayRangeUTC();
      const { data, error: err } = await sb
        .from('study_sessions')
        .select('user_id, duration')
        .eq('room_id', roomId)
        .gte('created_at', start)
        .lte('created_at', end);
      if (!active) return;
      if (err) {
        setError('排行榜載入失敗：' + err.message);
        setLoading(false);
        return;
      }
      const totals = new Map();
      (data || []).forEach((r) => {
        if (!r.user_id) return;
        totals.set(r.user_id, (totals.get(r.user_id) || 0) + (r.duration || 0));
      });
      setError('');
      setRows([...totals.entries()].map(([userId, sec]) => ({ userId, sec })).sort((a, b) => b.sec - a.sec));
      setLoading(false);
    };

    reloadRef.current = load;
    load();

    // 保險機制：定期重抓
    const timer = setInterval(load, REFRESH_MS);

    // 監聽本房間 study_sessions 的新增事件（別人存檔也會即時更新）
    const ch = sb.channel(`room-leaderboard:${roomId}`);
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'study_sessions', filter: `room_id=eq.${roomId}` },
      (payload) => { if (payload?.new?.room_id === roomId) load(); }
    ).subscribe();

    return () => {
      active = false;
      reloadRef.current = null;
      clearInterval(timer);
      try { sb.removeChannel(ch); } catch {}
    };
  }, [roomId]);

  // 自己按下「結束並儲存」後，insert 完成再重抓（延遲避開寫入尚未完成的競態）
  useEffect(() => {
    if (!refreshSignal) return;
    const t = setTimeout(() => { reloadRef.current?.(); }, PRESENCE_REFRESH_DELAY_MS);
    return () => clearTimeout(t);
  }, [refreshSignal]);

  const maxSec = rows.length > 0 ? rows[0].sec || 1 : 1;

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="card-title" style={{ margin: 0 }}>本房間今日排行榜</h2>
        <span className="muted small">今日累計</span>
      </div>

      {loading && rows.length === 0 && <p className="muted">載入中…</p>}
      {error && <p className="muted">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">今天這個房間還沒有人完成學習紀錄，開始計時並儲存就會上榜。</p>
      )}

      {rows.length > 0 && (
        <ol className="leaderboard">
          {rows.map((r, i) => {
            const rank = i + 1;
            const isSelf = r.userId === selfUserId;
            const pct = Math.round((r.sec / maxSec) * 100);
            return (
              <li key={r.userId} className={`lb-row${isSelf ? ' lb-self' : ''}`}>
                <div className="lb-rank">
                  {rank === 1 ? <span className="crown" aria-label="第一名">👑</span> : <span className="lb-num">{rank}</span>}
                </div>
                <div className="lb-main">
                  <div className="lb-top">
                    <span className="lb-name">
                      {nicknames[r.userId] || shortId(r.userId)}
                      {isSelf && <span className="self">（你）</span>}
                    </span>
                    <span className="lb-time">{fmtDuration(r.sec)}</span>
                  </div>
                  <div className="lb-bar-track">
                    <div className="lb-bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
