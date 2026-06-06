import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

console.log("[main] AI Pose Doll Mobile を起動します");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 開発デバッグ用ヘルパ（dev のみ動的ロード）
if (import.meta.env.DEV) {
  import("./devDebug");
}

// Service Worker 登録（本番のみ。dev では HMR と干渉するため無効・設計書 §21 Step12）
// 相対パスで登録し、ルート/サブパス(GitHub Pages の /<repo>/)両方に対応。
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // BASE_URL は配信ベース（'/' or './'）。ページ基準で /<repo>/sw.js を登録。
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then(() => console.log("[sw] registered"))
      .catch((e) => console.warn("[sw] register failed", e));
  });
}
