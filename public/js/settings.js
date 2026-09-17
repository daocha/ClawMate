import { t } from './i18n.js';

const api = async (url, options) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options?.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function enablePush(swReg) {
  if (!pushSupported()) return { ok: false, reason: 'pushUnsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'pushDenied' };

  const { publicKey } = await api('/api/push/key');
  const sub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
  return { ok: true };
}

export async function disablePush(swReg) {
  const sub = await swReg?.pushManager.getSubscription();
  if (!sub) return { ok: true };
  await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
  return { ok: true };
}

export async function startNewSession() {
  const sessionId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await api('/api/settings', { method: 'PUT', body: { sessionId } });
  return sessionId;
}

export function initSettings(els, ctx) {
  let serverCfg = {};

  const flash = (el, text, cls = '') => {
    el.textContent = text;
    el.className = `test-result ${cls}`;
    if (cls) setTimeout(() => { if (el.textContent === text) el.className = 'test-result'; }, 4000);
  };

  function fillAgents(ids, selected, defaultId) {
    const unique = [...new Set([...(ids || []), selected].filter(Boolean))];
    els.agent.innerHTML = '';
    for (const id of unique) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id === defaultId ? `${id} (default)` : id;
      els.agent.appendChild(opt);
    }
    // Stored agent no longer exists on the server - fall back to the gateway default.
    els.agent.value = unique.includes(selected) ? selected : (defaultId ?? unique[0] ?? '');
  }

  async function loadAgents(selected) {
    const current = selected ?? els.agent.value ?? serverCfg.agentId;
    try {
      const res = await api('/api/agents');
      if (!res.ok) throw new Error(res.error || 'failed');
      fillAgents(res.agents.map((a) => a.id), current, res.defaultId);
      return res;
    } catch {
      fillAgents([], current, null);
      flash(els.testResult, t('agentLoadFail'), 'err');
      return null;
    }
  }

  async function load() {
    serverCfg = await api('/api/settings').catch(() => ({}));
    els.url.value = serverCfg.serverUrl || '';
    els.transport.value = serverCfg.transport || 'openai';
    els.token.placeholder = serverCfg.hasToken ? '••••••••' : '';
    fillAgents([], serverCfg.agentId, null);
    if (serverCfg.configured) loadAgents(serverCfg.agentId);
    return serverCfg;
  }

  async function save() {
    flash(els.saveResult, t('saving'));
    try {
      serverCfg = await api('/api/settings', {
        method: 'PUT',
        body: {
          serverUrl: els.url.value.trim(),
          token: els.token.value,
          agentId: els.agent.value.trim(),
          transport: els.transport.value
        }
      });
      els.token.value = '';
      els.token.placeholder = serverCfg.hasToken ? '••••••••' : '';
      ctx.prefs.set('petName', els.petName.value.trim());
      flash(els.saveResult, t('saved'), 'ok');
      ctx.onSaved?.(serverCfg);
    } catch (err) {
      flash(els.saveResult, `${t('testFail')} (${err.message})`, 'err');
    }
  }

  async function test() {
    flash(els.testResult, t('testing'));
    try {
      const result = await api('/api/test-connection', {
        method: 'POST',
        body: { serverUrl: els.url.value.trim(), token: els.token.value }
      });
      if (!result.ok) {
        const reason = t(result.error) !== result.error ? t(result.error) : result.error;
        flash(els.testResult, `${t('testFail')} (${reason})`, 'err');
        return;
      }
      const bits = [t('testOk')];
      if (result.version) bits.push(`v${result.version}`);
      if (result.agents?.length) bits.push(`${result.agents.length} agents`);
      // The probe knows which transport this server actually supports - just use it.
      if (result.recommend && els.transport.value !== result.recommend) {
        els.transport.value = result.recommend;
        if (result.recommend === 'gateway') bits.push(t('recommendGateway'));
      }
      if (result.agents?.length) fillAgents(result.agents, els.agent.value, result.defaultAgentId);
      flash(els.testResult, bits.join(' · '), 'ok');
    } catch (err) {
      flash(els.testResult, `${t('testFail')} (${err.message})`, 'err');
    }
  }

  async function togglePush(on) {
    if (!pushSupported()) { flash(els.pushResult, t('pushUnsupported'), 'err'); els.push.checked = false; return; }
    const reg = await ctx.swReady();
    if (on) {
      const res = await enablePush(reg).catch((e) => ({ ok: false, reason: e.message }));
      if (res.ok) { flash(els.pushResult, t('pushOn'), 'ok'); ctx.prefs.set('push', true); }
      else { els.push.checked = false; flash(els.pushResult, t(res.reason) || res.reason, 'err'); }
    } else {
      await disablePush(reg);
      ctx.prefs.set('push', false);
      flash(els.pushResult, t('pushOff'));
    }
  }

  els.saveBtn.addEventListener('click', save);
  els.testBtn.addEventListener('click', test);
  els.reloadAgents.addEventListener('click', () => loadAgents());
  els.push.addEventListener('change', (e) => togglePush(e.target.checked));

  [['sound', els.sound], ['haptics', els.haptics], ['reducedMotion', els.motion]].forEach(([key, el]) => {
    el.checked = ctx.prefs.get(key, key === 'haptics');
    el.addEventListener('change', () => {
      ctx.prefs.set(key, el.checked);
      ctx.onPrefChange?.(key, el.checked);
    });
  });
  els.push.checked = ctx.prefs.get('push', false);
  els.petName.value = ctx.prefs.get('petName', '');
  els.petName.addEventListener('change', () => ctx.prefs.set('petName', els.petName.value.trim()));

  return { load, save, test, loadAgents };
}
