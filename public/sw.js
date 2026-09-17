const CACHE = 'clawmate-v6';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/?$/, '/');
const API_PATH = `${SCOPE_PATH}api/`;
const SHELL = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './js/app.js', './js/pet.js', './js/chat.js', './js/settings.js', './js/i18n.js',
  './js/urls.js',
  './js/characters.js', './js/face.js', './js/render-real.js', './js/render-chibi.js', './js/render-pixel.js', './js/interactions.js',
  './assets/hd/momo.png', './assets/hd/aria.png', './assets/hd/mochi.png', './assets/hd/coco.png',
  './assets/hd/luna.png', './assets/hd/kiko.png', './assets/hd/bao.png', './assets/hd/ember.png',
  './assets/hd/pino.png', './assets/hd/nova.png',
  './assets/chibi/momo.png', './assets/chibi/aria.png', './assets/chibi/mochi.png', './assets/chibi/coco.png',
  './assets/chibi/luna.png', './assets/chibi/kiko.png', './assets/chibi/bao.png', './assets/chibi/ember.png',
  './assets/chibi/pino.png', './assets/chibi/nova.png',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
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
