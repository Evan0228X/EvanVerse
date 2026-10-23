'use client';

import { useEffect, useState } from 'react';
import { hasSupabaseEnv } from '@/lib/supabase';
import NicknameGate, { getNickname } from '@/components/NicknameGate';
import HomeStatsCard from '@/components/HomeStatsCard';
import DdayCalendar from '@/components/DdayCalendar';
import AddToHomeHint from '@/components/AddToHomeHint';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [envOk, setEnvOk] = useState(true);

  useEffect(() => {
    setEnvOk(hasSupabaseEnv());
    setNickname(getNickname());
  }, []);

  const enterRoom = (e) => {
    e.preventDefault();
    const id = roomId.trim();
    if (!id) return;
    window.location.href = `/room/${encodeURIComponent(id)}`;
  };

  const randomRoom = () => {
    const id = Math.random().toString(36).slice(2, 8);
    window.location.href = `/room/${id}`;
  };

  if (!envOk) {
    return (
      <div className="container">
        <div className="error">
          缺少 Supabase 環境變數，請檢查 .env.local 是否填入
          NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY，
          並重新啟動 dev server。
        </div>
      </div>
    );
  }

  return (
    <div className="container home" style={{ maxWidth: 640 }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h1 className="title" style={{ margin: 0 }}>EvanVerse</h1>
        <a className="top-action-btn" href="/stats" title="學習統計" aria-label="學習統計">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="M7.5 16v-5M12 16V6.5M16.5 16v-3" />
          </svg>
        </a>
      </div>
      <p className="subtitle">EvanVerse · 多人共學計時器 · 進房間一起專注</p>

      {!nickname && (
        <NicknameGate
          initial={nickname}
          onSave={(n) => setNickname(n)}
        />
      )}

      {nickname && (
        <>
          <HomeStatsCard />
          <div className="card">
            <div className="row between">
              <h2 className="card-title">你的暱稱</h2>
              <button className="btn btn-ghost" onClick={() => setNickname('')}>變更</button>
            </div>
            <div>{nickname}</div>
          </div>
        </>
      )}

      <div className="card">
        <h2 className="card-title">進入房間</h2>
        <form onSubmit={enterRoom} className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="輸入房間號"
            maxLength={32}
          />
          <button type="submit" className="btn btn-primary" disabled={!roomId.trim()}>進入</button>
        </form>
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={randomRoom}>
          隨機開一間
        </button>
        <div className="hint">把房間號碼分享給朋友，或直接複製房間網址。</div>
      </div>

      <AddToHomeHint />

      <DdayCalendar />
    </div>
  );
}
