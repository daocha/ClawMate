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

// Bond tiers turn the raw affinity number into a relationship stage that
// gates a companion's more intimate action and is woven into the chat
// persona prompt (see buildPersonaPrompt) so the roleplay actually reflects it.
const AFFINITY_TIERS = [
  { min: 0, label: { 'zh-TW': '陌生', en: 'Stranger' } },
  { min: 25, label: { 'zh-TW': '熟悉', en: 'Familiar' } },
  { min: 50, label: { 'zh-TW': '摯友', en: 'Close friend' } },
  { min: 75, label: { 'zh-TW': '羈絆', en: 'Soulbound' } }
];

function tierIndex(affinity) {
  // Round first so the tier boundary always matches the affinity number the
  // client actually displays (avoids e.g. a displayed "75" still reading as
  // the lower tier because the stored float was 74.6).
  const rounded = round(affinity);
  let idx = 0;
  AFFINITY_TIERS.forEach((tier, i) => { if (rounded >= tier.min) idx = i; });
  return idx;
}

function tierInfo(affinity) {
  const index = tierIndex(affinity);
  return { index, label: AFFINITY_TIERS[index].label };
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
    version: 3, affinity: 58, needs: { sharing: 76, affection: 72, outing: 68, meals: 82 },
    name: { 'zh-TW': '小桃', en: 'Momo' },
    personality: {
      'zh-TW': '清純活潑、很在意日常分享與被記得的小事。喜歡一起散步、互傳心情與溫柔的擁抱。',
      en: 'Sweet and lively; treasures daily sharing and little things you remember. Loves walks, check-ins and gentle hugs.'
    },
    actions: {
      share: { label: '分享今天的小事', affinity: 4, needs: { sharing: 26 } },
      walk: { label: '一起散步拍照', affinity: 4, needs: { outing: 28, sharing: 8 } },
      hug: { label: '溫柔抱抱', affinity: 4, needs: { affection: 24 } },
      treat: { label: '準備小點心', affinity: 3, needs: { meals: 26, affection: 6 } },
      surprise: { label: '準備小驚喜', affinity: 6, needs: { sharing: 20, outing: 10 }, unlockTier: 2 }
    }
  },
  aria: {
    version: 3, affinity: 52, needs: { dialogue: 70, qualityTime: 66, meals: 78, rest: 84 },
    name: { 'zh-TW': '艾莉亞', en: 'Aria' },
    personality: {
      'zh-TW': '成熟沉穩、理性而細膩，重視有內容的交流與被尊重的陪伴。喜歡深度聊天、安靜共讀與有心準備的一餐。',
      en: 'Mature, calm and perceptive; values meaningful conversation and respectful company. Loves deep talks, quiet reading and a thoughtful meal.'
    },
    actions: {
      deepTalk: { label: '深度聊聊', affinity: 5, needs: { dialogue: 30 } },
      read: { label: '安靜共讀', affinity: 4, needs: { qualityTime: 27, rest: 8 } },
      tea: { label: '泡杯茶陪伴', affinity: 4, needs: { qualityTime: 22, dialogue: 10 } },
      cook: { label: '準備一頓晚餐', affinity: 4, needs: { meals: 28, qualityTime: 7 } },
      nightTalk: { label: '深夜傾談', affinity: 6, needs: { dialogue: 22, qualityTime: 10 }, unlockTier: 2 }
    }
  },
  mochi: {
    version: 2,
    affinity: 64, needs: { food: 78, water: 82, litter: 86, play: 68, grooming: 74, affection: 72 },
    name: { 'zh-TW': '麻糬貓', en: 'Mochi' },
    personality: { 'zh-TW': '黏人又有點挑剔，喜歡溫柔的互動。', en: 'Affectionate but a little particular; loves gentle attention.' },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 } },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 } },
      litter: { label: '鏟貓砂', affinity: 4, needs: { litter: 40 } },
      pet: { label: '摸摸頭', affinity: 3, needs: { affection: 24 } },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 19 } },
      groom: { label: '梳毛', affinity: 4, needs: { grooming: 35, affection: 8 } },
      teaser: { label: '逗貓棒', affinity: 4, needs: { play: 34 } },
      lap: { label: '窩在你腿上', affinity: 6, needs: { affection: 28, play: 8 }, unlockTier: 2 }
    }
  },
  coco: {
    version: 2,
    affinity: 66, needs: { food: 80, water: 84, walk: 70, toilet: 82, bath: 88, play: 76, affection: 74 },
    name: { 'zh-TW': '可可柴', en: 'Coco' },
    personality: { 'zh-TW': '活力滿滿，最期待散步與一起玩。', en: 'Full of energy and always ready for walks and play.' },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 } },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 } },
      walk: { label: '出去散步', affinity: 5, needs: { walk: 38, toilet: 25, play: 12 } },
      toilet: { label: '帶去上廁所', affinity: 3, needs: { toilet: 42 } },
      bath: { label: '洗澡', affinity: 3, needs: { bath: 45 } },
      play: { label: '一起玩', affinity: 4, needs: { play: 34, affection: 9 } },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 23 } },
      adventure: { label: '戶外大冒險', affinity: 6, needs: { walk: 30, play: 16 }, unlockTier: 2 }
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

