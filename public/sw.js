const CACHE = 'clawmate-v61';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/?$/, '/');
const API_PATH = `${SCOPE_PATH}api/`;
const STATE_DB = 'clawmate-service-worker';
const STATE_STORE = 'state';
const SHELL = [
  './', './index.html', './css/app.css?v=41', './manifest.webmanifest',
  './js/app.js?v=51', './js/pet.js?v=39', './js/hd-poses.js?v=7', './js/chat.js', './js/notes.js', './js/settings.js', './js/i18n.js', './js/companions.js',
  './js/urls.js', './js/minigame.js', './js/achievements.js',
  './js/characters.js', './js/face.js', './js/render-real.js?v=26', './js/render-chibi.js?v=25', './js/render-cartoon.js?v=2', './js/style-poses.js?v=3', './js/render-pixel.js?v=28', './js/pixel-model.js?v=28', './js/interactions.js?v=28',
  './assets/hd/momo-young-v2.png', './assets/hd/momo-knee-v4.png', './assets/hd/aria-knee-v3.png', './assets/hd/aria-s-curve-full-v5.png', './assets/hd/mochi-real-longhair-v5.png', './assets/hd/mochi.png', './assets/hd/coco.png',
  './assets/hd/luna.png', './assets/hd/kiko.png', './assets/hd/bao.png', './assets/hd/ember.png',
  './assets/hd/pino.png', './assets/hd/nova.png',
  './assets/chibi/mochi.png', './assets/chibi/coco.png',
  './assets/chibi/momo-painted-v4.png', './assets/chibi/aria-painted-v4.png', './assets/chibi/mochi-painted-v2.png', './assets/chibi/coco-painted-v2.png',
  './assets/chibi/luna.png', './assets/chibi/kiko.png', './assets/chibi/bao.png', './assets/chibi/ember.png',
  './assets/chibi/pino.png', './assets/chibi/nova.png',
  './assets/cartoon/momo-v3-1.png', './assets/cartoon/momo-v3-2.png', './assets/cartoon/aria-v3-1.png', './assets/cartoon/aria-v3-2.png',
  './assets/cartoon/mochi-v3-1.png', './assets/cartoon/mochi-v3-2.png', './assets/cartoon/coco-v3-1.png', './assets/cartoon/coco-v3-2.png',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/notification-badge.svg'
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

function openStateDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STATE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STATE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDeviceId(deviceId) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(deviceId || '')) return;
  const db = await openStateDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    tx.objectStore(STATE_STORE).put(deviceId, 'deviceId');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function loadDeviceId() {
  const db = await openStateDb();
  const deviceId = await new Promise((resolve, reject) => {
    const request = db.transaction(STATE_STORE).objectStore(STATE_STORE).get('deviceId');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return deviceId;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'clawmate-device-id') event.waitUntil(saveDeviceId(event.data.deviceId));
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
  event.waitUntil((async () => {
    const base = {
      body: data.body,
      tag: data.tag || 'pet-reply',
      renotify: true,
      data: { url: data.url || './', noteId: data.noteId || null }
    };
    try {
      await self.registration.showNotification(data.title, {
        ...base,
      // Notification assets are resolved against the scope rather than the
      // current page, so they work both at / and behind Tailscale subpaths.
        icon: new URL('./icons/icon-192.png', self.registration.scope).href,
      // Android status-bar badges must be a single-color transparent mask;
      // using the colorful app photo here renders as a blank square.
        badge: new URL('./icons/notification-badge.svg', self.registration.scope).href
      });
    } catch (err) {
      // A platform can reject an unsupported icon/badge format. Do not lose
      // the actual reminder merely because its decoration could not render.
      console.warn('[ClawMate] notification artwork failed; using fallback', err);
      await self.registration.showNotification(data.title, base);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notification = event.notification.data || {};
  const targetUrl = new URL(notification.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (!('focus' in client)) continue;
        client.postMessage({ type: 'clawmate-notification-click', noteId: notification.noteId || null });
        return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Browsers may replace a subscription while the app is not open (for example
// after key expiry or storage cleanup).  Recreate it with the old VAPID key
// when possible, then immediately give the server its new endpoint.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const deviceId = await loadDeviceId();
    if (!deviceId) throw new Error('Missing paired device id');
    let applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
    if (!applicationServerKey) {
      const keyUrl = new URL('api/push/key', self.registration.scope);
      keyUrl.searchParams.set('device', deviceId);
      const response = await fetch(keyUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load VAPID key (${response.status})`);
      const { publicKey } = await response.json();
      const padded = publicKey + '='.repeat((4 - (publicKey.length % 4)) % 4);
      const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      applicationServerKey = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    }

    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
    const subscribeUrl = new URL('api/push/subscribe', self.registration.scope);
    subscribeUrl.searchParams.set('device', deviceId);
    const response = await fetch(subscribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    });
    if (!response.ok) throw new Error(`Could not sync push subscription (${response.status})`);
  })().catch((err) => console.warn('[ClawMate] push subscription recovery failed', err)));
});
