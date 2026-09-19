import { CHARACTERS, getCharacter } from './characters.js';
import { renderReal } from './render-real.js?v=26';
import { renderChibi } from './render-chibi.js?v=25';
import { renderPixel } from './render-pixel.js?v=28';
import { renderCartoon, hasCartoonArt } from './render-cartoon.js?v=2';
import { Pet } from './pet.js?v=39';
import { attachInteractions } from './interactions.js?v=28';
import { companionApi, needLabel, actionLabel, FEED_ACTION, MINIGAME_TUNING } from './companions.js';
import { PetSocket, ChatView } from './chat.js';
import { initSettings, startNewSession } from './settings.js';
import { playCatchGame } from './minigame.js';
import { recordEvent, listAchievements } from './achievements.js';
import { pickReactionLine, pickCooldownLine } from './dialogue.js';
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

// Flavor emoji for each companion's feeding-type mini-game (see FEED_ACTION).
const FEED_EMOJI = { momo: '🍰', aria: '🍵', mochi: '🐟', coco: '🦴' };

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
if (!['hd', 'chibi', 'cartoon', 'pixel'].includes(artStyle)) artStyle = 'hd';
let companions = {};

function renderCharacter(spec, presentation = 'crop') {
  if (artStyle === 'pixel') return renderPixel(spec, presentation);
  if (artStyle === 'cartoon') return hasCartoonArt(spec) ? renderCartoon(spec) : renderChibi(spec, presentation);
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

/* --------------------------------------------------------- topbar overflow */
// Language and refresh are used rarely, so they live behind a "more" popover
// instead of crowding the topbar next to the brand/connection status.
const moreMenu = $('moreMenu');
const moreBtn = $('moreBtn');
const closeMoreMenu = () => { moreMenu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); };
moreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const willOpen = moreMenu.hidden;
  moreMenu.hidden = !willOpen;
  moreBtn.setAttribute('aria-expanded', String(willOpen));
});
document.addEventListener('click', (e) => {
  if (!moreMenu.hidden && !e.target.closest('.topbar-more')) closeMoreMenu();
});
moreMenu.addEventListener('click', (e) => {
  if (e.target.closest('button')) closeMoreMenu();
});

