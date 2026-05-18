const CACHE_NAME = "nexus-v3";
const STATIC_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Don't intercept API calls
  if (req.url.includes("/api/")) return;

  // Don't intercept document/HTML/page navigations — always hit the network
  // so users see fresh server-rendered content after deploys.
  if (req.mode === "navigate" || req.destination === "document") return;

  // Cache-fallback for everything else (icons, manifest, static assets)
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "BlackScale Nexus", body: event.data.text() };
  }

  const { title, body, icon = "/icon-192.png", data = {} } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icon-192.png",
      data,
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click — navigate to the linked page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
