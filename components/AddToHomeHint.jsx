'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'co-study-pwa-hint-dismissed';

export default function AddToHomeHint() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    setIsIOS(ios);
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pwa-hint">
      <div className="pwa-hint-inner">
        <div className="pwa-hint-icon" aria-hidden>
          {isIOS ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v14" />
              <path d="m6 10 6 6 6-6" />
              <path d="M5 21h14" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
          )}
        </div>
        <div className="pwa-hint-text">
          <div className="pwa-hint-title">加到主畫面，像 App 一樣使用</div>
          <div className="pwa-hint-desc">
            {isIOS
              ? '點擊下方分享按鈕，選擇「加入主畫面」。'
              : '點擊瀏覽器選單，選擇「加到主畫面」。'}
          </div>
        </div>
        <button className="pwa-hint-close" onClick={dismiss} aria-label="關閉提示">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
