import { CHARACTERS, getCharacter } from './characters.js';
import { renderReal } from './render-real.js?v=24';
import { renderChibi } from './render-chibi.js?v=24';
import { renderPixel } from './render-pixel.js?v=25';
import { Pet } from './pet.js?v=25';
import { attachInteractions } from './interactions.js?v=25';
import { companionApi, needLabel, actionLabel } from './companions.js';
import { PetSocket, ChatView } from './chat.js';
import { initSettings, startNewSession } from './settings.js';
import { setLang, getLang, t, localized, applyTranslations } from './i18n.js';
import { getDeviceId } from './device.js';
import { appUrl } from './urls.js';

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

/* --------------------------------------------------------- device pairing */
// The backend rejects any request from a device the operator hasn't approved
// (see server/devices.js). Show a blocking screen with this device's id and the
// approval command until that happens, then poll and reload once it does.
async function checkDeviceApproved() {
  try {
    const res = await fetch(appUrl('api/device/status'));
    return await res.json();
  } catch {
    return { approved: true }; // can't reach the server - let the rest of the app degrade offline as usual
  }
}

(async function guardDevice() {
  const status = await checkDeviceApproved();
  if (status.approved) return;
  const deviceId = status.deviceId || getDeviceId();
  $('pairingDeviceId').textContent = deviceId;
  $('pairingCmd').textContent = `./start.sh approve ${deviceId}`;
  $('pairingScreen').hidden = false;
  const poll = setInterval(async () => {
    const next = await checkDeviceApproved();
    if (next.approved) { clearInterval(poll); window.location.reload(); }
  }, 4000);
})();

$('pairingCopyBtn').addEventListener('click', () => {
  navigator.clipboard?.writeText($('pairingCmd').textContent).then(() => {
    $('pairingCopyBtn').textContent = t('pairingCopied');
    setTimeout(() => { $('pairingCopyBtn').textContent = t('pairingCopy'); }, 1600);
  }).catch(() => {});
});

let currentId = prefs.get('character', 'momo');
if (!getCharacter(currentId).visible) currentId = 'momo';
let artStyle = prefs.get('style', 'hd');
if (!['hd', 'chibi', 'pixel'].includes(artStyle)) artStyle = 'hd';
let companions = {};

function renderCharacter(spec, presentation = 'crop') {
  if (artStyle === 'pixel') return renderPixel(spec, presentation);
  if (artStyle === 'chibi') return renderChibi(spec, presentation);
  return renderReal(spec, presentation);
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
  renderCompanion();
  buildCharacterGrid();
  // Keeps red-zone push notifications (sent while the app may be closed) in the
  // language the user actually reads, since that check runs entirely server-side.
  fetch(appUrl('api/settings'), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang })
  }).catch(() => {});
}
$('langBtn').addEventListener('click', () => applyLang(getLang() === 'zh-TW' ? 'en' : 'zh-TW'));

/* ------------------------------------------------------------------- pet */
const pet = new Pet(stage, {
  reducedMotion: prefs.get('reducedMotion', false),
  onReact: (key) => {
    showBubble(t(key));
    const action = { reactPet: 'pet', reactHug: 'hug', reactFeed: 'feed' }[key];
    if (action && companions[currentId]?.actions.some((item) => item.id === action)) {
      companionApi.act(currentId, action).then((next) => { companions[currentId] = next; renderCompanion(); }).catch(() => {});
    }
  }
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

function renderCompanion() {
  const data = companions[currentId];
  const spec = getCharacter(currentId);
  const panel = $('companionPanel');
  if (!data || !spec.companion) { panel.hidden = true; return; }
  panel.hidden = false;
  $('barAffinity').style.width = `${data.affinity}%`;
  $('affinityValue').textContent = `${data.affinity}%`;
  $('personalityText').textContent = localized(spec.companion.personality);
  const grid = $('needGrid');
  grid.innerHTML = '';
  Object.entries(data.needs).forEach(([id, value]) => {
    const el = document.createElement('div');
    const color = value < 35 ? 'var(--err)' : value < 60 ? 'var(--warn)' : 'var(--ok)';
    el.className = 'need-card';
    el.innerHTML = `<span><b>${needLabel(id, getLang())}</b><b>${value}</b></span><i style="--need:${value}%;--need-color:${color}"></i>`;
    grid.appendChild(el);
  });
  const actions = $('actionGrid');
  actions.innerHTML = '';
  data.actions.forEach((action) => {
    const label = actionLabel(currentId, action.id, getLang());
    const button = document.createElement('button');
    button.className = 'action-btn'; button.type = 'button'; button.textContent = label;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        companions[currentId] = await companionApi.act(currentId, action.id);
        renderCompanion();
        pet.react(action.id === 'feed' ? 'feed' : action.id === 'hug' ? 'hug' : 'pet');
        showBubble(`${label} ♥`);
      } catch { showBubble(t('errSend')); }
      finally { button.disabled = false; }
    });
    actions.appendChild(button);
  });
}

