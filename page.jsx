'use client';

export const runtime = 'edge';

import { useEffect, useRef, useState } from 'react';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { useStreak } from '@/lib/streak';
import { getNickname, getUserId } from '@/components/NicknameGate';
import StudyTimer from '@/components/StudyTimer';
import MemberList from '@/components/MemberList';
import RoomLeaderboard from '@/components/RoomLeaderboard';
import StreakBadge, { StreakHint } from '@/components/StreakBadge';
import TaskPanel, { useActiveTask, saveActiveTaskId } from '@/components/TaskPanel';
import WhiteNoise from '@/components/WhiteNoise';
import FocusNotes from '@/components/FocusNotes';
import { MOODS } from '@/components/MoodPicker';

export default function RoomPage({ params }) {
  const roomId = decodeURIComponent(params.id);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [envOk, setEnvOk] = useState(true);
  const [presenceState, setPresenceState] = useState({});
  const [conn, setConn] = useState('連線中…');
  const [copied, setCopied] = useState('');
  const [linkText, setLinkText] = useState('');

  const channelRef = useRef(null);
  const task = useActiveTask();
  // presence 更新時（例如自己剛結束並儲存）重新查詢連續天數
  const { streak, startedToday, loading: streakLoading } = useStreak(userId, presenceState);

  useEffect(() => {
    setEnvOk(hasSupabaseEnv());
    setUserId(getUserId());
    setNickname(getNickname());
  }, []);

  useEffect(() => {
    if (!userId || !nickname) return;
    const sb = supabase();
    const ch = sb.channel(`room:${roomId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      setPresenceState(ch.presenceState());
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConn('已連線');
        await ch.track({
          userId,
          nickname,
          mood: MOODS[0],
          subject: '學習',
          status: 'idle',
          accumulatedSec: 0,
          resumedAt: null,
          todaySec: 0,
          updatedAt: Date.now(),
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('連線異常');
      } else if (status === 'CLOSED') {
        setConn('已關閉');
      }
    });

    const onUnload = () => { try { ch.untrack(); } catch {} };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      try { sb.removeChannel(ch); } catch {}
      channelRef.current = null;
    };
  }, [userId, nickname, roomId]);

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('已複製');
      setLinkText('');
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
      setLinkText(url);
    }
  };

  const leave = () => {
    const sb = supabase();
    if (channelRef.current) {
      try { sb.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    window.location.href = '/';
  };

  const clearActiveTask = () => {
    task.setActive(task.activeId);
  };

  if (!envOk) {
    return (
      <div className="container">
        <div className="error">
          缺少 Supabase 環境變數，請檢查 .env.local。
        </div>
      </div>
    );
  }

  if (!userId) {
    return <div className="container"><div className="subtitle">連線中…</div></div>;
  }

  if (!nickname) {
    return (
      <div className="container">
        <h1 className="title">房間：{roomId}</h1>
        <div className="card">
          <h2 className="card-title">先取個暱稱</h2>
          <p className="muted">請回到首頁設定暱稱後再進入房間。</p>
          <a className="btn btn-primary" href="/" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>回首頁</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 className="title" style={{ margin: 0 }}>房間：{roomId}</h1>
        <button className="top-action-btn" onClick={leave} title="離開房間" aria-label="離開房間">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="M10 17l-5-5 5-5" />
            <path d="M5 12h11" />
          </svg>
        </button>
      </div>

      <div className="streak-wrap">
        <StreakBadge streak={streak} loading={streakLoading} />
        {!streakLoading && <StreakHint streak={streak} startedToday={startedToday} />}
      </div>

      <div className="room-layout">
        <div className="room-main">
          <div className="card">
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-primary" onClick={copyLink}>複製邀請連結</button>
              {copied && <span className="badge badge-running">{copied}</span>}
            </div>
            {linkText && (
              <>
                <div className="hint">複製失敗，請手動複製下方網址：</div>
                <div className="link-box">{linkText}</div>
              </>
            )}
          </div>

          <StudyTimer
            userId={userId}
            roomId={roomId}
            nickname={nickname}
            channelRef={channelRef}
            activeTask={task.activeTask}
            onClearActiveTask={clearActiveTask}
          />

          <WhiteNoise />

          <MemberList presenceState={presenceState} selfUserId={userId} />

          <RoomLeaderboard
            roomId={roomId}
            selfUserId={userId}
            nickname={nickname}
            presenceState={presenceState}
          />
        </div>

        <div className="room-side">
          <TaskPanel
            tasks={task.tasks}
            activeId={task.activeId}
            addTask={task.addTask}
            toggleDone={task.toggleDone}
            removeTask={task.removeTask}
            setActive={task.setActive}
          />
          <FocusNotes />
        </div>
      </div>

      <div className="conn">Realtime：{conn}</div>
    </div>
  );
}

export const runtime = 'edge';
