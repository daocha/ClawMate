import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { getConfig, saveConfig, publicConfig, PERMISSION_MODES } from './config.js';
import { sendMessage, testConnection, listAgents, sessionKeyFor } from './openclaw.js';
import * as push from './push.js';
import { getCompanions, interact, rewardChat, selectCompanion, pendingNeedAlerts, markNeedAlertsSent, buildAlertNotification, isQuietNow, buildPersonaPrompt, getActiveCompanionId } from './companions.js';
import { isValidDeviceId, touchDevice } from './devices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    // App-shell code must be revalidated so a phone controlled by an older
    // service worker cannot keep an obsolete SVG crop implementation.
    if (/\.(?:html|js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Every other /api/* route requires a device the operator has approved from the
// host's terminal (`./start.sh approve <id>`) - see server/devices.js for why.
app.get('/api/device/status', (req, res) => {
  const deviceId = String(req.query.device || '').trim();
  if (!isValidDeviceId(deviceId)) return res.status(400).json({ ok: false, error: 'invalid-device-id' });
  const record = touchDevice(deviceId, { ua: req.get('user-agent'), ip: req.ip });
  res.json({ ok: true, deviceId, approved: record.approved });
});

app.use('/api', (req, res, next) => {
  const deviceId = String(req.query.device || '').trim();
  if (!isValidDeviceId(deviceId)) return res.status(400).json({ ok: false, error: 'invalid-device-id' });
  const record = touchDevice(deviceId, { ua: req.get('user-agent'), ip: req.ip });
  if (!record.approved) return res.status(403).json({ ok: false, error: 'device-pending', deviceId });
  next();
});

app.get('/api/companions', (_req, res) => res.json({ ok: true, companions: getCompanions() }));
app.post('/api/companions/:id/actions/:action', (req, res) => {
  const companion = interact(req.params.id, req.params.action, req.body?.bonus);
  if (!companion) return res.status(404).json({ ok: false, error: 'Unknown companion action' });
  res.json({ ok: true, companion });
});
app.post('/api/companions/chat-reward', (_req, res) => res.json({ ok: true, companions: rewardChat() }));
app.post('/api/companions/select', (req, res) => {
  const selection = selectCompanion(String(req.body?.id || ''));
  if (!selection) return res.status(400).json({ ok: false, error: 'Unknown companion' });
  res.json({ ok: true, companions: selection });
});
app.get('/api/settings', (_req, res) => res.json(publicConfig()));

app.put('/api/settings', (req, res) => {
  const allowed = ['serverUrl', 'token', 'agentId', 'transport', 'gatewayPath', 'sessionId', 'systemPrompt', 'permission', 'lang', 'dndStart', 'dndEnd'];
  const patch = {};
  for (const key of allowed) if (key in req.body) patch[key] = String(req.body[key] ?? '').trim();
  if (patch.transport && !['openai', 'gateway'].includes(patch.transport)) delete patch.transport;
  if (patch.permission && !PERMISSION_MODES.includes(patch.permission)) delete patch.permission;
  if (patch.lang && !['zh-TW', 'en'].includes(patch.lang)) delete patch.lang;
  if (patch.dndStart && !/^\d{1,2}:\d{2}$/.test(patch.dndStart)) delete patch.dndStart;
  if (patch.dndEnd && !/^\d{1,2}:\d{2}$/.test(patch.dndEnd)) delete patch.dndEnd;
  if ('needAlerts' in req.body) patch.needAlerts = !!req.body.needAlerts;
  saveConfig(patch);
  res.json(publicConfig());
});

app.post('/api/test-connection', async (req, res) => {
  const cfg = { ...getConfig() };
  if (req.body?.serverUrl) cfg.serverUrl = String(req.body.serverUrl).trim();
  if (req.body?.token) cfg.token = String(req.body.token);
  res.json(await testConnection(cfg));
});

app.get('/api/agents', async (_req, res) => {
  try {
    res.json({ ok: true, ...(await listAgents(getConfig())) });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/push/key', (_req, res) => res.json({ publicKey: push.publicKey }));
app.post('/api/push/subscribe', (req, res) => res.json({ ok: push.subscribe(req.body) }));
app.post('/api/push/unsubscribe', (req, res) => res.json({ ok: push.unsubscribe(req.body?.endpoint) }));

// Tracks which companion a given OpenClaw session was last primed with, so the
// persona prompt is only (re-)sent right after `sessions.create` (new session)
// or right after switching companion mid-session - not on every single turn.
// In-memory is fine: a server restart just costs one harmless extra re-prime.
const primedSessions = new Map();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  const deviceId = new URL(req.url, 'http://internal').searchParams.get('device') || '';
  const record = isValidDeviceId(deviceId)
    ? touchDevice(deviceId, { ua: req.headers['user-agent'], ip: req.socket.remoteAddress })
    : null;
  if (!record?.approved) return socket.close(4401, 'device-pending');

  socket.isAlive = true;
  socket.hidden = false;
  socket.on('pong', () => { socket.isAlive = true; });

  const send = (payload) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
  };

  send({ type: 'ready', config: publicConfig() });

  socket.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'visibility') { socket.hidden = !!msg.hidden; return; }
    if (msg.type === 'ping') { send({ type: 'pong' }); return; }
    if (msg.type !== 'chat') return;

    const id = msg.id || `m-${Date.now()}`;
    const text = String(msg.text || '').slice(0, 8000);
    if (!text) return;

    const cfg = getConfig();
    if (!cfg.serverUrl) {
      send({ type: 'error', id, code: 'not-configured', message: 'OpenClaw URL is not configured' });
      return;
    }

    const controller = new AbortController();
    socket.once('close', () => controller.abort());
    send({ type: 'start', id });

    try {
      const sessionKey = sessionKeyFor(cfg.agentId, cfg.sessionId);
      const activeCompanionId = getActiveCompanionId();
      const needsPersona = primedSessions.get(sessionKey) !== activeCompanionId;
      const persona = needsPersona ? buildPersonaPrompt(cfg.lang) : '';
      if (needsPersona) primedSessions.set(sessionKey, activeCompanionId);
      const full = await sendMessage(
        cfg,
        { text, history: Array.isArray(msg.history) ? msg.history : [], persona },
        {
          onDelta: (delta) => send({ type: 'delta', id, text: delta }),
          onReplace: (whole) => send({ type: 'replace', id, text: whole })
        },
        controller.signal
      );
      send({ type: 'done', id, text: full });

      if (socket.hidden && full) {
        push.notify({
          title: msg.petName || 'ClawMate',
          body: full.slice(0, 180),
          tag: 'pet-reply'
        }).catch(() => {});
      }
    } catch (err) {
      send({ type: 'error', id, code: 'upstream', message: err.message });
    }
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30_000);

wss.on('close', () => clearInterval(heartbeat));

// Watches the active companion's needs/bond for a red-zone dip and pushes a
// localized notification - but never during the configurable do-not-disturb
// hours (see server/companions.js isQuietNow/pendingNeedAlerts).
const needAlertTimer = setInterval(async () => {
  try {
    const cfg = getConfig();
    if (!cfg.needAlerts || isQuietNow()) return;
    const { id, pending } = pendingNeedAlerts();
    if (!pending.length) return;
    const { title, body } = buildAlertNotification(id, pending, cfg.lang);
    const sent = await push.notify({ title, body, tag: 'need-alert' });
    if (sent) markNeedAlertsSent(pending);
  } catch { /* best effort - retried on the next tick */ }
}, 5 * 60_000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ClawMate] listening on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  clearInterval(heartbeat);
  clearInterval(needAlertTimer);
  wss.clients.forEach((c) => c.close());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
