import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FILE = path.join(DATA_DIR, 'settings.json');

// How much the OpenClaw agent behind the pet chat is allowed to do to the
// underlying workspace/machine, independent of whatever tool access it has
// when driven from elsewhere. Casual pet chat has no business running with
// the same authority as a coding session, so this defaults to the most
// restrictive tier - see OPENCLAW_PERMISSION in .env.example.
export const PERMISSION_MODES = ['read-only', 'guarded', 'workspace', 'full'];

const DEFAULTS = {
  serverUrl: process.env.OPENCLAW_URL || '',
  token: process.env.OPENCLAW_TOKEN || '',
  agentId: process.env.OPENCLAW_AGENT_ID || 'main',
  transport: 'openai',
  gatewayPath: '',
  sessionId: 'main',
  systemPrompt: '',
  permission: PERMISSION_MODES.includes(process.env.OPENCLAW_PERMISSION) ? process.env.OPENCLAW_PERMISSION : 'read-only',
  lang: 'zh-TW',
  dndStart: '00:00',
  dndEnd: '10:00',
  needAlerts: true
};

fs.mkdirSync(DATA_DIR, { recursive: true });

let cache = null;

export function getConfig() {
  if (cache) return cache;
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    /* first boot - fall back to env defaults */
  }
  cache = { ...DEFAULTS, ...stored };
  if (!PERMISSION_MODES.includes(cache.permission)) cache.permission = 'read-only';
  return cache;
}

export function saveConfig(patch) {
  const next = { ...getConfig(), ...patch };
  // An empty token from the UI means "leave the stored one alone".
  if (patch.token === '') next.token = getConfig().token;
  cache = next;
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

// Never hand the token back to the browser - only whether one exists.
export function publicConfig() {
  const c = getConfig();
  return {
    serverUrl: c.serverUrl,
    agentId: c.agentId,
    transport: c.transport,
    gatewayPath: c.gatewayPath,
    sessionId: c.sessionId,
    systemPrompt: c.systemPrompt,
    permission: c.permission,
    lang: c.lang,
    dndStart: c.dndStart,
    dndEnd: c.dndEnd,
    needAlerts: c.needAlerts !== false,
    hasToken: Boolean(c.token),
    configured: Boolean(c.serverUrl)
  };
}

export { DATA_DIR };
