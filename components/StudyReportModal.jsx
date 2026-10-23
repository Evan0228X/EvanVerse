'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { computeStreak, todayLocalDate } from '@/lib/streak';

// 把 UTC 的 created_at 轉成本地日期字串（凌晨場次才不會被算成前一天）
function localDateStr(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function splitHM(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) };
}

function fmtToday(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  if (s === 0) return '尚未開始';
  const { h, m } = splitHM(s);
  if (h > 0) return `${h}小時${m}分`;
  if (m > 0) return `${m}分`;
  return `${s}秒`;
}

export default function StudyReportModal({ sessions, nickname, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const report = useMemo(() => {
    const today = todayLocalDate();
    // 近 7 天（含今天）的起點
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartMs = weekStart.getTime();

    const days = new Set();
    const subjectSec = {};
    let todaySec = 0;
    let weekSec = 0;

    (sessions || []).forEach((row) => {
      if (!row || !row.created_at) return;
      const ds = localDateStr(row.created_at);
      if (ds) days.add(ds);
      const dur = row.duration || 0;
      const ms = new Date(row.created_at).getTime();
      if (ds === today) todaySec += dur;
      if (!Number.isNaN(ms) && ms >= weekStartMs) {
        weekSec += dur;
        const k = (row.subject || '').trim() || '未分類';
        subjectSec[k] = (subjectSec[k] || 0) + dur;
      }
    });

    const top = Object.entries(subjectSec).sort((a, b) => b[1] - a[1])[0];
    return {
      todaySec,
      weekSec,
      topSubject: top ? top[0] : '—',
      streak: computeStreak([...days]),
    };
  }, [sessions]);

  const hero = splitHM(report.weekSec);
  const now = new Date();
  const dateLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const download = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `evanverse-report-${todayLocalDate()}.png`;
      a.click();
    } catch (e) {
      setError('產生圖片失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="report-overlay" role="dialog" aria-modal="true">
      <div className="report-panel">
        <div className="report-card" ref={cardRef}>
          <div className="report-grid-lines" aria-hidden />

          <div className="report-top">
            <svg
              className="report-mark"
              viewBox="0 0 512 512"
              width="26"
              height="26"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <rect width="512" height="512" rx="112" fill="#4c6ef5" />
              <circle cx="256" cy="256" r="150" fill="none" stroke="#fff" strokeWidth="24" opacity="0.25" />
              <path d="M256 118 L256 256 L346 200" fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="256" cy="256" r="14" fill="#fff" />
              <path d="M196 96 a170 170 0 1 0 120 0" fill="none" stroke="#fbbf24" strokeWidth="18" strokeLinecap="round" />
            </svg>
            <span className="report-brand">EvanVerse</span>
            <span className="report-date">{dateLabel}</span>
          </div>

          <div className="report-hero">
            <div className="report-hero-label">本週總專注</div>
            <div className="report-hero-value">
              {hero.h > 0 ? (
                <>
                  {hero.h}
                  <span className="report-unit">小時</span>
                  {hero.m > 0 ? (
                    <>
                      {hero.m}
                      <span className="report-unit">分</span>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {hero.m}
                  <span className="report-unit">分鐘</span>
                </>
              )}
            </div>
            {nickname ? <div className="report-user">{nickname}</div> : null}
          </div>

          <div className="report-stats">
            <div className="report-stat">
              <div className="report-stat-label">今日專注</div>
              <div className="report-stat-value">{fmtToday(report.todaySec)}</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-label">最專注科目</div>
              <div className="report-stat-value is-subject" title={report.topSubject}>
                {report.topSubject}
              </div>
            </div>
          </div>

          <div className="report-foot">
            <span className="report-streak">
              <span aria-hidden>🔥</span> 連續專注 <b>{report.streak}</b> 天
            </span>
            <span className="report-tag">一起專注，一起變強</span>
          </div>
        </div>

        <div className="report-actions">
          <button className="btn btn-primary" onClick={download} disabled={busy}>
            {busy ? '產生中…' : '下載圖片'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>關閉</button>
        </div>

        {error ? <div className="report-error">{error}</div> : null}
      </div>
    </div>
  );
}
