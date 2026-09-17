import { CHARACTERS, getCharacter } from './characters.js';
import { renderHD } from './render-hd.js';
import { renderChibi } from './render-chibi.js';
import { renderPixel } from './render-pixel.js';
import { Pet } from './pet.js';
import { attachInteractions } from './interactions.js';
import { PetSocket, ChatView } from './chat.js';
import { initSettings, startNewSession } from './settings.js';
import { setLang, getLang, t, localized, applyTranslations } from './i18n.js';

/* ------------------------------------------------------------------ prefs */
const STORE = 'clawmate:prefs';
const prefs = {
  data: (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })(),
  get(key, fallback) { return this.data[key] ?? fallback; },
  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem(STORE, JSON.stringify(this.data)); } catch { /* private mode */ }
  }
};

const $ = (id) => document.getElementById(id);
const app = document.querySelector('.app');
const stage = $('stage');

let currentId = prefs.get('character', 'momo');
let artStyle = prefs.get('style', 'hd');
if (!['hd', 'chibi', 'pixel'].includes(artStyle)) artStyle = 'hd';

function renderCharacter(spec) {
  if (artStyle === 'pixel') return renderPixel(spec);
  if (artStyle === 'chibi') return renderChibi(spec);
  return renderHD(spec);
}

/* ------------------------------------------------------------------ theme */
function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  prefs.set('theme', mode);
}
applyTheme(prefs.get('theme', 'auto'));

$('themeBtn').addEventListener('click', () => {
  const order = ['light', 'dark', 'auto'];
  const next = order[(order.indexOf(document.documentElement.dataset.theme) + 1) % order.length];
  applyTheme(next);
});

/* --------------------------------------------------------------- language */
function applyLang(lang) {
  setLang(lang);
  prefs.set('lang', lang);
  $('langLabel').textContent = lang === 'zh-TW' ? 'EN' : '中';
  refreshPetLabels();
  buildCharacterGrid();
}
$('langBtn').addEventListener('click', () => applyLang(getLang() === 'zh-TW' ? 'en' : 'zh-TW'));

/* ------------------------------------------------------------------- pet */
const pet = new Pet(stage, {
  reducedMotion: prefs.get('reducedMotion', false),
  onReact: (key) => showBubble(t(key))
});
pet.setReducedMotion(prefs.get('reducedMotion', false));

function mountPet() {
  const spec = getCharacter(currentId);
  pet.mount(spec, artStyle);
  refreshPetLabels();
}

function refreshPetLabels() {
  const spec = getCharacter(currentId);
  $('petName').textContent = prefs.get('petName', '') || localized(spec.name);
  $('petTag').textContent = localized(spec.tagline);
}

let bubbleTimer = null;
function showBubble(text) {
  if (!text) return;
  $('bubbleText').textContent = text;
  $('bubble').hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { $('bubble').hidden = true; }, 2600);
}

stage.addEventListener('pet:stats', (e) => {
  $('barMood').style.width = `${e.detail.mood}%`;
  $('barEnergy').style.width = `${e.detail.energy}%`;
});

const interactions = attachInteractions(stage, pet, { haptics: () => prefs.get('haptics', true) });

/* --------------------------------------------------------- character grid */
function buildCharacterGrid() {
  const grid = $('charGrid');
  grid.innerHTML = '';
  for (const spec of CHARACTERS) {
    const card = document.createElement('button');
    card.className = `char-card${spec.id === currentId ? ' is-on' : ''}`;
    card.dataset.id = spec.id;
    card.innerHTML = `${renderCharacter(spec)}
      <b>${localized(spec.name)}</b><span>${localized(spec.tagline)}</span>`;
    card.addEventListener('click', () => {
      currentId = spec.id;
      prefs.set('character', spec.id);
      mountPet();
      buildCharacterGrid();
      closeSheet();
      pet.react('doubleTap');
    });
    grid.appendChild(card);
  }
}

const sheet = $('sheet');
const openSheet = () => { buildCharacterGrid(); sheet.hidden = false; };
const closeSheet = () => { sheet.hidden = true; };
$('pickBtn').addEventListener('click', openSheet);
sheet.addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) closeSheet(); });

