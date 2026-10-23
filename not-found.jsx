// Cloudflare Pages 需要「全站路由都跑在 Edge Runtime」。
// 這個檔案用來取代 Next.js 自動產生的 Node.js /_not-found 路由。
export const runtime = 'edge';

export default function NotFound() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h1 className="title" style={{ marginTop: 0 }}>找不到頁面</h1>
        <p className="subtitle" style={{ marginBottom: 20 }}>
          這個頁面不存在，或連結已經失效了。
        </p>
        <a className="btn" href="/">回到首頁</a>
      </div>
    </div>
  );
}
