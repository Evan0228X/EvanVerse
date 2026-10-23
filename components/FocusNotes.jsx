'use client';

import { useCallback, useEffect, useState } from 'react';

const NOTES_KEY = 'co-study-focus-notes';

function loadNotes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export default function FocusNotes() {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const persist = useCallback((next) => {
    setNotes(next);
    saveNotes(next);
  }, []);

  const addNote = (e) => {
    e.preventDefault();
    const v = (input || '').trim();
    if (!v) return;
    const note = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: v,
      done: false,
      ts: Date.now(),
    };
    persist([note, ...loadNotes()]);
    setInput('');
  };

  const toggleDone = (id) => {
    persist(loadNotes().map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  };

  const removeNote = (id) => {
    persist(loadNotes().filter((n) => n.id !== id));
  };

  return (
    <div className="card notes-card">
      <h2 className="card-title">專注筆記</h2>
      <form onSubmit={addNote} className="task-add-row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="快速記下想法…"
          maxLength={120}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim()}>記錄</button>
      </form>

      {notes.length === 0 ? (
        <div className="task-empty">還沒有筆記。</div>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n.id} className={`note-item${n.done ? ' is-done' : ''}`}>
              <span
                className={`task-check${n.done ? ' done' : ''}`}
                onClick={() => toggleDone(n.id)}
              >
                {n.done ? '✓' : ''}
              </span>
              <span className={`note-text${n.done ? ' done' : ''}`}>{n.text}</span>
              <button className="task-del" onClick={() => removeNote(n.id)} aria-label="刪除筆記">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