/* ------------------------------------------------------------- art style */
document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.classList.toggle('is-on', btn.dataset.style === artStyle);
  btn.addEventListener('click', () => {
    artStyle = btn.dataset.style;
    prefs.set('style', artStyle);
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.style === artStyle));
    mountPet();
    pet.express('excited', 1200);
  });
});

/* ------------------------------------------------------------------ tabs */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    app.dataset.view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-on', x === tab));
    if (tab.dataset.view === 'chat') setTimeout(() => chat.scroll(), 50);
  });
});

/* --------------------------------------------------------------- socket */
const socket = new PetSocket();
const connEl = $('conn');

function setConn(state, key) {
  connEl.dataset.state = state;
  $('connText').textContent = t(key);
  $('connText').dataset.i18n = key;
}

socket.addEventListener('state', (e) => {
  const map = {
    connecting: ['wait', 'connecting'],
    reconnecting: ['wait', 'reconnecting'],
    open: ['ok', 'connected'],
    closed: ['err', 'disconnected'],
    error: ['err', 'disconnected']
  };
  const [state, key] = map[e.detail.state] || ['idle', 'disconnected'];
  setConn(state, key);
});

socket.addEventListener('ready', (e) => {
  if (!e.detail.config?.configured) setConn('warn', 'notConfigured');
});

const chat = new ChatView(
  { log: $('chatLog'), input: $('chatInput'), form: $('composer'), micBtn: $('micBtn') },
  socket,
  {
    petName: () => prefs.get('petName', '') || localized(getCharacter(currentId).name),
    onSend: () => { interactions.bumpIdle(); pet.express('happy', 1200); },
    onThinking: () => pet.thinking(),
    onReplyStart: () => pet.startTalking(),
    onReplyEnd: (text) => { pet.stopTalking(); if (text) showBubble(text.slice(0, 60)); },
    onToast: (msg) => showBubble(msg)
  }
);

document.addEventListener('visibilitychange', () => socket.setVisibility(document.hidden));
socket.connect();

$('newSessionBtn').addEventListener('click', async () => {
  if (!confirm(t('newSessionConfirm'))) return;
  try {
    await startNewSession();
    chat.clear();
    showBubble(t('sessionStarted'));
  } catch {
    showBubble(t('errSend'));
  }
});

/* ---------------------------------------------------------- PWA install */
let deferredInstall = null;
const installBtn = $('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  installBtn.hidden = true;
  if (outcome === 'accepted') showBubble(t('installed'));
});

window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  installBtn.hidden = true;
  showBubble(t('installed'));
});

/* ------------------------------------------------------- service worker */
let swRegistration = null;
const swReady = async () => {
  if (swRegistration) return swRegistration;
  swRegistration = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  return swRegistration;
};
if ('serviceWorker' in navigator) swReady().catch(() => {});

/* -------------------------------------------------------------- settings */
const settings = initSettings(
  {
    url: $('setUrl'), token: $('setToken'), agent: $('setAgent'), transport: $('setTransport'),
    petName: $('setPetName'), push: $('setPush'), sound: $('setSound'), haptics: $('setHaptics'),
    motion: $('setMotion'), saveBtn: $('saveBtn'), testBtn: $('testBtn'), reloadAgents: $('reloadAgents'),
    saveResult: $('saveResult'), testResult: $('testResult'), pushResult: $('pushResult')
  },
  {
    prefs,
    swReady,
    onSaved: () => { setConn('ok', 'connected'); showBubble(t('saved')); },
    onPrefChange: (key, value) => {
      if (key === 'reducedMotion') pet.setReducedMotion(value);
      if (key === 'petName') refreshPetLabels();
    }
  }
);
settings.load().then((cfg) => { if (!cfg.configured) setConn('warn', 'notConfigured'); });

/* ------------------------------------------------------------------ boot */
applyLang(prefs.get('lang', navigator.language?.startsWith('zh') ? 'zh-TW' : 'en'));
mountPet();
applyTranslations();

// iOS Safari double-tap zoom fights the gesture layer.
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
