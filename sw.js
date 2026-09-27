/* Mercer Messenger Service Worker v10.5.6 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js");

const CACHE_NAME = "mercer-messenger-v10-5-6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./icons/icon.svg"
];
const RUNTIME_HOSTS = [
  "www.gstatic.com",
  "unpkg.com",
  "cdn.onesignal.com"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheRuntime(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(r => {
      if (r && (r.ok || r.type === "opaque")) caches.open(CACHE_NAME).then(c => c.put(request, r.clone()));
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (e) {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (url.origin === self.location.origin || RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheRuntime(req));
  }
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
