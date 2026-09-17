import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

/**
 * Device pairing registry.
 *
 * ClawMate's own HTTP/WS endpoints have no login of their own - anyone who can reach
 * the server's port could otherwise chat through the configured OpenClaw token. Each
 * browser generates its own random device id (crypto.randomUUID, stored in
 * localStorage) and sends it with every request; the server only lets a device through
 * once an operator has approved it from the host's terminal (`./start.sh approve <id>`).
 * The id is never derived from request metadata (User-Agent, IP, ...), so it can't be
 * reconstructed by an attacker who spoofs that metadata - only random guessing works,
 * which is infeasible at 122 bits of entropy.
 */

const FILE = path.join(DATA_DIR, 'devices.json');
const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

let cache = null;
let cacheMtimeMs = 0;

function readFresh() {
  let mtimeMs = 0;
  try { mtimeMs = fs.statSync(FILE).mtimeMs; } catch { /* not created yet */ }
  if (cache && mtimeMs === cacheMtimeMs) return cache;
  let stored = {};
  try { stored = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* first boot */ }
  cache = stored;
  cacheMtimeMs = mtimeMs;
  return cache;
}

function persist(devices) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(devices, null, 2));
  cache = devices;
  cacheMtimeMs = fs.statSync(FILE).mtimeMs;
}

export function isValidDeviceId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

// Registers a first-seen device as pending, and refreshes last-seen metadata otherwise.
export function touchDevice(id, meta = {}) {
  const devices = { ...readFresh() };
  const now = new Date().toISOString();
  const rec = devices[id] || { approved: false, firstSeenAt: now };
  rec.lastSeenAt = now;
  if (meta.ua) rec.ua = String(meta.ua).slice(0, 200);
  if (meta.ip) rec.ip = String(meta.ip);
  devices[id] = rec;
  persist(devices);
  return rec;
}

export function isApproved(id) {
  return Boolean(readFresh()[id]?.approved);
}

export function approveDevice(id) {
  const devices = { ...readFresh() };
  if (!devices[id]) throw new Error(`unknown device: ${id} (it must connect at least once before it can be approved)`);
  devices[id] = { ...devices[id], approved: true, approvedAt: new Date().toISOString() };
  persist(devices);
  return devices[id];
}

export function revokeDevice(id) {
  const devices = { ...readFresh() };
  if (!devices[id]) throw new Error(`unknown device: ${id}`);
  devices[id] = { ...devices[id], approved: false };
  persist(devices);
  return devices[id];
}

export function listDevices() {
  return readFresh();
}

/* --------------------------------------------------------------------- CLI */

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, arg] = process.argv;
  try {
    if (cmd === 'approve') {
      if (!arg) throw new Error('usage: node server/devices.js approve <device-id>');
      approveDevice(arg);
      console.log(`approved ${arg}`);
    } else if (cmd === 'revoke') {
      if (!arg) throw new Error('usage: node server/devices.js revoke <device-id>');
      revokeDevice(arg);
      console.log(`revoked ${arg}`);
    } else if (cmd === 'list') {
      const devices = listDevices();
      const ids = Object.keys(devices);
      if (!ids.length) console.log('no devices have connected yet');
      for (const id of ids) {
        const d = devices[id];
        console.log(`${d.approved ? '✓ approved' : '· pending '}  ${id}  ${d.ua || ''} ${d.ip || ''}  last seen ${d.lastSeenAt}`);
      }
    } else {
      console.error('usage: node server/devices.js <approve|revoke|list> [device-id]');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
