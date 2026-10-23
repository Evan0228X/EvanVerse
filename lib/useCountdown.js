'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
    setTimeout(() => { try { ctx.close(); } catch {} }, 2000);
  } catch {}
}

export function useCountdown({ onComplete } = {}) {
  const [remainingSec, setRemainingSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(Date.now());

  const endAtRef = useRef(null);
  const runningRef = useRef(false);
  const remainingRef = useRef(0);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { remainingRef.current = remainingSec; }, [remainingSec]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (running && endAtRef.current) {
      const rem = Math.max(0, Math.ceil((endAtRef.current - now) / 1000));
      setRemainingSec(rem);
      if (rem <= 0) {
        setRunning(false);
        runningRef.current = false;
        endAtRef.current = null;
        playChime();
        if (completeRef.current) completeRef.current();
      }
    }
  }, [now, running]);

  const start = useCallback((seconds) => {
    const end = Date.now() + seconds * 1000;
    endAtRef.current = end;
    setRemainingSec(seconds);
    remainingRef.current = seconds;
    setRunning(true);
    runningRef.current = true;
  }, []);

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    const rem = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRunning(false);
    runningRef.current = false;
    setRemainingSec(rem);
    remainingRef.current = rem;
    endAtRef.current = null;
  }, []);

  const resume = useCallback(() => {
    if (runningRef.current) return;
    const rem = remainingRef.current > 0 ? remainingRef.current : 1;
    const end = Date.now() + rem * 1000;
    endAtRef.current = end;
    setRunning(true);
    runningRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    endAtRef.current = null;
    setRemainingSec(0);
    remainingRef.current = 0;
  }, []);

  const setRemaining = useCallback((sec) => {
    setRemainingSec(sec);
    remainingRef.current = sec;
  }, []);

  return {
    remainingSec,
    running,
    start,
    pause,
    resume,
    reset,
    setRemaining,
  };
}