async function loadCompanions() {
  try {
    const state = await companionApi.get();
    companions = state.companions;
    currentId = state.activeId;
    prefs.set('character', currentId);
    mountPet();
    renderCompanion();
  } catch { /* offline: keep the pet usable */ }
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
let switchCandidateId = null;
const TRAITS = {
  momo: [['活潑感', 'Liveliness', 92], ['分享慾', 'Sharing', 94], ['儀式感', 'Thoughtfulness', 70]],
  aria: [['知性', 'Depth', 94], ['沉穩度', 'Composure', 91], ['親近感', 'Warmth', 66]],
  mochi: [['黏人度', 'Affection', 90], ['玩心', 'Playfulness', 74], ['挑剔度', 'Pickiness', 78]],
  coco: [['活力', 'Energy', 96], ['外出慾', 'Outdoors', 94], ['親人度', 'Sociability', 88]]
};

function previewCharacter(id) {
  const spec = getCharacter(id);
  switchCandidateId = id;
  $('switchPreview').hidden = false;
  $('switchPreviewArt').innerHTML = renderCharacter(spec);
  $('switchPreviewName').textContent = localized(spec.name);
  $('switchPreviewTag').textContent = localized(spec.tagline);
  $('switchPreviewPersonality').textContent = localized(spec.companion?.personality);
  const traits = $('traitList');
  traits.innerHTML = '';
  (TRAITS[id] || []).forEach(([zh, en, value]) => {
    const item = document.createElement('div');
    item.className = 'trait';
    item.innerHTML = `<span>${getLang() === 'zh-TW' ? zh : en}</span><i style="--trait:${value}%"></i><b>${value}</b>`;
    traits.appendChild(item);
  });
  $('selectPreviewBtn').textContent = id === currentId ? t('currentCharacter') : t('selectThisCharacter');
  $('selectPreviewBtn').disabled = id === currentId;
}

function buildCharacterGrid() {
  const grid = $('charGrid');
  grid.innerHTML = '';
  for (const spec of CHARACTERS.filter((entry) => entry.visible)) {
    const card = document.createElement('button');
    card.className = `char-card${spec.id === currentId ? ' is-on' : ''}`;
    card.dataset.id = spec.id;
    card.innerHTML = `${renderCharacter(spec)}
      <b>${localized(spec.name)}</b><span>${localized(spec.tagline)}</span>`;
    card.addEventListener('click', () => previewCharacter(spec.id));
    grid.appendChild(card);
  }
}

const sheet = $('sheet');
function resetSheetMotion(target) {
  const body = target.querySelector('.sheet-body');
  const backdrop = target.querySelector('.sheet-backdrop');
  body.style.transform = ''; body.style.transition = ''; backdrop.style.opacity = '';
}
const openSheet = () => {
  resetSheetMotion(sheet);
  buildCharacterGrid();
  sheet.hidden = false;
  // Always start with the active companion, rather than retaining the last
  // character inspected in a previous visit to the picker.
  previewCharacter(currentId);
};
const closeSheet = () => { resetSheetMotion(sheet); sheet.hidden = true; };
$('switchBtn').addEventListener('click', openSheet);
sheet.addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) closeSheet(); });

