import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

/**
 * Adapter for an OpenClaw Gateway.
 *
 * Two transports:
 *   openai  - POST /v1/chat/completions with `model: "openclaw/<agentId>"`, SSE streaming.
 *   gateway - native Gateway WebSocket (protocol v4): connect -> chat.send -> chat.inject deltas.
 *
 * The gateway WS path is not consistently documented, so it is configurable and
 * we probe a couple of candidates before giving up.
 */

const GATEWAY_WS_PATHS = ['/gateway', '/', '/ws'];

function normalizeBase(url) {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

function toWsUrl(base, path) {
  const u = new URL(base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = path === '/' ? '/' : path;
  return u.toString().replace(/\/$/, path === '/' ? '/' : '');
}

export function sessionKeyFor(agentId, sessionId = 'main') {
  return `agent:${agentId || 'main'}:${sessionId}`;
}

/* ------------------------------------------------------------------ health */

const CLIENT_NAME = 'ClawMate';

export async function testConnection(cfg) {
  const base = normalizeBase(cfg.serverUrl);
  if (!base) return { ok: false, error: 'missing-url' };
  const headers = {
    'User-Agent': CLIENT_NAME,
    ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {})
  };

  const probe = async (path) => {
    try {
      return await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(6000) });
    } catch (err) {
      return { ok: false, status: 0, failed: err.name === 'TimeoutError' ? 'timeout' : 'unreachable' };
    }
  };

  const live = await probe('/startupz');
  const version = live.ok ? (await live.json().catch(() => ({})))?.version ?? null : null;

  const models = await probe('/v1/models');
  let agents = [];
  if (models.ok) {
    const body = await models.json().catch(() => ({}));
    agents = (body?.data || []).map((m) => String(m.id).replace(/^openclaw[/:]/, '')).filter(Boolean);
  }

  if (!live.ok && models.status === 0) return { ok: false, error: live.failed || 'unreachable' };
  if (models.status === 401 || models.status === 403) return { ok: false, error: 'unauthorized', version };

  // A 404 on /v1/models means this build does not expose the OpenAI-compatible API,
  // so the native gateway transport is the one that will actually work.
  const openaiAvailable = models.ok;
  const recommend = openaiAvailable ? 'openai' : 'gateway';

  // Without the OpenAI API there is no agent list over HTTP, so ask the gateway directly.
  let defaultAgentId = null;
  if (!openaiAvailable) {
    try {
      const discovered = await listAgents(cfg);
      agents = discovered.agents.map((a) => a.id);
      defaultAgentId = discovered.defaultId;
    } catch (err) {
      return { ok: true, version, openaiAvailable, agents: [], recommend, agentError: err.message };
    }
  }

  return { ok: true, version, openaiAvailable, agents, defaultAgentId, recommend };
}

/* ------------------------------------------------- transport: OpenAI-compat */

async function sendViaOpenAI(cfg, messages, handlers, signal) {
  const base = normalizeBase(cfg.serverUrl);
  const agentId = cfg.agentId || 'main';
  const sessionKey = sessionKeyFor(agentId, cfg.sessionId);

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': CLIENT_NAME,
      ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      'x-openclaw-session-key': sessionKey
    },
    body: JSON.stringify({
      model: `openclaw/${agentId}`,
      messages,
      stream: true,
      user: sessionKey
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenClaw responded ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const evt of events) {
      for (const line of evt.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content;
          if (delta) { full += delta; handlers.onDelta?.(delta); }
        } catch {
          /* keep-alive comment or partial frame - ignore */
        }
      }
    }
  }
  return full;
}

/* ------------------------------------------------- transport: Gateway WS */

function gatewayHandshake(ws, cfg) {
  return new Promise((resolve, reject) => {
    const id = `connect-${Date.now()}`;
    const timer = setTimeout(() => reject(new Error('gateway handshake timeout')), 10_000);

    const onMessage = (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer);
      ws.off('message', onMessage);
      if (msg.ok === false) {
        const code = msg.error?.details?.code || msg.error?.code;
        const hint = code === 'DEVICE_IDENTITY_REQUIRED'
          ? ' - this gateway requires a paired device or a gateway token; set the token in Settings'
          : '';
        reject(new Error(`${msg.error?.message || 'gateway rejected the handshake'}${hint}`));
      }
      else resolve(msg.payload);
    };

    ws.on('message', onMessage);
    ws.send(JSON.stringify({
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 4,
        maxProtocol: 4,
        client: { id: 'gateway-client', version: '1.0.0', platform: 'node', mode: 'backend' },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        auth: cfg.token ? { token: cfg.token } : {}
      }
    }));
  });
}

