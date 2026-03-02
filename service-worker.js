const CACHE_NAME = 'uno-game-v4';
const ASSETS = [
  '/hebrew-uno-game/',
  '/hebrew-uno-game/index.html',
  '/hebrew-uno-game/styles.css',
  '/hebrew-uno-game/manifest.json',
  '/hebrew-uno-game/js/app.js',
  '/hebrew-uno-game/js/animations.js',
  '/hebrew-uno-game/js/bot.js',
  '/hebrew-uno-game/js/constants.js',
  '/hebrew-uno-game/js/deck.js',
  '/hebrew-uno-game/js/pwa.js',
  '/hebrew-uno-game/js/sounds.js',
  '/hebrew-uno-game/js/state.js',
  '/hebrew-uno-game/js/ui.js',
  '/hebrew-uno-game/js/stats.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
