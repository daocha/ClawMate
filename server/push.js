import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { DATA_DIR } from './config.js';

const KEY_FILE = path.join(DATA_DIR, 'vapid.json');
const SUB_FILE = path.join(DATA_DIR, 'subscriptions.json');

function loadKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch {
    const keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
    return keys;
  }
}

const keys = loadKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', keys.publicKey, keys.privateKey);

let subs = [];
try { subs = JSON.parse(fs.readFileSync(SUB_FILE, 'utf8')); } catch { subs = []; }

const persist = () => fs.writeFileSync(SUB_FILE, JSON.stringify(subs, null, 2));

export const publicKey = keys.publicKey;

export function subscribe(sub) {
  if (!sub?.endpoint) return false;
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    persist();
  }
  return true;
}

export function unsubscribe(endpoint) {
  const before = subs.length;
  subs = subs.filter((s) => s.endpoint !== endpoint);
  if (subs.length !== before) persist();
  return before !== subs.length;
}

export async function notify(payload) {
  if (!subs.length) return 0;
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, body)));
  const dead = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) dead.push(subs[i].endpoint);
    else if (r.status === 'rejected') {
      console.warn(`[ClawMate] push delivery failed (${r.reason?.statusCode || r.reason?.code || 'unknown'}): ${r.reason?.message || r.reason}`);
    }
  });
  if (dead.length) {
    subs = subs.filter((s) => !dead.includes(s.endpoint));
    persist();
  }
  return results.filter((r) => r.status === 'fulfilled').length;
}

// Sends only to the subscription supplied by the paired device. This is for
// diagnosing the entire Web Push path without waking every subscribed device.
export async function sendTest(sub) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { ok: false, error: 'invalid-subscription' };
  }
  try {
    await webpush.sendNotification(sub, JSON.stringify({
      title: 'ClawMate', body: '推播測試成功', tag: 'clawmate-push-test'
    }));
    return { ok: true };
  } catch (err) {
    const status = err?.statusCode || err?.statusCode === 0 ? err.statusCode : null;
    if ([404, 410].includes(status)) unsubscribe(sub.endpoint);
    console.warn(`[ClawMate] test push failed (${status || err?.code || 'unknown'}): ${err?.message || err}`);
    return { ok: false, status, error: err?.message || String(err) };
  }
}