const switchModal = $('switchModal');
const previewLightbox = $('previewLightbox');
$('switchPreviewArt').addEventListener('click', () => {
  if (!switchCandidateId) return;
  $('previewLightboxArt').innerHTML = renderCharacter(getCharacter(switchCandidateId), 'full');
  previewLightbox.hidden = false;
});
previewLightbox.addEventListener('click', (e) => { if (e.target.dataset.previewClose !== undefined) previewLightbox.hidden = true; });
$('selectPreviewBtn').addEventListener('click', () => {
  if (!switchCandidateId || switchCandidateId === currentId) return;
  const name = localized(getCharacter(switchCandidateId).name);
  $('switchModalText').textContent = t('switchCharacterConfirm').replace('{name}', name);
  switchModal.hidden = false;
});
switchModal.addEventListener('click', (e) => { if (e.target.dataset.switchCancel !== undefined) switchModal.hidden = true; });
$('confirmSwitchBtn').addEventListener('click', async () => {
  if (!switchCandidateId) return;
  const button = $('confirmSwitchBtn'); button.disabled = true;
  try {
    const state = await companionApi.select(switchCandidateId);
    companions = state.companions; currentId = state.activeId; prefs.set('character', currentId);
    mountPet(); renderCompanion(); closeSheet(); switchModal.hidden = true; pet.react('doubleTap'); showBubble(t('switchCharacterDone'));
  } catch { showBubble(t('errSend')); }
  finally { button.disabled = false; }
});

const careSheet = $('careSheet');
$('careBtn').addEventListener('click', () => { resetSheetMotion(careSheet); renderCompanion(); careSheet.hidden = false; });
const closeCareSheet = () => { resetSheetMotion(careSheet); careSheet.hidden = true; };
careSheet.addEventListener('click', (e) => { if (e.target.dataset.careClose !== undefined) closeCareSheet(); });

function attachSheetDismissDrag(target, close) {
  const handle = target.querySelector('.sheet-grabber');
  const body = target.querySelector('.sheet-body');
  const backdrop = target.querySelector('.sheet-backdrop');
  let startY = null;
  handle.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    handle.setPointerCapture?.(event.pointerId);
    body.classList.add('is-dragging');
    // Fully own this gesture so mobile browsers don't also queue a compatibility
    // click/scroll for it - that stray event is what eats the *next*, unrelated tap.
    event.preventDefault();
  });
  handle.addEventListener('pointermove', (event) => {
    if (startY == null) return;
    event.preventDefault();
    const distance = Math.max(0, event.clientY - startY);
    body.style.transform = `translateY(${distance}px)`;
    backdrop.style.opacity = String(Math.max(.12, 1 - distance / 240));
  });
  const finish = (event) => {
    if (startY == null) return;
    event?.preventDefault();
    const distance = Math.max(0, event.clientY - startY);
    startY = null; body.classList.remove('is-dragging');
    if (distance > 96) {
      // Hiding the sheet (and its now-detached-looking handle) in the same tick as the
      // closing pointerup is what triggers the "first tap after does nothing" bug on
      // mobile WebKit - defer it past this event's dispatch so the next tap lands clean.
      requestAnimationFrame(close);
    } else {
      body.style.transition = 'transform .22s cubic-bezier(.22,1,.36,1)';
      body.style.transform = 'translateY(0)'; backdrop.style.opacity = '1';
      setTimeout(() => resetSheetMotion(target), 240);
    }
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
}
attachSheetDismissDrag(sheet, closeSheet);
attachSheetDismissDrag(careSheet, closeCareSheet);

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
    onSend: () => {
      interactions.bumpIdle(); pet.express('happy', 1200);
      companionApi.chat().then((state) => { companions = state.companions; currentId = state.activeId; renderCompanion(); }).catch(() => {});
    },
    onThinking: () => pet.thinking(),
    onReplyStart: () => pet.startTalking(),
    onReplyEnd: (text) => { pet.stopTalking(); if (text) showBubble(text.slice(0, 60)); },
    onToast: (msg) => showBubble(msg)
  }
);

document.addEventListener('visibilitychange', () => socket.setVisibility(document.hidden));
socket.connect();

