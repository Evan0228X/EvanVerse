'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MAX_DDAYS,
  daysUntil,
  fmtDateShort,
  loadDDays,
  saveDDays,
  toDateStr,
} from '@/lib/dday';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// 倒數目標文字，例如：距離 學測 還有 100 天
function remainText(name, days) {
  if (days === null) return `目標日期有誤：${name}`;
  if (days === 0) return `距離 ${name} 就是今天！`;
  if (days > 0) return `距離 ${name} 還有 ${days} 天`;
  return `${name} 已過 ${Math.abs(days)} 天`;
}

export default function DdayCalendar() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);

  // 載入 localStorage（不發任何網路請求）
  useEffect(() => {
    setItems(loadDDays());
    setLoaded(true);
  }, []);

  // 資料變動就寫回 localStorage；載入完成前不用空陣列覆蓋既有資料
  useEffect(() => {
    if (!loaded) return;
    saveDDays(items);
  }, [items, loaded]);

  useEffect(() => {
    if (!draft) return;
    const onKey = (e) => { if (e.key === 'Escape') setDraft(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft]);

  const todayStr = toDateStr();

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  // 當月格子（週日為第一欄）
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out = new Array(first.getDay()).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(toDateStr(new Date(cursor.y, cursor.m, d)));
    }
    return out;
  }, [cursor]);

  const targetDates = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      if (!map.has(it.date)) map.set(it.date, []);
      map.get(it.date).push(it);
    });
    return map;
  }, [items]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.date.localeCompare(b.date)),
    [items]
  );

  const shiftMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const openAdd = (dateStr) => {
    if (items.length >= MAX_DDAYS) {
      flash('最多只能設定 3 個倒數目標喔！');
      return;
    }
    setDraft({ name: '', date: dateStr });
  };

  const submitDraft = (e) => {
    e.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    if (!name || !draft.date) return;
    if (items.length >= MAX_DDAYS) {
      setDraft(null);
      flash('最多只能設定 3 個倒數目標喔！');
      return;
    }
    setItems((prev) => [...prev, { id: makeId(), name, date: draft.date }]);
    setDraft(null);
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  return (
    <div className="card dday-card">
      <button
        type="button"
        className="dday-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="dday-title">倒數行事曆</span>
        <span className="dday-toggle-right">
          <span className="muted small">{items.length} / {MAX_DDAYS}</span>
          <span className={`dday-chevron${open ? ' is-open' : ''}`}>▾</span>
        </span>
      </button>

      {open && (
      <>
      <div className="dday-cal-head">
        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="上個月">‹</button>
        <div className="dday-month">{cursor.y} 年 {cursor.m + 1} 月</div>
        <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="下個月">›</button>
      </div>

      <div className="dday-grid dday-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="dday-grid">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e${i}`} className="dday-cell is-empty" />;
          const has = targetDates.has(dateStr);
          const cls = [
            'dday-cell',
            dateStr === todayStr ? 'is-today' : '',
            has ? 'has-target' : '',
          ].filter(Boolean).join(' ');
          const names = has ? targetDates.get(dateStr).map((it) => it.name).join('、') : '';
          return (
            <button
              key={dateStr}
              className={cls}
              onClick={() => openAdd(dateStr)}
              title={has ? `${fmtDateShort(dateStr)} ${names}` : `點此設定 ${fmtDateShort(dateStr)} 的倒數目標`}
            >
              <span className="dday-day">{Number(dateStr.slice(8, 10))}</span>
              {has && <span className="dday-dot" />}
            </button>
          );
        })}
      </div>

      {notice && <div className="dday-notice">{notice}</div>}

      <div className="dday-list">
        {sorted.length === 0 ? (
          <div className="muted small">點選日曆上的日期，設定你的第一個倒數目標（最多 {MAX_DDAYS} 個）。</div>
        ) : (
          sorted.map((it) => {
            const days = daysUntil(it.date);
            return (
              <div key={it.id} className={`dday-item${days === 0 ? ' is-today' : ''}`}>
                <span className="dday-item-date">{fmtDateShort(it.date)}</span>
                <span className={`dday-remain${days === 0 ? ' is-today' : days < 0 ? ' is-past' : ''}`}>
                  {remainText(it.name, days)}
                </span>
                <button
                  className="dday-del"
                  onClick={() => removeItem(it.id)}
                  title="刪除這個倒數目標"
                  aria-label={`刪除 ${it.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {draft && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={submitDraft}>
            <h2 className="card-title" style={{ marginBottom: 8 }}>新增倒數目標</h2>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              目標日期：{draft.date}（還可新增 {Math.max(0, MAX_DDAYS - items.length)} 個）
            </p>

            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="事件名稱，例如：學測、多益"
              maxLength={20}
              autoFocus
            />

            <div style={{ marginTop: 10 }}>
              <input
                className="input"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn btn-primary" disabled={!draft.name.trim() || !draft.date}>
                儲存倒數目標
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>取消</button>
            </div>
          </form>
        </div>
      )}
      </>
      )}
    </div>
  );
}