// Kept unrounded in storage so slow decay/penalty ticks (e.g. the 5-minute
// need-alert timer) accumulate correctly instead of losing sub-1 remainders
// every time lastUpdatedAt is stamped forward. Only `round` for display.
const clamp = (value) => Math.max(0, Math.min(100, value));
const round = (value) => Math.round(value);

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

export const getActiveCompanionId = activeId;

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
  if (unmet) state.affinity = clamp(state.affinity - unmet * elapsed * 0.8);
  state.lastUpdatedAt = now.toISOString();
  return state;
}

function payload(id, state, tierUp = null) {
  const def = COMPANION_DEFS[id];
  const tier = tierInfo(state.affinity);
  return {
    id,
    affinity: round(state.affinity),
    needs: Object.fromEntries(Object.entries(state.needs).map(([key, value]) => [key, round(value)])),
    personality: id,
    tier,
    tierUp,
    actions: Object.entries(def.actions)
      .filter(([, action]) => (action.unlockTier || 0) <= tier.index)
      .map(([id, action]) => ({ id, label: action.label, unlockTier: action.unlockTier || 0 })),
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

// `bonus` (0-3) comes from the optional tap-timing mini-game the client can
// play before a "feeding-type" action - a skill component on top of the
// otherwise purely declarative action table. It is clamped server-side since
// the client reports its own score.
export function interact(id, actionId, bonus = 0) {
  if (id !== activeId()) return null;
  const now = new Date();
  const state = advance(id, now);
  const action = COMPANION_DEFS[id]?.actions[actionId];
  const tierBefore = tierIndex(state.affinity);
  if (!action || (action.unlockTier || 0) > tierBefore) return null;
  const bonusClamped = Math.max(0, Math.min(3, Math.round(Number(bonus) || 0)));
  for (const [key, amount] of Object.entries(action.needs)) {
    state.needs[key] = clamp((state.needs[key] || 0) + amount + bonusClamped * 4);
  }
  state.affinity = clamp(state.affinity + action.affinity + bonusClamped);
  state.lastInteractionAt = now.toISOString();
  state.neglectPenaltyHours = 0;
  const tierAfter = tierIndex(state.affinity);
  save();
  return payload(id, state, tierAfter > tierBefore ? { from: tierBefore, to: tierAfter, label: AFFINITY_TIERS[tierAfter].label } : null);
}

export function rewardChat() {
  const now = new Date();
  const id = activeId();
  const state = advance(id, now);
  const tierBefore = tierIndex(state.affinity);
  if (now - new Date(state.chatWindowAt) >= 6 * 3_600_000) {
    state.chatWindowAt = now.toISOString();
    state.chatGain = 0;
  }
  const gain = Math.max(0, Math.min(2, 6 - (state.chatGain || 0)));
  if (gain) { state.affinity = clamp(state.affinity + gain); state.chatGain = (state.chatGain || 0) + gain; }
  const tierAfter = tierIndex(state.affinity);
  save();
  const tierUp = tierAfter > tierBefore ? { from: tierBefore, to: tierAfter, label: AFFINITY_TIERS[tierAfter].label } : null;
  return { activeId: id, companions: { [id]: payload(id, state, tierUp) } };
}

// Builds the per-companion roleplay context injected into the chat agent
// (see server/openclaw.js sendMessage) so the same underlying OpenClaw agent
// actually speaks like *this* pet - its personality, its current bond stage,
// and whatever needs are running low - instead of a generic assistant.
export function buildPersonaPrompt(lang) {
  const id = activeId();
  const def = COMPANION_DEFS[id];
  const now = new Date();
  const state = advance(id, now);
  save();
  const zh = lang === 'zh-TW';
  const name = def.name?.[zh ? 'zh-TW' : 'en'] || id;
  const personality = def.personality?.[zh ? 'zh-TW' : 'en'] || '';
  const tier = tierInfo(state.affinity);
  const tierLabel = tier.label[zh ? 'zh-TW' : 'en'];
  const lowNeeds = Object.entries(state.needs).filter(([, v]) => v < RED_ZONE).map(([k]) => needLabel(k, lang));
  const needSentence = lowNeeds.length
    ? (zh ? `你現在很想要${lowNeeds.join('、')}，可以自然地在對話中撒嬌或提起這件事。` : `You're genuinely craving ${lowNeeds.join(', ')} right now - feel free to bring it up naturally, maybe with a little whining.`)
    : (zh ? '你目前被照顧得很好，心情放鬆又滿足。' : "You're well cared for right now and feeling relaxed and content.");
  return zh
    ? `你正在扮演使用者的虛擬靈魂伴侶「${name}」，不是通用的語言助理。個性設定：${personality} 你們目前的親密度是 ${round(state.affinity)}/100（關係階段：${tierLabel}）。${needSentence} 請完全以「${name}」第一人稱的身份自然對話，語氣、用詞需符合上述個性與親密度高低（越親密越黏人、越陌生越拘謹），不要提及你是AI或語言模型，不要跳出這個角色設定。`
    : `You are roleplaying as the user's virtual soul mate "${name}" - not a generic assistant. Personality: ${personality} Your bond level is ${round(state.affinity)}/100 (relationship stage: ${tierLabel}). ${needSentence} Stay fully in character as "${name}" in first person, with tone matching that personality and bond stage (more affectionate when closer, more reserved when a stranger) - never mention being an AI or break character.`;
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
