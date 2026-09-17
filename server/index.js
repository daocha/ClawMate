import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { getConfig, saveConfig, publicConfig } from './config.js';
import { sendMessage, testConnection, listAgents } from './openclaw.js';
import * as push from './push.js';
import { getCompanions, interact, rewardChat, selectCompanion } from './companions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/api/companions', (_req, res) => res.json({ ok: true, companions: getCompanions() }));
app.post('/api/companions/:id/actions/:action', (req, res) => {
  const companion = interact(req.params.id, req.params.action);
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
  const allowed = ['serverUrl', 'token', 'agentId', 'transport', 'gatewayPath', 'sessionId', 'systemPrompt'];
  const patch = {};
  for (const key of allowed) if (key in req.body) patch[key] = String(req.body[key] ?? '').trim();
  if (patch.transport && !['openai', 'gateway'].includes(patch.transport)) delete patch.transport;
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

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
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
      const full = await sendMessage(
        cfg,
        { text, history: Array.isArray(msg.history) ? msg.history : [] },
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ClawMate] listening on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  clearInterval(heartbeat);
  wss.clients.forEach((c) => c.close());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
