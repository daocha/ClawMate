import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, getConfig } from './config.js';

const FILE = path.join(DATA_DIR, 'companions.json');
const RED_ZONE = 35;

const NEED_LABELS = {
  affinity: ['親密度', 'Bond'],
  care: ['關心', 'Care'], affection: ['親密', 'Affection'], meals: ['飲食', 'Meals'], rest: ['休息', 'Rest'],
  sharing: ['分享', 'Sharing'], outing: ['外出', 'Outing'], dialogue: ['交流', 'Dialogue'], qualityTime: ['相處', 'Together'],
  food: ['飢餓', 'Hunger'], water: ['口渴', 'Thirst'], litter: ['貓砂盆', 'Litter'], play: ['玩樂', 'Play'],
  grooming: ['梳毛', 'Grooming'], walk: ['散步', 'Walk'], toilet: ['如廁', 'Toilet'], bath: ['清潔', 'Bath']
};

function needLabel(key, lang) {
  return NEED_LABELS[key]?.[lang === 'zh-TW' ? 0 : 1] || key;
}

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// The do-not-disturb window is configurable from Settings (server/config.js
// dndStart/dndEnd) and drives both the sleeping-hours bond-decay pause and the
// suppression of red-zone push notifications, so the two stay in sync.
function quietWindowMinutes() {
  const cfg = getConfig();
  const start = toMinutes(cfg.dndStart);
  const end = toMinutes(cfg.dndEnd);
  return { start: start ?? 0, end: end ?? 10 * 60 };
}

function inWindow(value, start, end) {
  if (start === end) return false;
  return start < end ? (value >= start && value < end) : (value >= start || value < end);
}

export function isQuietNow(now = new Date()) {
  const { start, end } = quietWindowMinutes();
  return inWindow(now.getHours() * 60 + now.getMinutes(), start, end);
}

// Each companion owns its own needs, personality-facing actions and affinity.
// The file is deliberately plain JSON so it can later be replaced by a DB without
// changing the API consumed by the PWA.
export const COMPANION_DEFS = {
  momo: {
    version: 2, affinity: 58, needs: { sharing: 76, affection: 72, outing: 68, meals: 82 },
    actions: {
      share: { label: '分享今天的小事', affinity: 4, needs: { sharing: 26 } },
      walk: { label: '一起散步拍照', affinity: 4, needs: { outing: 28, sharing: 8 } },
      hug: { label: '溫柔抱抱', affinity: 4, needs: { affection: 24 } },
      treat: { label: '準備小點心', affinity: 3, needs: { meals: 26, affection: 6 } }
    }
  },
  aria: {
    version: 2, affinity: 52, needs: { dialogue: 70, qualityTime: 66, meals: 78, rest: 84 },
    actions: {
      deepTalk: { label: '深度聊聊', affinity: 5, needs: { dialogue: 30 } },
      read: { label: '安靜共讀', affinity: 4, needs: { qualityTime: 27, rest: 8 } },
      tea: { label: '泡杯茶陪伴', affinity: 4, needs: { qualityTime: 22, dialogue: 10 } },
      cook: { label: '準備一頓晚餐', affinity: 4, needs: { meals: 28, qualityTime: 7 } }
    }
  },
  mochi: {
    affinity: 64, needs: { food: 78, water: 82, litter: 86, play: 68, grooming: 74, affection: 72 },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 } },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 } },
      litter: { label: '鏟貓砂', affinity: 4, needs: { litter: 40 } },
      pet: { label: '摸摸頭', affinity: 3, needs: { affection: 24 } },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 19 } },
      groom: { label: '梳毛', affinity: 4, needs: { grooming: 35, affection: 8 } },
      teaser: { label: '逗貓棒', affinity: 4, needs: { play: 34 } }
    }
  },
  coco: {
    affinity: 66, needs: { food: 80, water: 84, walk: 70, toilet: 82, bath: 88, play: 76, affection: 74 },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 } },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 } },
      walk: { label: '出去散步', affinity: 5, needs: { walk: 38, toilet: 25, play: 12 } },
      toilet: { label: '帶去上廁所', affinity: 3, needs: { toilet: 42 } },
      bath: { label: '洗澡', affinity: 3, needs: { bath: 45 } },
      play: { label: '一起玩', affinity: 4, needs: { play: 34, affection: 9 } },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 23 } }
    }
  }
};

let cache = null;

function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cache = {}; }
  return cache;
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function awakeHoursBetween(from, to) {
  const { start: sleepStart, end: sleepEnd } = quietWindowMinutes();
  let cursor = new Date(from);
  let awakeMs = 0;
  while (cursor < to) {
    const hour = cursor.getHours();
    const next = new Date(cursor);
    next.setHours(hour + 1, 0, 0, 0);
    const end = next > to ? to : next;
    if (!inWindow(hour * 60, sleepStart, sleepEnd)) awakeMs += end - cursor;
    cursor = end;
  }
  return awakeMs / 3_600_000;
}

function defaultState(id, now) {
  const def = COMPANION_DEFS[id];
  return {
    affinity: def.affinity, needs: { ...def.needs }, profileVersion: def.version || 1, lastUpdatedAt: now,
    lastInteractionAt: now, neglectPenaltyHours: 0, chatWindowAt: now, chatGain: 0
  };
}

