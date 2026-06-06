// 最小限の Service Worker（設計書 §21 Step12: オフライン起動の最低限対応）。
// ランタイムキャッシュ: 取得した GET を都度キャッシュし、次回はキャッシュ優先で配信。
const CACHE = "aipd-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached);
      // キャッシュ優先（オフラインでも起動）、裏で更新
      return cached || network;
    })()
  );
});