function openGatewaySocket(cfg) {
  const base = normalizeBase(cfg.serverUrl);
  const candidates = cfg.gatewayPath ? [cfg.gatewayPath] : GATEWAY_WS_PATHS;

  const attempt = (i) => new Promise((resolve, reject) => {
    if (i >= candidates.length) return reject(new Error('could not open a Gateway WebSocket on any known path'));
    const url = toWsUrl(base, candidates[i]);
    const ws = new WebSocket(url, {
      headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
      handshakeTimeout: 6000
    });
    const fail = () => { ws.removeAllListeners(); ws.terminate(); resolve(attempt(i + 1)); };
    ws.once('error', fail);
    ws.once('unexpected-response', fail);
    ws.once('open', () => {
      ws.off('error', fail);
      ws.off('unexpected-response', fail);
      resolve(ws);
    });
  });

  return attempt(0);
}

// The `final` event carries the assistant message in a loosely-typed field.
function extractText(message) {
  if (!message) return '';
  if (typeof message === 'string') return message;
  if (typeof message.text === 'string') return message.text;
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('');
  }
  return '';
}

// One-shot gateway RPC: connect, authenticate, call, close.
async function gatewayRequest(cfg, method, params = {}, timeoutMs = 12_000) {
  const ws = await openGatewaySocket(cfg);
  try {
    await gatewayHandshake(ws, cfg);
    const id = `${method}-${Date.now()}`;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} timed out`)), timeoutMs);
      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (msg.id !== id) return;
        clearTimeout(timer);
        if (msg.ok === false) reject(new Error(msg.error?.message || `${method} was rejected`));
        else resolve(msg.payload);
      });
      ws.on('error', (err) => { clearTimeout(timer); reject(err); });
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  } finally {
    try { ws.close(); } catch { /* already closed */ }
  }
}

export async function listAgents(cfg) {
  const payload = await gatewayRequest(cfg, 'agents.list', {});
  return {
    defaultId: payload?.defaultId ?? null,
    agents: (payload?.agents || []).map((a) => ({ id: a.id, kind: a.kind ?? 'agent' }))
  };
}

async function sendViaGateway(cfg, text, handlers, signal) {
  const ws = await openGatewaySocket(cfg);
  const agentId = cfg.agentId || 'main';
  const sessionKey = sessionKeyFor(agentId, cfg.sessionId);

  try {
    await gatewayHandshake(ws, cfg);

    const sendId = `send-${Date.now()}`;
    let full = '';
    let runId = null;
    let settled = false;

    const done = new Promise((resolve, reject) => {
      const guard = setTimeout(() => finish(), Number(cfg.timeoutMs) || 180_000);
      function finish() { if (!settled) { settled = true; clearTimeout(guard); resolve(full); } }
      function fail(err) { if (!settled) { settled = true; clearTimeout(guard); reject(err); } }

      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.type === 'res' && msg.id === sendId) {
          if (msg.ok === false) return fail(new Error(msg.error?.message || 'chat.send was rejected'));
          runId = msg.payload?.runId ?? runId;
          return;
        }

        if (msg.type !== 'event' || msg.event !== 'chat') return;
        const p = msg.payload || {};
        if (p.sessionKey && p.sessionKey !== sessionKey) return;
        if (runId && p.runId && p.runId !== runId) return;

        switch (p.state) {
          case 'delta':
            if (typeof p.deltaText !== 'string') break;
            if (p.replace) { full = p.deltaText; handlers.onReplace?.(full); }
            else { full += p.deltaText; handlers.onDelta?.(p.deltaText); }
            break;
          case 'final': {
            const finalText = extractText(p.message);
            if (!full && finalText) { full = finalText; handlers.onDelta?.(finalText); }
            finish();
            break;
          }
          case 'aborted':
            finish();
            break;
          case 'error':
            fail(new Error(p.errorMessage || 'the agent run failed'));
            break;
          default:
            break;
        }
      });

      ws.on('close', finish);
      ws.on('error', fail);
      signal?.addEventListener('abort', finish, { once: true });
    });

    ws.send(JSON.stringify({
      type: 'req',
      id: sendId,
      method: 'chat.send',
      params: { sessionKey, agentId, message: text, idempotencyKey: randomUUID() }
    }));

    return await done;
  } finally {
    try { ws.close(); } catch { /* already closed */ }
  }
}

/* -------------------------------------------------------------- public API */

export async function sendMessage(cfg, { text, history = [] }, handlers = {}, signal) {
  if (!normalizeBase(cfg.serverUrl)) throw new Error('OpenClaw URL is not configured');

  if (cfg.transport === 'gateway') {
    return sendViaGateway(cfg, text, handlers, signal);
  }

  const messages = [
    ...(cfg.systemPrompt ? [{ role: 'system', content: cfg.systemPrompt }] : []),
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: text }
  ];
  return sendViaOpenAI(cfg, messages, handlers, signal);
}
