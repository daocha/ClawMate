import { t, getLang } from './i18n.js';
import { appWebSocketUrl } from './urls.js';

/* ------------------------------------------------------------ socket */

export class PetSocket extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.retry = 0;
    this.closedByUs = false;
  }

  connect() {
    this.closedByUs = false;
    const ws = new WebSocket(appWebSocketUrl('ws'));
    this.ws = ws;
    this.emit('state', { state: this.retry ? 'reconnecting' : 'connecting' });

    ws.addEventListener('open', () => {
      this.retry = 0;
      this.emit('state', { state: 'open' });
      this.setVisibility(document.hidden);
    });

    ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this.emit(msg.type, msg);
    });

    ws.addEventListener('close', () => {
      this.emit('state', { state: 'closed' });
      if (this.closedByUs) return;
      const wait = Math.min(15000, 800 * 2 ** this.retry++);
      setTimeout(() => this.connect(), wait);
    });

    ws.addEventListener('error', () => this.emit('state', { state: 'error' }));
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  setVisibility(hidden) { this.send({ type: 'visibility', hidden }); }
}

/* -------------------------------------------------------------- chat UI */

const STORAGE_KEY = 'clawmate:chatlog';
const MAX_ENTRIES = 300;

function loadEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export class ChatView {
  constructor(els, socket, opts = {}) {
    this.log = els.log;
    this.input = els.input;
    this.form = els.form;
    this.micBtn = els.micBtn;
    this.socket = socket;
    this.opts = opts;
    // `entries` is the full, persisted, cross-refresh log (Telegram-style, never cleared).
    // `history` is just the sliding context sent to the model - it resets on a new session
    // even though the entries (and their DOM bubbles) stay visible below the divider.
    this.entries = loadEntries();
    this.history = this.contextEntries();
    this.pending = null;
    this.recognition = null;

    this.renderHistory();

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit(this.input.value);
    });
    this.micBtn.addEventListener('click', () => this.toggleVoice());

    socket.addEventListener('start', () => this.beginReply());
    socket.addEventListener('delta', (e) => this.appendDelta(e.detail.text));
    socket.addEventListener('replace', (e) => this.replaceReply(e.detail.text));
    socket.addEventListener('done', (e) => this.finishReply(e.detail.text));
    socket.addEventListener('error', (e) => this.failReply(e.detail));
  }

  // Messages since the last "new session" divider - what actually gets sent as context.
  contextEntries() {
    const cut = this.entries.map((e) => e.role).lastIndexOf('divider') + 1;
    return this.entries.slice(cut).map(({ role, text }) => ({ role, text }));
  }

  persistEntry(role, text) {
    this.entries.push({ role, text });
    if (this.entries.length > MAX_ENTRIES) this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries)); } catch { /* private mode */ }
  }

  renderHistory() {
    if (!this.entries.length) {
      // ChatView is constructed before applyLang()/applyTranslations() run at startup, so
      // this placeholder needs data-i18n to get corrected once the real language is known.
      this.log.innerHTML = `<p class="chat-empty" data-i18n="emptyChat">${t('emptyChat')}</p>`;
      return;
    }
    this.log.innerHTML = '';
    for (const entry of this.entries) {
      if (entry.role === 'divider') this.renderDivider(entry.text);
      else this.renderBubble(entry.role === 'user' ? 'me' : 'pet', entry.text);
    }
    this.scroll();
  }

  // Starts a fresh context window without discarding the visible history, like
  // Telegram keeping old messages above a "history cleared" marker.
  startNewSession() {
    this.history = [];
    const label = t('sessionStarted');
    this.renderDivider(label);
    this.persistEntry('divider', label);
    this.scroll();
  }

  submit(raw) {
    const text = (raw || '').trim();
    if (!text || this.pending) return;
    this.input.value = '';
    this.addMessage('me', text);
    this.history.push({ role: 'user', text });
    this.persistEntry('user', text);

    const sent = this.socket.send({
      type: 'chat',
      id: `m-${Date.now()}`,
      text,
      history: this.history.slice(-12),
      petName: this.opts.petName?.()
    });
    if (!sent) this.addMessage('pet', t('errSend'), { error: true });
    else this.opts.onSend?.(text);
  }

  addMessage(who, text, opts = {}) {
    const el = this.renderBubble(who, text, opts);
    this.scroll();
    return el;
  }

  renderBubble(who, text, { error = false, pending = false } = {}) {
    this.log.querySelector('.chat-empty')?.remove();
    const el = document.createElement('div');
    el.className = `msg ${who === 'me' ? 'me' : 'pet'}${error ? ' is-error' : ''}${pending ? ' is-pending' : ''}`;
    el.textContent = text;
    this.log.appendChild(el);
    return el;
  }

  renderDivider(text) {
    this.log.querySelector('.chat-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'chat-divider';
    el.textContent = text;
    this.log.appendChild(el);
    return el;
  }

  scroll() { this.log.scrollTop = this.log.scrollHeight; }

  beginReply() {
    this.pending = this.addMessage('pet', t('thinking'), { pending: true });
    this.buffer = '';
    this.opts.onThinking?.();
  }

  appendDelta(text) {
    if (!this.pending) this.beginReply();
    if (!this.buffer) {
      this.pending.classList.remove('is-pending');
      this.pending.textContent = '';
      this.opts.onReplyStart?.();
    }
    this.buffer += text;
    this.pending.textContent = this.buffer;
    this.scroll();
  }

  replaceReply(text) {
    if (!this.pending) this.beginReply();
    this.pending.classList.remove('is-pending');
    this.buffer = text;
    this.pending.textContent = text;
    this.scroll();
  }

  finishReply(full) {
    const text = (this.buffer || full || '').trim();
    if (!this.pending) return;
    if (!text) {
      this.pending.remove();
    } else {
      this.pending.classList.remove('is-pending');
      this.pending.textContent = text;
      this.history.push({ role: 'assistant', text });
      this.persistEntry('assistant', text);
    }
    this.pending = null;
    this.buffer = '';
    this.scroll();
    this.opts.onReplyEnd?.(text);
  }

  failReply(detail) {
    const message = detail?.code === 'not-configured' ? t('errNoServer') : `${t('errSend')}\n${detail?.message ?? ''}`.trim();
    if (this.pending) {
      this.pending.classList.remove('is-pending');
      this.pending.classList.add('is-error');
      this.pending.textContent = message;
      this.pending = null;
    } else {
      this.addMessage('pet', message, { error: true });
    }
    this.buffer = '';
    this.opts.onReplyEnd?.('');
  }

  /* ------------------------------------------------------------- voice */

  toggleVoice() {
    if (this.recognition) { this.stopVoice(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.opts.onToast?.(t('micUnsupported')); return; }

    const rec = new SR();
    rec.lang = getLang() === 'zh-TW' ? 'zh-TW' : 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    this.recognition = rec;
    this.micBtn.classList.add('is-live');
    this.opts.onToast?.(t('listening'));

    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      this.input.value = (finalText + interim).trim();
    };
    rec.onerror = (e) => {
      this.opts.onToast?.(e.error === 'not-allowed' ? t('micDenied') : t('micUnsupported'));
      this.stopVoice();
    };
    rec.onend = () => {
      const text = this.input.value.trim();
      this.stopVoice();
      if (text) this.submit(text);
    };

    try { rec.start(); } catch { this.stopVoice(); }
  }

  stopVoice() {
    this.micBtn.classList.remove('is-live');
    if (!this.recognition) return;
    const rec = this.recognition;
    this.recognition = null;
    rec.onend = null;
    try { rec.stop(); } catch { /* already stopped */ }
  }
}
