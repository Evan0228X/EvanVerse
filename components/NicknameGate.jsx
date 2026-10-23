'use client';

import { useState } from 'react';

const NICKNAME_KEY = 'co-study-nickname';
const USERID_KEY = 'co-study-userid';

export function getNickname() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(name) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NICKNAME_KEY, name);
}

export function getUserId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(USERID_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    localStorage.setItem(USERID_KEY, id);
  }
  return id;
}

export default function NicknameGate({ initial, onSave }) {
  const [value, setValue] = useState(initial || '');

  const submit = (e) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setNickname(v);
    onSave(v);
  };

  return (
    <div className="card">
      <h2 className="card-title">取個暱稱</h2>
      <p className="muted">只存在你的瀏覽器，不用註冊。</p>
      <form onSubmit={submit} className="row">
        <input
          className="input"
          style={{ flex: 1 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="例如：小明"
          maxLength={16}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
          進入
        </button>
      </form>
    </div>
  );
}
