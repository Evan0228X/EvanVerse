import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = {
  title: 'EvanVerse - 多人共學計時器',
  description: 'EvanVerse — 一起專注、一起計時。多人共學的輕量計時器。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'EvanVerse',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050810',
};

const swScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`;

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('co-study-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body>
        <div className="theme-toggle-wrap">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
