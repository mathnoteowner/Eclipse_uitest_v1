import type { NextConfig } from "next";

// GitHub Pages のプロジェクトサイトはサブパス（/<repo>/）配信のため basePath が必要。
// CIが BASE_PATH=/<repo> を渡す。未設定時（Netlify/Vercel/ローカル）はルート配信。
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  // プロトタイプは完全クライアントサイド（API/サーバー処理なし）。
  // 静的サイトとして書き出し、任意の静的ホストに配布できるようにする。
  // ※ Phase G でサーバーAPI（NER中継等）を追加する際にこの output を外す。
  output: "export",
  // どの静的ホストでも /create/ が解決するように（GitHub Pages等の互換性）。
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