/* ------------------------------------------------------------------- pet */
const pet = new Pet(stage, {
  reducedMotion: prefs.get('reducedMotion', false),
  onReact: (key) => {
    const action = { reactPet: 'pet', reactHug: 'hug', reactFeed: 'feed' }[key];
    // Characters without companion/bond data (the cosmetic gallery entries)
    // fall back to the old single canned line - there's no state to gate on.
    if (!action || !companions[currentId]?.actions.some((item) => item.id === action)) {
      showBubble(t(key));
      return;
    }
    companionApi.act(currentId, action).then((next) => {
      companions[currentId] = next;
      renderCompanion();
      // On cooldown means this tap changed nothing server-side - stay silent
      // rather than nag on every rapid tap; the pet's own tap animation is
      // still the tactile feedback either way.
      if (next.cooldown) return;
      showBubble(pickReactionLine(currentId, getLang(), action));
      announceUnlocks(recordEvent('interaction'));
      announceUnlocks(recordEvent('actionUsed', { id: currentId, actionId: action }));
      syncTierStat();
      handleTierUp(next.tierUp);
    }).catch(() => {});
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

// Timers that re-enable a cooldown-disabled action button exactly when its
// cooldown ends; cleared and rebuilt on every render (see renderCompanion).
let cooldownTimers = [];

function renderCompanion() {
  const data = companions[currentId];
  const spec = getCharacter(currentId);
  const panel = $('companionPanel');
  if (!data || !spec.companion) { panel.hidden = true; return; }
  panel.hidden = false;
  $('barAffinity').style.width = `${data.affinity}%`;
  $('affinityValue').textContent = `${data.affinity}%`;
  $('tierBadge').textContent = data.tier ? t('tierStage').replace('{tier}', localized(data.tier.label)) : '';
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
  // Rebuilt on every render (including right after an action call), so any
  // pending re-enable timers from the previous set of buttons are stale.
  cooldownTimers.forEach(clearTimeout);
  cooldownTimers = [];
  data.actions.forEach((action) => {
    const label = actionLabel(currentId, action.id, getLang());
    const button = document.createElement('button');
    button.className = 'action-btn'; button.type = 'button'; button.textContent = label;
    const readyInMs = action.readyInMs || 0;
    if (readyInMs > 0) {
      button.disabled = true;
      button.title = t('actionCooldownHint').replace('{min}', String(Math.max(1, Math.ceil(readyInMs / 60000))));
      cooldownTimers.push(setTimeout(() => { button.disabled = false; button.title = ''; }, readyInMs));
    }
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        let bonus = 0;
        if (action.id === FEED_ACTION[currentId]) {
          // The action buttons live in the care sheet, which sits above the pet
          // stage - close it first so the falling mini-game items are reachable.
          closeCareSheet();
          bonus = await playCatchGame(stage, {
            emoji: FEED_EMOJI[currentId] || '🍎',
            reducedMotion: prefs.get('reducedMotion', false),
            lang: getLang(),
            ...MINIGAME_TUNING[currentId]
          });
          if (bonus >= 3) announceUnlocks(recordEvent('perfectCatch'));
        }
        const next = await companionApi.act(currentId, action.id, bonus);
        companions[currentId] = next;
        renderCompanion();
        if (next.cooldown) {
          showBubble(pickCooldownLine(currentId, getLang()) || t('actionCooldown'));
        } else {
          pet.react(action.id === 'feed' ? 'feed' : action.id === 'hug' ? 'hug' : 'pet');
          const line = pickReactionLine(currentId, getLang(), action.id);
          showBubble(bonus ? `${line} ♥ +${bonus}` : line);
          announceUnlocks(recordEvent('interaction'));
          announceUnlocks(recordEvent('actionUsed', { id: currentId, actionId: action.id }));
          syncTierStat();
          handleTierUp(next.tierUp);
        }
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
    syncTierStat();
    handleCheckIn(state.checkIn);
  } catch { /* offline: keep the pet usable */ }
}

// The server grants this at most once per calendar day (see advanceCheckIn in
// server/companions.js), so this only ever fires on the first load/refresh of
// a new day - never from clicking around within the same visit.
function handleCheckIn(checkIn) {
  if (!checkIn?.isNew) return;
  announceUnlocks(recordEvent('streak', checkIn.streak));
  showBubble(t('dailyCheckIn').replace('{streak}', String(checkIn.streak)));
}

let bubbleTimer = null;
function showBubble(text) {
  if (!text) return;
  $('bubbleText').textContent = text;
  $('bubble').hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { $('bubble').hidden = true; }, 2600);
}

/* ------------------------------------------------------------- gamification */
// Called after every companions-state update so the achievement tracker's
// "highest bond stage reached" stat stays current regardless of which flow
// (action, gesture, chat, switch) advanced it.
function syncTierStat() {
  const tier = companions[currentId]?.tier;
  if (tier) announceUnlocks(recordEvent('tier', { id: currentId, index: tier.index }));
}

function announceUnlocks(newlyUnlocked) {
  if (!newlyUnlocked?.length) return;
  newlyUnlocked.forEach((a, i) => {
    setTimeout(() => showBubble(`🏆 ${t('achievementUnlocked').replace('{title}', localized(a.title))}`), i * 2800);
  });
}

function handleTierUp(tierUp) {
  if (!tierUp) return;
  $('tierUpText').textContent = t('tierUpBody').replace('{tier}', localized(tierUp.label));
  $('tierUpModal').hidden = false;
  pet.express('love', 3200);
  pet.burst('heart', null, 14);
}

function buildAchievementsGrid() {
  const grid = $('achievementGrid');
  grid.innerHTML = '';
  for (const a of listAchievements()) {
    const card = document.createElement('div');
    card.className = `achievement-card${a.unlocked ? '' : ' is-locked'}`;
    card.innerHTML = `<span class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</span>
      <span class="achievement-copy"><b>${localized(a.title)}</b><span>${a.unlocked ? localized(a.desc) : t('lockedAchievement')}</span></span>`;
    grid.appendChild(card);
  }
}
const achievementsSheet = $('achievementsSheet');
$('achievementsBtn').addEventListener('click', () => {
  resetSheetMotion(achievementsSheet);
  buildAchievementsGrid();
  achievementsSheet.hidden = false;
});
const closeAchievementsSheet = () => { resetSheetMotion(achievementsSheet); achievementsSheet.hidden = true; };
achievementsSheet.addEventListener('click', (e) => { if (e.target.dataset.achievementsClose !== undefined) closeAchievementsSheet(); });

$('tierUpModal').addEventListener('click', (e) => { if (e.target.dataset.tierClose !== undefined) $('tierUpModal').hidden = true; });

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
    announceUnlocks(recordEvent('switch'));
    syncTierStat();
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
attachSheetDismissDrag(achievementsSheet, closeAchievementsSheet);

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
      announceUnlocks(recordEvent('chat'));
      companionApi.chat().then((state) => {
        companions = state.companions; currentId = state.activeId; renderCompanion();
        syncTierStat();
        handleTierUp(companions[currentId]?.tierUp);
      }).catch(() => {});
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
