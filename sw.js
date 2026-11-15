// Service Worker: App-Hülle offline verfügbar, API immer online, Mitteilungen (Web Push)
const C = "nh-shell-v17", KEEP = "nh-cfg", SHELL = ["./", "index.html"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C && x !== KEEP).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
// Mitteilung ohne Nutzlast: Text wird mit der Geräte-ID beim Worker abgeholt
self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let d = { title: "Nachhilfe", body: "Es gibt Neuigkeiten." };
    try {
      const r = await (await caches.open(KEEP)).match("api"), api = r && (await r.text());
      const sub = await self.registration.pushManager.getSubscription();
      if (api && sub) {
        const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub.endpoint));
        const id = [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, "0")).join("");
        const x = await fetch(api + "/api/push/info?id=" + id);
        if (x.ok) d = await x.json();
      }
    } catch (err) {}
    await self.registration.showNotification(d.title || "Nachhilfe", { body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: "nachhilfe" });
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => (l.length ? l[0].focus() : self.clients.openWindow("./"))));
});
