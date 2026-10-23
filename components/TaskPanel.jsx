'use client';

import { useCallback, useEffect, useState } from 'react';

const TASKS_KEY = 'co-study-tasks';
const ACTIVE_KEY = 'co-study-active-task';

export function loadTasks() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadActiveTaskId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function saveActiveTaskId(id) {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function useActiveTask() {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    setTasks(loadTasks());
    setActiveId(loadActiveTaskId());
  }, []);

  const persist = useCallback((next) => {
    setTasks(next);
    saveTasks(next);
  }, []);

  const addTask = useCallback((name) => {
    const v = (name || '').trim();
    if (!v) return;
    const task = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: v, done: false };
    const next = [task, ...loadTasks()];
    persist(next);
  }, [persist]);

  const toggleDone = useCallback((id) => {
    const next = loadTasks().map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    persist(next);
  }, [persist]);

  const removeTask = useCallback((id) => {
    const next = loadTasks().filter((t) => t.id !== id);
    persist(next);
    if (id === loadActiveTaskId()) {
      setActiveId(null);
      saveActiveTaskId(null);
    }
  }, [persist]);

  const setActive = useCallback((id) => {
    const next = id === activeId ? null : id;
    setActiveId(next);
    saveActiveTaskId(next);
  }, [activeId]);

  const activeTask = tasks.find((t) => t.id === activeId) || null;

  return { tasks, activeId, activeTask, addTask, toggleDone, removeTask, setActive };
}

export default function TaskPanel({ tasks, activeId, addTask, toggleDone, removeTask, setActive }) {
  const [input, setInput] = useState('');

  const submit = (e) => {
    e.preventDefault();
    addTask(input);
    setInput('');
  };

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="card task-panel">
      <div className="row between">
        <h2 className="card-title" style={{ margin: 0 }}>任務清單</h2>
        <span className="task-count">{remaining} 項未完成</span>
      </div>

      <form onSubmit={submit} className="task-add-row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="新增任務…"
          maxLength={40}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim()}>加入</button>
      </form>

      {tasks.length === 0 ? (
        <div className="task-empty">還沒有任務，新增一個開始專注吧。</div>
      ) : (
        <ul className="task-list">
          {tasks.map((t) => {
            const isActive = t.id === activeId;
            return (
              <li
                key={t.id}
                className={`task-item${isActive ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span
                  className={`task-check${t.done ? ' done' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDone(t.id); }}
                >
                  {t.done ? '✓' : ''}
                </span>
                <span className={`task-name${t.done ? ' done' : ''}`}>{t.name}</span>
                {isActive && <span className="task-active-dot" title="當前任務" />}
                <button
                  className="task-del"
                  onClick={(e) => { e.stopPropagation(); removeTask(t.id); }}
                  aria-label="刪除任務"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="hint">點擊任務設為「當前任務」，勾選方塊標記完成。</div>
    </div>
  );
}
