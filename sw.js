// Offline cache for the app shell.
// IMPORTANT: bump VERSION on every release – that is what tells installed apps an update is available.
const VERSION = 'forge-v12';
const FILES = ['./', './index.html', './css/styles.css', './js/exercises.js', './js/templates.js', './js/progression.js', './js/store.js',
  './js/howto.js', './js/demos.js', './js/app.js', './js/training.js', './js/nutrition.js', './js/body.js', './js/progress.js', './js/main.js',
  './js/vendor/zxing.min.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

// Fetch fresh copies (bypassing the HTTP cache) so a new version never caches stale files.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
  // No skipWaiting here: the new version waits until the user taps "Refresh" (or every app window is closed).
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'GET_VERSION' && e.ports[0]) e.ports[0].postMessage(VERSION);
});
// Network first (revalidating with the server so updates arrive), falling back to the cache when offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/videos/')) return; // stream videos straight from the network (range requests)
  // fetch by URL: passing options with a page-navigation Request fails, which made v7 serve a stale page
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request.url, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
