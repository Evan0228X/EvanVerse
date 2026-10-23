'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer() {
  const [status, setStatus] = useState('idle');
  const [accumulatedSec, setAccumulatedSec] = useState(0);
  const [resumedAt, setResumedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const resumedAtRef = useRef(null);
  const statusRef = useRef('idle');
  const accumulatedRef = useRef(0);

  useEffect(() => {
    resumedAtRef.current = resumedAt;
  }, [resumedAt]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    accumulatedRef.current = accumulatedSec;
  }, [accumulatedSec]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedSec =
    status === 'running' && resumedAt
      ? accumulatedSec + Math.floor((now - resumedAt) / 1000)
      : accumulatedSec;

  const start = useCallback(() => {
    setAccumulatedSec(0);
    accumulatedRef.current = 0;
    setResumedAt(Date.now());
    resumedAtRef.current = Date.now();
    setStatus('running');
    statusRef.current = 'running';
  }, []);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running' || resumedAtRef.current == null) return;
    const add = Math.floor((Date.now() - resumedAtRef.current) / 1000);
    const next = accumulatedRef.current + add;
    accumulatedRef.current = next;
    setAccumulatedSec(next);
    setResumedAt(null);
    resumedAtRef.current = null;
    setStatus('paused');
    statusRef.current = 'paused';
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    setResumedAt(Date.now());
    resumedAtRef.current = Date.now();
    setStatus('running');
    statusRef.current = 'running';
  }, []);

  const finish = useCallback(() => {
    let total = accumulatedRef.current;
    if (statusRef.current === 'running' && resumedAtRef.current != null) {
      total += Math.floor((Date.now() - resumedAtRef.current) / 1000);
    }
    setAccumulatedSec(0);
    accumulatedRef.current = 0;
    setResumedAt(null);
    resumedAtRef.current = null;
    setStatus('idle');
    statusRef.current = 'idle';
    return total;
  }, []);

  return {
    status,
    accumulatedSec,
    resumedAt,
    elapsedSec,
    start,
    pause,
    resume,
    finish,
  };
}