function stateFor(id, now) {
  const data = load();
  if (!data[id]) data[id] = defaultState(id, now);
  const def = COMPANION_DEFS[id];
  if ((data[id].profileVersion || 1) !== (def.version || 1)) {
    data[id].needs = { ...def.needs };
    data[id].profileVersion = def.version || 1;
    data[id].lastUpdatedAt = now;
    data[id].lastInteractionAt = now;
    data[id].neglectPenaltyHours = 0;
  }
  return data[id];
}

function activeId() {
  const data = load();
  if (!COMPANION_DEFS[data._activeId]) data._activeId = 'momo';
  return data._activeId;
}

function advance(id, now) {
  const state = stateFor(id, now);
  state.lastInteractionAt ||= state.lastUpdatedAt;
  state.neglectPenaltyHours ||= 0;
  const elapsed = awakeHoursBetween(new Date(state.lastUpdatedAt), now);
  if (elapsed <= 0) return state;
  // Needs decay independently; urgent care matters more once any need is low.
  const rate = id === 'coco' ? 5 : id === 'mochi' ? 4.5 : 3.5;
  for (const key of Object.keys(state.needs)) state.needs[key] = clamp(state.needs[key] - elapsed * rate);
  // After one awake hour without any hands-on care, begin a gentle hourly
  // bond loss. Sleeping hours are excluded by awakeHoursBetween().
  const unattendedHours = Math.floor(awakeHoursBetween(new Date(state.lastInteractionAt), now));
  const newPenaltyHours = Math.max(0, unattendedHours - state.neglectPenaltyHours);
  if (newPenaltyHours) {
    state.affinity = clamp(state.affinity - Math.min(12, newPenaltyHours));
    state.neglectPenaltyHours += newPenaltyHours;
  }
  const unmet = Object.values(state.needs).filter((value) => value < 35).length;
  if (unmet) state.affinity = clamp(state.affinity - Math.ceil(unmet * elapsed * 0.8));
  state.lastUpdatedAt = now.toISOString();
  return state;
}

function payload(id, state) {
  const def = COMPANION_DEFS[id];
  return {
    id,
    affinity: state.affinity,
    needs: state.needs,
    personality: id,
    actions: Object.entries(def.actions).map(([id, action]) => ({ id, label: action.label })),
    sleepWindow: '00:00–10:00'
  };
}

export function getCompanions() {
  const now = new Date();
  const id = activeId();
  const result = { [id]: payload(id, advance(id, now)) };
  save();
  return { activeId: id, companions: result };
}

export function interact(id, actionId) {
  if (id !== activeId() || !COMPANION_DEFS[id]?.actions[actionId]) return null;
  const now = new Date();
  const state = advance(id, now);
  const action = COMPANION_DEFS[id].actions[actionId];
  for (const [key, amount] of Object.entries(action.needs)) state.needs[key] = clamp((state.needs[key] || 0) + amount);
  state.affinity = clamp(state.affinity + action.affinity);
  state.lastInteractionAt = now.toISOString();
  state.neglectPenaltyHours = 0;
  save();
  return payload(id, state);
}

export function rewardChat() {
  const now = new Date();
  const id = activeId();
  const state = advance(id, now);
  if (now - new Date(state.chatWindowAt) >= 6 * 3_600_000) {
    state.chatWindowAt = now.toISOString();
    state.chatGain = 0;
  }
  const gain = Math.max(0, Math.min(2, 6 - (state.chatGain || 0)));
  if (gain) { state.affinity = clamp(state.affinity + gain); state.chatGain = (state.chatGain || 0) + gain; }
  save();
  return { activeId: id, companions: { [id]: payload(id, state) } };
}

export function selectCompanion(id) {
  if (!COMPANION_DEFS[id]) return null;
  const now = new Date().toISOString();
  const state = defaultState(id, now);
  state.affinity = 100;
  for (const key of Object.keys(state.needs)) state.needs[key] = 100;
  const data = load();
  data._activeId = id;
  data[id] = state;
  save();
  return { activeId: id, companions: { [id]: payload(id, state) } };
}

function redZoneKeys(state) {
  const keys = Object.entries(state.needs).filter(([, value]) => value < RED_ZONE).map(([key]) => key);
  if (state.affinity < RED_ZONE) keys.push('affinity');
  return keys;
}

// Alerts are tracked per-need so a still-low need doesn't re-notify every poll,
// but re-arms once care brings it back out of the red zone. Suppressing during
// do-not-disturb hours (isQuietNow, checked by the caller) leaves alertedNeeds
// untouched so the notification still fires once the window ends.
export function pendingNeedAlerts() {
  const now = new Date();
  const id = activeId();
  const state = advance(id, now);
  const redZone = redZoneKeys(state);
  state.alertedNeeds = (state.alertedNeeds || []).filter((key) => redZone.includes(key));
  const pending = redZone.filter((key) => !state.alertedNeeds.includes(key));
  save();
  return { id, pending };
}

export function markNeedAlertsSent(keys) {
  const data = load();
  const id = activeId();
  const state = data[id];
  if (!state) return;
  state.alertedNeeds = [...new Set([...(state.alertedNeeds || []), ...keys])];
  save();
}

export function buildAlertNotification(keys, lang) {
  const zh = lang === 'zh-TW';
  const labels = keys.map((key) => needLabel(key, lang));
  const list = labels.join(zh ? '、' : ', ');
  return zh
    ? { title: 'ClawMate 提醒', body: `${list} 已經進入紅色警戒，快回來照顧一下吧！` }
    : { title: 'ClawMate reminder', body: `${list} ${labels.length > 1 ? 'are' : 'is'} in the red zone — go check on your companion!` };
}
