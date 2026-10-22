// Bump the version whenever the list of assets changes. Content updates
// are picked up automatically because fetches go network-first.
const CACHE = "clean-a-doro-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./theme.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./manifest.webmanifest",
  "./fonts/bricolage-grotesque.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== self.location.origin
  )
    return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && r.type === "basic") {
          const clone = r.clone();
          // Keep the worker alive until the cache write has finished.
          e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, clone)));
        }
        return r;
      })
      .catch(() =>
        caches
          .match(e.request, { ignoreSearch: e.request.mode === "navigate" })
          .then(
            (r) =>
              r ||
              (e.request.mode === "navigate"
                ? caches.match("./index.html")
                : Response.error()),
          ),
      ),
  );
});

// Tapping the "time's up" notification brings the app back to the front.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const scope = self.registration.scope;
        const client = list.find((c) => c.url.startsWith(scope));
        return client ? client.focus() : self.clients.openWindow(scope);
      }),
  );
});
