'use client';

import { useEffect, useRef, useState } from 'react';
import { MOODS, moodParts, moodTone } from '@/components/MoodPicker';

function fmt(sec, status, resumedAt) {
  let s = sec || 0;
  if (status === 'running' && resumedAt) {
    s += Math.floor((Date.now() - resumedAt) / 1000);
  }
  s = Math.max(0, s | 0);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

function toArray(state) {
  if (!state) return [];
  return Object.entries(state).map(([key, arr]) => {
    const meta = arr && arr[0] ? arr[0] : {};
    return { key, ...meta };
  });
}

export default function MemberList({ presenceState, selfUserId }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const members = toArray(presenceState);
  members.sort((a, b) => (b.accumulatedSec || 0) - (a.accumulatedSec || 0));

  // 心情狀態改變時，讓那個狀態閃一下，方便其他人注意到
  const prevMoodRef = useRef({});
  const [flash, setFlash] = useState({});
  const moodSig = members.map((m) => `${m.key}:${m.mood || ''}`).join('|');

  useEffect(() => {
    const prev = prevMoodRef.current;
    const next = {};
    const hits = [];
    members.forEach((m) => {
      const val = m.mood || '';
      next[m.key] = val;
      if (prev[m.key] !== undefined && prev[m.key] !== val) hits.push(m.key);
    });
    prevMoodRef.current = next;
    if (hits.length === 0) return;

    setFlash((s) => {
      const n = { ...s };
      hits.forEach((k) => { n[k] = true; });
      return n;
    });
    const t = setTimeout(() => {
      setFlash((s) => {
        const n = { ...s };
        hits.forEach((k) => { delete n[k]; });
        return n;
      });
    }, 1300);
    return () => clearTimeout(t);
  }, [moodSig]);

  if (members.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">成員</h2>
        <p className="muted">房間裡還沒有其他人，分享連結邀請朋友吧。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">成員（{members.length}）</h2>
      <div className="member-grid">
        {members.map((m) => {
          const isSelf = m.userId === selfUserId || m.key === selfUserId;
          const badgeClass = `badge badge-${m.status || 'idle'}`;
          const badgeText =
            m.status === 'running' ? '📖 專注中' :
            m.status === 'paused' ? '⏸ 暫停' : '💤 空閒';
          const mood = m.mood || MOODS[0];
          const { emoji, text } = moodParts(mood);
          return (
            <div key={m.key} className="member-card">
              <div className="member-name">
                {m.nickname || '匿名'}
                {isSelf && <span className="self">（你）</span>}
              </div>
              <div className="member-subject">{m.subject || '學習'}</div>
              <div className="member-time">{fmt(m.accumulatedSec, m.status, m.resumedAt)}</div>
              <span
                className={`mood-chip${flash[m.key] ? ' mood-flash' : ''}`}
                data-tone={moodTone(mood)}
                title={text}
              >
                <span className="mood-emoji">{emoji}</span>
                <span className="mood-text">{text}</span>
              </span>
              <span className={badgeClass}>{badgeText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
