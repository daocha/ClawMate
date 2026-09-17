const CACHE = 'clawmate-v28';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/?$/, '/');
const API_PATH = `${SCOPE_PATH}api/`;
const SHELL = [
  './', './index.html', './css/app.css?v=25', './manifest.webmanifest',
  './js/app.js?v=26', './js/pet.js?v=26', './js/chat.js', './js/settings.js', './js/i18n.js', './js/companions.js',
  './js/urls.js',
  './js/characters.js', './js/face.js', './js/render-real.js?v=24', './js/render-chibi.js?v=24', './js/render-pixel.js?v=26', './js/pixel-model.js?v=26', './js/interactions.js?v=25',
  './assets/hd/momo-young-v2.png', './assets/hd/momo-knee-v4.png', './assets/hd/aria-knee-v3.png', './assets/hd/aria-s-curve-full-v5.png', './assets/hd/mochi-real-longhair-v5.png', './assets/hd/mochi.png', './assets/hd/coco.png',
  './assets/hd/luna.png', './assets/hd/kiko.png', './assets/hd/bao.png', './assets/hd/ember.png',
  './assets/hd/pino.png', './assets/hd/nova.png',
  './assets/chibi/mochi.png', './assets/chibi/coco.png',
  './assets/chibi/momo-painted-v4.png', './assets/chibi/aria-painted-v4.png', './assets/chibi/mochi-painted-v2.png', './assets/chibi/coco-painted-v2.png',
  './assets/chibi/luna.png', './assets/chibi/kiko.png', './assets/chibi/bao.png', './assets/chibi/ember.png',
  './assets/chibi/pino.png', './assets/chibi/nova.png',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith(API_PATH)) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'ClawMate', body: '…' };
  try { data = { ...data, ...event.data.json() }; } catch { data.body = event.data?.text() || data.body; }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'pet-reply',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      renotify: true,
      data: { url: './' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) if ('focus' in client) return client.focus();
      return self.clients.openWindow(self.registration.scope);
    })
  );
});
