import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// スマホ実機確認は `npm run host` で LAN 配信（設計書 §29）
export default defineConfig(({ command }) => ({
  // ビルドは相対パス（'./'）にして、ルート配信(Netlify等)でもサブパス配信
  // (GitHub Pages の /<repo>/ 等)でも同じ成果物で動くようにする。
  // dev は '/' のまま（開発サーバに影響させない）。
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
}));
