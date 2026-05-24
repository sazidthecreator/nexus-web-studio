// Sitely service worker.
// Strategy:
// - App shell (HTML root, manifest, icon): cache-first with network fallback.
// - Static built assets (/assets/*, /_build/*): cache-first (immutable, hashed).
// - Published sites (/sites/*): stale-while-revalidate.
// - Everything else (API, server fns, auth, supabase): network-only, never cached.

const VERSION = "v1";
const SHELL_CACHE = `sitely-shell-${VERSION}`;
const ASSET_CACHE = `sitely-assets-${VERSION}`;
const SITES_CACHE = `sitely-sites-${VERSION}`;
const SHELL_URLS = ["/", "/dashboard", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, SITES_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isHtmlRequest(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache backend or server-fn traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Hashed build assets — cache-first (immutable).
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_build/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Published sites — stale-while-revalidate.
  if (url.pathname.startsWith("/sites/")) {
    event.respondWith(
      caches.open(SITES_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetchPromise;
      }),
    );
    return;
  }

  // App shell HTML — network-first, fall back to cache.
  if (isHtmlRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          return hit || caches.match("/dashboard") || caches.match("/");
        }),
    );
  }
});

// ============================================================
// BACKGROUND SYNC — replay queued edits when connectivity returns.
// Pairs with src/lib/offline-cache.ts edit-queue.
// ============================================================
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-project-edits") {
    event.waitUntil(replayQueuedEdits());
  }
});

async function replayQueuedEdits() {
  // Notify the app to drain its IndexedDB queue.
  // The page-side cache module owns the schema; SW just kicks it.
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type: "sitely:drain-edit-queue" });
  }
}

// ============================================================
// PUSH NOTIFICATIONS — for collaboration / publish events.
// Silent if no payload (server may send keep-alives).
// ============================================================
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const { title, body, icon, url } = payload || {};
  if (!title) return;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || "",
      icon: icon || "/icon.svg",
      badge: "/icon.svg",
      data: { url: url || "/" },
      vibrate: [100, 50, 200],
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
