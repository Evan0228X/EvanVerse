'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimer } from '@/lib/useTimer';
import { useCountdown, playChime } from '@/lib/useCountdown';
import { supabase } from '@/lib/supabase';
import { fetchTodaySeconds } from '@/lib/streak';
import StudyDiaryModal from '@/components/StudyDiaryModal';
import MoodPicker, { MOODS } from '@/components/MoodPicker';

function fmt(sec) {
  const s = Math.max(0, sec | 0);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

const RING_C = 2 * Math.PI * 92;

const SUBJECTS = ['國文', '英文', '數學', '自然', '社會', '程式設計', '閱讀', '其他'];

const MODES = [
  { id: 'stopwatch', label: '正計時', minutes: 0, color: '#22d3ee', color2: '#0891b2', gradId: 'gradStop', status: 'running' },
  { id: 'focus', label: '專注', minutes: 25, color: '#a855f7', color2: '#7c3aed', gradId: 'gradFocus', status: 'running' },
  { id: 'shortBreak', label: '休息', minutes: 5, color: '#34d399', color2: '#059669', gradId: 'gradShort', status: 'break' },
];

function getMode(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

export default function StudyTimer({ userId, roomId, nickname, onTrack, channelRef, activeTask, onClearActiveTask }) {
  const t = useTimer();
  const [subject, setSubject] = useState('國文');
  const [customSubject, setCustomSubject] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedToast, setSavedToast] = useState('');
  const [todayBaseSec, setTodayBaseSec] = useState(0);
  const [modeId, setModeId] = useState('stopwatch');
  const [fullscreen, setFullscreen] = useState(false);
  const [diary, setDiary] = useState(null);
  const [mood, setMood] = useState(MOODS[0]);
  const moodRef = useRef(MOODS[0]);
  const subjectRef = useRef('國文');
  const modeIdRef = useRef('stopwatch');
  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { modeIdRef.current = modeId; }, [modeId]);

  const mode = getMode(modeId);
  const isStopwatch = modeId === 'stopwatch';
  const countdownSec = mode.minutes * 60;

  const countdown = useCountdown({
    onComplete: () => {
      if (modeIdRef.current === 'focus') {
        const total = countdownSec;
        setTodayBaseSec((b) => b + total);
        saveSession(total).then((ok) => { if (ok) showSavedToast(total); });
        track({ status: 'idle', accumulatedSec: 0, resumedAt: null, todaySec: todayBaseSec + total });
      } else {
        track({ status: 'idle', accumulatedSec: 0, resumedAt: null });
      }
    },
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const s = await fetchTodaySeconds(userId);
      if (active) setTodayBaseSec(s);
    })();
    return () => { active = false; };
  }, [userId]);

  const liveTodaySec = () => {
    let s = todayBaseSec;
    if (isStopwatch) {
      if (t.status === 'running' && t.resumedAt) {
        s += Math.floor((Date.now() - t.resumedAt) / 1000);
      }
      return s + t.accumulatedSec;
    }
    if (modeId === 'focus' && countdown.running) {
      s += countdownSec - countdown.remainingSec;
    }
    return s;
  };

  const track = (over) => {
    const ch = channelRef.current;
    if (!ch || !userId) return;
    const currentMode = getMode(modeIdRef.current);
    const inferredStatus = isStopwatch
      ? t.status
      : countdown.running
        ? (currentMode.status === 'break' ? 'break' : 'running')
        : 'idle';
    const base = {
      userId,
      nickname,
      // 心情狀態：讓房間其他人即時看到
      mood: moodRef.current,
      subject: subjectRef.current,
      status: over?.status ?? inferredStatus,
      accumulatedSec: over?.accumulatedSec ?? (isStopwatch ? t.accumulatedSec : 0),
      // 未指定時沿用目前計時的 resumedAt，避免只更新心情時把其他人的即時跳秒弄壞
      resumedAt: over?.resumedAt !== undefined ? over.resumedAt : (isStopwatch ? t.resumedAt : null),
      todaySec: over?.todaySec ?? liveTodaySec(),
      updatedAt: Date.now(),
    };
    ch.track(base).catch(() => {});
    if (onTrack) onTrack();
  };

  const showErrorToast = useCallback((msg) => {
    setSaveError(msg);
    setTimeout(() => setSaveError(''), 5000);
  }, []);

  const saveSession = useCallback(async (totalSec, note = '') => {
    if (!userId || totalSec <= 0) return null;
    const text = typeof note === 'string' ? note.trim() : '';
    const insertPayload = {
      user_id: userId,
      subject: subjectRef.current,
      duration: totalSec,
      room_id: roomId,
      // 學習日誌為選填：沒寫就存 null，不會因為空字串而報錯
      note: text ? text : null,
    };
    console.log('[EvanVerse] saveSession start', { url: process.env.NEXT_PUBLIC_SUPABASE_URL, payload: insertPayload });
    try {
      const { data, error } = await supabase()
        .from('study_sessions')
        .insert(insertPayload)
        .select('id')
        .maybeSingle();
      console.log('[EvanVerse] saveSession result', { data, error });
      if (error) {
        console.error('[EvanVerse] saveSession FAILED', error);
        showErrorToast('儲存失敗，請檢查網路連線：' + error.message);
        return null;
      }
      console.log('[EvanVerse] saveSession OK, inserted id:', data?.id);
      return true;
    } catch (e) {
      console.error('[EvanVerse] saveSession EXCEPTION', e);
      showErrorToast('儲存失敗，請檢查網路連線：' + (e?.message || String(e)));
      return null;
    }
  }, [userId, roomId, showErrorToast]);

  const showSavedToast = useCallback((totalSec) => {
    setSavedToast(`已儲存紀錄：${fmt(totalSec)}`);
    setTimeout(() => setSavedToast(''), 3000);
  }, []);

  // stopwatch handlers
  const doStart = () => { t.start(); track({ status: 'running', accumulatedSec: 0, resumedAt: Date.now() }); };
  const doPause = () => {
    const add = t.resumedAt ? Math.floor((Date.now() - t.resumedAt) / 1000) : 0;
    const nextAcc = t.accumulatedSec + add;
    t.pause();
    track({ status: 'paused', accumulatedSec: nextAcc, resumedAt: null });
  };
  const doResume = () => { t.resume(); track({ status: 'running', resumedAt: Date.now() }); };
  const doFinish = () => {
    const total = t.finish();
    const newBase = todayBaseSec + total;
    setTodayBaseSec(newBase);
    track({ status: 'idle', accumulatedSec: 0, resumedAt: null, todaySec: newBase });
    if (total > 0) {
      // 先開學習日誌彈窗，筆記會跟這次紀錄一起 insert（略過則 note 為 null）
      setDiary({ subject: subjectRef.current, durationSec: total });
    }
  };

  // 由日誌彈窗呼叫：note 為空字串代表略過筆記
  const submitDiary = useCallback(async (note) => {
    if (!diary) return false;
    const ok = await saveSession(diary.durationSec, note);
    if (!ok) return false;
    showSavedToast(diary.durationSec);
    setDiary(null);
    return true;
  }, [diary, saveSession, showSavedToast]);

  // countdown handlers
  const cdStart = () => {
    if (countdownSec <= 0) return;
    countdown.start(countdownSec);
    track({ status: mode.status === 'break' ? 'break' : 'running', accumulatedSec: 0, resumedAt: Date.now() });
  };
  const cdPause = () => { countdown.pause(); track({ status: 'paused' }); };
  const cdResume = () => { countdown.resume(); track({ status: mode.status === 'break' ? 'break' : 'running' }); };
  const cdReset = () => { countdown.reset(); track({ status: 'idle', accumulatedSec: 0, resumedAt: null }); };

  const onSubjectChange = (v) => {
    setSubject(v);
    subjectRef.current = v;
    if (v !== '其他') setCustomSubject('');
    track({ status: isStopwatch ? t.status : 'idle' });
  };

  const onCustomSubjectChange = (v) => {
    setCustomSubject(v);
    subjectRef.current = v;
    track({ status: isStopwatch ? t.status : 'idle' });
  };

  // 換心情：先更新 ref 再立刻廣播一次，達到秒級即時同步
  const onMoodChange = (v) => {
    setMood(v);
    moodRef.current = v;
    track({});
  };

  const switchMode = (newId) => {
    if (newId === modeId) return;

    if (isStopwatch && t.status !== 'idle') {
      if (!confirm('切換模式會結束目前計時，確定嗎？')) return;
      const total = t.finish();
      if (total > 0) { saveSession(total).then((ok) => { if (ok) showSavedToast(total); }); }
    }
    if (!isStopwatch && (countdown.running || countdown.remainingSec > 0)) {
      if (countdown.remainingSec > 0 && countdown.remainingSec < countdownSec) {
        if (!confirm('切換模式會結束目前計時，確定嗎？')) return;
        if (modeId === 'focus') {
          const elapsed = countdownSec - countdown.remainingSec;
          if (elapsed > 0) { saveSession(elapsed).then((ok) => { if (ok) showSavedToast(elapsed); }); }
        }
      }
      countdown.reset();
    }

    setModeId(newId);
    modeIdRef.current = newId;
    track({ status: 'idle', accumulatedSec: 0, resumedAt: null });
  };

  useEffect(() => {
    if (!fullscreen) return;
    // 日誌彈窗開啟時，Esc 交給彈窗處理（略過筆記），不要連全螢幕一起關掉
    const onKey = (e) => { if (e.key === 'Escape' && !diary) setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, diary]);

  const isRunning = isStopwatch ? t.status === 'running' : countdown.running;
  const isPaused = isStopwatch ? t.status === 'paused' : (!countdown.running && countdown.remainingSec > 0 && countdown.remainingSec < countdownSec);
  const isActive = isStopwatch ? t.status !== 'idle' : (countdown.running || countdown.remainingSec > 0);

  const badgeText = isRunning
    ? (mode.status === 'break' ? '☕ 休息' : '📖 專注中')
    : isPaused ? '⏸ 暫停' : '💤 空閒';
  const badgeClass = `badge badge-${isRunning ? (mode.status === 'break' ? 'paused' : 'running') : isPaused ? 'paused' : 'idle'}`;

  const displaySec = isStopwatch ? t.elapsedSec : countdown.remainingSec;
  const ringProgress = !isStopwatch && countdownSec > 0
    ? ((countdownSec - countdown.remainingSec) / countdownSec) * 100
    : isStopwatch && t.elapsedSec > 0
      ? ((t.elapsedSec % 3600) / 3600) * 100
      : 0;

  const taskLabel = activeTask ? activeTask.name : (subject === '其他' ? (customSubject || '其他') : subject);
  const ringGradUrl = `url(#${mode.gradId})`;
  const ringGlow = `${mode.color}55`;
  const subjectDisabled = isStopwatch ? t.status !== 'idle' : isActive;

  const renderGradients = () => (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        {MODES.map((m) => (
          <linearGradient key={m.gradId} id={m.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={m.color} />
            <stop offset="100%" stopColor={m.color2} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );

  const renderControls = (isFocus = false) => {
    const cls = isFocus ? ' focus-btn' : '';
    if (isStopwatch) {
      return (
        <>
          {t.status === 'idle' && <button className={`btn btn-primary${cls}`} onClick={doStart}>開始</button>}
          {t.status === 'running' && (
            <>
              <button className={`btn btn-warn${cls}`} onClick={doPause}>暫停</button>
              <button className={`btn btn-save${cls}`} onClick={doFinish}>結束並儲存</button>
            </>
          )}
          {t.status === 'paused' && (
            <>
              <button className={`btn btn-primary${cls}`} onClick={doResume}>繼續</button>
              <button className={`btn btn-save${cls}`} onClick={doFinish}>結束並儲存</button>
            </>
          )}
        </>
      );
    }
    return (
      <>
        {!isActive && <button className={`btn btn-primary${cls}`} onClick={cdStart}>開始</button>}
        {countdown.running && <button className={`btn btn-warn${cls}`} onClick={cdPause}>暫停</button>}
        {isPaused && <button className={`btn btn-primary${cls}`} onClick={cdResume}>繼續</button>}
        {isActive && <button className={`btn btn-ghost${cls}`} onClick={cdReset}>重置</button>}
      </>
    );
  };

  const renderModeTabs = (isFocus = false) => (
    <div className={`mode-tabs${isFocus ? ' mode-tabs-focus' : ''}`}>
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-tab2${modeId === m.id ? ' active' : ''}`}
          data-mode={m.id}
          onClick={() => switchMode(m.id)}
        >
          {m.label}
          {m.minutes > 0 && <span className="mode-min">{m.minutes}分</span>}
        </button>
      ))}
    </div>
  );

  const renderSubjectPicker = () => (
    <div className="subject-picker">
      <label className="muted small">科目</label>
      <div className="subject-row">
        <select
          className="input subject-select"
          value={subject}
          disabled={subjectDisabled}
          onChange={(e) => onSubjectChange(e.target.value)}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {subject === '其他' && (
          <input
            className="input subject-custom"
            value={customSubject}
            disabled={subjectDisabled}
            onChange={(e) => onCustomSubjectChange(e.target.value)}
            maxLength={20}
            placeholder="輸入科目名稱"
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {renderGradients()}
      <div className="card timer-card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 className="card-title" style={{ margin: 0 }}>計時器</h2>
          <div className="row" style={{ gap: 8 }}>
            <span className={badgeClass}>{badgeText}</span>
            <button
              className="icon-btn"
              title="全螢幕專注模式"
              onClick={() => setFullscreen(true)}
              aria-label="全螢幕專注模式"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </button>
          </div>
        </div>

        {renderModeTabs()}

        {renderSubjectPicker()}

        <MoodPicker value={mood} onChange={onMoodChange} />

        <div className="current-task-wrap" style={{ marginTop: 12 }}>
          {activeTask ? (
            <span className="current-task" title={activeTask.name}>
              <span className="ct-label">目前任務：</span>
              <span className="ct-name">{activeTask.name}</span>
              <button className="link-btn" style={{ marginLeft: 4 }} onClick={onClearActiveTask}>取消</button>
            </span>
          ) : (
            <span className="current-task" style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
              <span className="ct-label">目前任務：</span>
              <span className="ct-name">{subject === '其他' ? (customSubject || '其他') : subject}</span>
            </span>
          )}
        </div>

        {!isStopwatch && (
          <div className="pomo-phase-label">
            {mode.label} · {mode.minutes} 分鐘
          </div>
        )}

        <div className="pomo-ring-wrap">
          <svg className="pomo-ring" width="220" height="220" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(56,78,110,0.3)" strokeWidth="10" />
            <circle
              cx="100" cy="100" r="92" fill="none"
              stroke={isStopwatch ? mode.color : ringGradUrl}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${RING_C * ringProgress / 100} ${RING_C}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dasharray .3s ease', filter: `drop-shadow(0 0 6px ${ringGlow})` }}
            />
          </svg>
          <div className="pomo-ring-center">
            <div className="timer">{fmt(displaySec)}</div>
          </div>
        </div>

        {saveError && <div className="error-toast">{saveError}</div>}
        {savedToast && <div className="saved-toast">{savedToast}</div>}

        <div className="btn-row">
          {renderControls()}
        </div>
      </div>

      {fullscreen && (
        <div className="focus-overlay" role="dialog" aria-modal="true">
          {renderModeTabs(true)}

          {!isStopwatch && (
            <div className={`focus-phase ${mode.status === 'break' ? 'is-break' : 'is-focus'}`}>
              {mode.label}時間
            </div>
          )}

          <div className="focus-subject">{taskLabel}</div>

          <div className="focus-timer">{fmt(displaySec)}</div>

          <div className="focus-progress-track">
            <div
              className="focus-progress-bar"
              style={{
                width: `${ringProgress}%`,
                background: `linear-gradient(90deg, ${mode.color}, ${mode.color2})`,
              }}
            />
          </div>

          {savedToast && <div className="saved-toast saved-toast-light">{savedToast}</div>}
          {saveError && <div className="error-toast error-toast-light">{saveError}</div>}

          <div className="focus-controls">
            {renderControls(true)}
          </div>

          <button
            className="focus-exit"
            onClick={() => setFullscreen(false)}
            title="退出全螢幕（Esc）"
            aria-label="退出全螢幕"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
            </svg>
            退出全螢幕
          </button>
        </div>
      )}

      {diary && (
        <StudyDiaryModal
          subject={diary.subject}
          durationSec={diary.durationSec}
          onSave={submitDiary}
        />
      )}
    </>
  );
}
