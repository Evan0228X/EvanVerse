'use client';

import { useEffect, useRef, useState } from 'react';

function fmtHM(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} 小時 ${m} 分鐘`;
  if (m > 0) return `${m} 分鐘`;
  return `${s} 秒`;
}

// 「結束並儲存」後跳出的學習日誌彈窗。
// 筆記由 StudyTimer 的 saveSession 與該次紀錄一起 insert 進 study_sessions（選填，略過時帶空字串 → note 存 null）。
export default function StudyDiaryModal({ subject, durationSec, onSave }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const skipRef = useRef(() => {});

  const finish = async (text) => {
    if (saving) return;
    setSaving(true);
    setError('');
    const ok = await onSave(text);
    setSaving(false);
    if (!ok) setError('儲存失敗，請再試一次。');
  };
  skipRef.current = () => finish('');

  // Esc 等同略過筆記（仍會寫入紀錄）
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') skipRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    finish(note);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={submit}>
        <h2 className="card-title" style={{ marginBottom: 8 }}>學習日誌</h2>
        <p className="muted small" style={{ margin: '0 0 12px' }}>
          記錄一下這段時間學到了什麼（可略過）。
        </p>

        <div className="modal-meta">
          <span className="badge badge-running">{subject || '學習'}</span>
          <span className="badge badge-idle">{fmtHM(durationSec)}</span>
        </div>

        <textarea
          className="modal-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：複習三角函數，卡在倍角公式，明天再練 10 題。"
          maxLength={500}
          disabled={saving}
          autoFocus
        />

        {error && <div className="error-toast" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}

        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '儲存中…' : note.trim() ? '儲存筆記' : '儲存紀錄'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => finish('')} disabled={saving}>
            略過筆記
          </button>
        </div>
      </form>
    </div>
  );
}