const newSessionModal = $('newSessionModal');
const closeNewSessionModal = () => { newSessionModal.hidden = true; };
$('newSessionBtn').addEventListener('click', () => { newSessionModal.hidden = false; });
newSessionModal.addEventListener('click', (e) => {
  if (e.target.dataset.newSessionCancel !== undefined) closeNewSessionModal();
});
$('confirmNewSessionBtn').addEventListener('click', async () => {
  const button = $('confirmNewSessionBtn');
  button.disabled = true;
  try {
    await startNewSession();
    chat.startNewSession();
    closeNewSessionModal();
    showBubble(t('sessionStarted'));
  } catch {
    showBubble(t('errSend'));
  } finally {
    button.disabled = false;
  }
});

/* -------------------------------------------------------------- refresh */
$('refreshBtn').addEventListener('click', () => refreshPage());

/* ------------------------------------------------------- service worker */
let swRegistration = null;
const swReady = async () => {
  if (swRegistration) return swRegistration;
  swRegistration = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  return swRegistration;
};
if ('serviceWorker' in navigator) swReady().catch(() => {});

/* ---------------------------------------------------------- pull refresh */
const pull = $('pullRefresh');
const pullText = $('pullRefreshText');
let pullStart = null;
const PULL_DISTANCE = 220;
document.querySelector('.main').addEventListener('pointerdown', (event) => {
  if (event.target.closest('input, button, select, .chat-log')) return;
  pullStart = { y: event.clientY, view: app.dataset.view };
  // The stage already captures its own pointer so its gesture layer can cancel
  // a long-press when the pull turns into a drag. Other page areas use main.
  if (!event.target.closest('.stage')) event.currentTarget.setPointerCapture?.(event.pointerId);
});
document.querySelector('.main').addEventListener('pointermove', (event) => {
  if (!pullStart || pullStart.view !== app.dataset.view) return;
  const distance = Math.max(0, event.clientY - pullStart.y);
  if (!distance) return;
  pull.style.setProperty('--pull-progress', `${Math.min(100, distance / PULL_DISTANCE * 100)}%`);
  pull.style.transform = `translate(-50%, ${Math.min(8, -90 + distance)}px)`;
  pull.classList.toggle('is-pulling', distance > 12);
  pull.classList.toggle('is-ready', distance >= PULL_DISTANCE);
  pullText.textContent = t(distance >= PULL_DISTANCE ? 'releaseToRefresh' : 'pullToRefresh');
});
async function refreshPage() {
  pull.className = 'pull-refresh is-loading';
  pull.style.setProperty('--pull-progress', '100%');
  pullText.textContent = t('refreshing');
  try { await swReady().then((registration) => registration.update()); } catch { /* still reload from the network when possible */ }
  pull.className = 'pull-refresh is-done';
  pullText.textContent = t('refreshDone');
  setTimeout(() => window.location.reload(), 650);
}
document.querySelector('.main').addEventListener('pointerup', (event) => {
  if (!pullStart) return;
  const shouldRefresh = event.clientY - pullStart.y >= PULL_DISTANCE;
  pullStart = null;
  if (shouldRefresh) refreshPage();
  else { pull.className = 'pull-refresh'; pull.style.transform = ''; pull.style.removeProperty('--pull-progress'); }
});
document.querySelector('.main').addEventListener('pointercancel', () => { pullStart = null; pull.className = 'pull-refresh'; pull.style.transform = ''; pull.style.removeProperty('--pull-progress'); });

/* -------------------------------------------------------------- settings */
const settings = initSettings(
  {
    url: $('setUrl'), token: $('setToken'), agent: $('setAgent'), transport: $('setTransport'),
    petName: $('setPetName'), push: $('setPush'), haptics: $('setHaptics'),
    motion: $('setMotion'), needAlerts: $('setNeedAlerts'), dndStart: $('setDndStart'), dndEnd: $('setDndEnd'),
    saveBtn: $('saveBtn'), testBtn: $('testBtn'), reloadAgents: $('reloadAgents'),
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
loadCompanions();

// iOS Safari double-tap zoom fights the gesture layer.
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
