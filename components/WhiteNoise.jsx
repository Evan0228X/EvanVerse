'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SOUNDS = [
  { id: 'rain', label: '雨聲', icon: '🌧️', type: 'lowpass', freq: 1200, q: 0.7 },
  { id: 'cafe', label: '咖啡廳', icon: '☕', type: 'bandpass', freq: 500, q: 0.5 },
  { id: 'fire', label: '營火', icon: '🔥', type: 'lowpass', freq: 800, q: 1.2 },
];

export default function WhiteNoise() {
  const [active, setActive] = useState(null);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef(null);
  const gainRef = useRef(null);
  const nodesRef = useRef(null);

  const stop = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes) {
      try { nodes.source.stop(); } catch {}
      try { nodes.lfo.stop(); } catch {}
      nodesRef.current = null;
    }
    setActive(null);
  }, []);

  const start = useCallback((sound) => {
    if (audioRef.current && active === sound.id) {
      stop();
      return;
    }
    if (nodesRef.current) {
      stop();
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioRef.current) {
      audioRef.current = new AC();
    }
    const ctx = audioRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = sound.type;
    filter.frequency.value = sound.freq;
    filter.Q.value = sound.q;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Slow LFO on filter frequency for organic movement
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = sound.freq * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.start();
    lfo.start();

    nodesRef.current = { source, filter, gain, lfo, lfoGain };
    gainRef.current = gain;
    setActive(sound.id);
  }, [active, volume, stop]);

  useEffect(() => {
    if (gainRef.current && audioRef.current) {
      gainRef.current.gain.setTargetAtTime(volume, audioRef.current.currentTime, 0.1);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      const nodes = nodesRef.current;
      if (nodes) {
        try { nodes.source.stop(); } catch {}
        try { nodes.lfo.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className="card noise-card">
      <h2 className="card-title">白噪音</h2>
      <div className="noise-btns">
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            className={`noise-btn${active === s.id ? ' is-active' : ''}`}
            onClick={() => start(s)}
          >
            <span className="noise-icon">{s.icon}</span>
            <span className="noise-label">{s.label}</span>
          </button>
        ))}
      </div>
      {active && (
        <div className="noise-volume">
          <span className="muted small">音量</span>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="noise-slider"
          />
          <button className="btn btn-ghost noise-stop" onClick={stop}>停止</button>
        </div>
      )}
      <div className="hint">點擊按鈕播放白噪音，再點擊一次關閉。完全由瀏覽器合成，無需下載音檔。</div>
    </div>
  );
}
