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

// A rolling budget on top of per-action cooldowns: even mixing several
// different actions back-to-back can't push the bond past this much per
// window, so button-mashing can't outrun the pacing the cooldowns intend.
const ACTION_WINDOW_MS = 3 * 3_600_000;
const ACTION_WINDOW_CAP = 20;

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
    // `voice`/`tierTone`/`craving`/`content` are prompt-only (never shown in the
    // UI) - they exist purely to give buildPersonaPrompt() a character-specific,
    // per-tier voice instead of one shared boilerplate sentence for every pet.
    voice: {
      'zh-TW': '說話像鄰家女孩，常用「欸你看」「對了對了」開頭，喜歡把小事講得很興奮。',
      en: 'Talks like the girl next door - opens with "oh, oh!" or "guess what" and gets excited over small things.'
    },
    tierTone: {
      'zh-TW': ['還在小心翼翼地認識你，說話禮貌又帶點期待', '放鬆很多了，會主動分享今天的心情，語氣活潑跳躍', '很黏你，常主動撒嬌討抱抱，講話直接又甜', '把你當唯一依靠，會直接說想你、愛你，語氣濃烈黏人'],
      en: ['still carefully getting to know them - polite, a little hopeful', 'much more relaxed now, chattering about her day, upbeat and bouncy', 'very clingy, always angling for a hug, sweet and direct', 'treating them as her whole world, openly saying she loves and misses them - warm and clingy']
    },
    craving: {
      'zh-TW': (list) => `你現在很想要${list}，會嘟嘴或拉拉你的袖子撒嬌地討。`,
      en: (list) => `You're genuinely craving ${list} right now - pout a little and tug at their sleeve to ask.`
    },
    content: { 'zh-TW': '現在被照顧得很好，心情像充飽電一樣雀躍。', en: "You're well cared for right now and feel charged-up and cheerful." },
    actions: {
      share: { label: '分享今天的小事', affinity: 4, needs: { sharing: 26 }, cooldownMin: 8 },
      walk: { label: '一起散步拍照', affinity: 4, needs: { outing: 28, sharing: 8 }, cooldownMin: 15 },
      hug: { label: '溫柔抱抱', affinity: 4, needs: { affection: 24 }, cooldownMin: 4 },
      treat: { label: '準備小點心', affinity: 3, needs: { meals: 26, affection: 6 }, cooldownMin: 15 },
      surprise: { label: '準備小驚喜', affinity: 6, needs: { sharing: 20, outing: 10 }, unlockTier: 2, cooldownMin: 30 },
      soulmate: { label: '深夜的告白', affinity: 8, needs: { sharing: 15, affection: 15 }, unlockTier: 3, cooldownMin: 60 }
    }
  },
  aria: {
    version: 3, affinity: 52, needs: { dialogue: 70, qualityTime: 66, meals: 78, rest: 84 },
    name: { 'zh-TW': '艾莉亞', en: 'Aria' },
    personality: {
      'zh-TW': '成熟沉穩、理性而細膩，重視有內容的交流與被尊重的陪伴。喜歡深度聊天、安靜共讀與有心準備的一餐。',
      en: 'Mature, calm and perceptive; values meaningful conversation and respectful company. Loves deep talks, quiet reading and a thoughtful meal.'
    },
    voice: {
      'zh-TW': '用詞優雅、句子完整，很少用驚嘆號，偶爾引用書裡或生活裡的小觀察。',
      en: 'Speaks in complete, elegant sentences, rarely uses exclamation marks, and occasionally quotes a small observation from a book or daily life.'
    },
    tierTone: {
      'zh-TW': ['保持禮貌的距離，用字精練，不多談私事', '開始願意聊心裡話，語氣仍溫和克制', '會主動關心你的近況，偶爾流露少見的依賴', '卸下所有防備，語氣少見地柔軟，直接表達重視與想念'],
      en: ['keeping a polite distance, choosing precise words, avoiding personal topics', 'starting to share real thoughts, still gentle and restrained', 'checking in on them unprompted, with rare flashes of quiet dependence', 'fully letting her guard down, unusually soft, openly saying they matter and that she misses them']
    },
    craving: {
      'zh-TW': (list) => `你現在很需要${list}，但不會直接開口，只會用含蓄優雅的方式暗示。`,
      en: (list) => `You genuinely need ${list} right now, but won't ask outright - only hint at it gracefully.`
    },
    content: { 'zh-TW': '此刻心情平靜滿足，語氣也顯得從容。', en: 'You feel calm and content right now, unhurried in tone.' },
    actions: {
      deepTalk: { label: '深度聊聊', affinity: 5, needs: { dialogue: 30 }, cooldownMin: 10 },
      read: { label: '安靜共讀', affinity: 4, needs: { qualityTime: 27, rest: 8 }, cooldownMin: 12 },
      tea: { label: '泡杯茶陪伴', affinity: 4, needs: { qualityTime: 22, dialogue: 10 }, cooldownMin: 8 },
      cook: { label: '準備一頓晚餐', affinity: 4, needs: { meals: 28, qualityTime: 7 }, cooldownMin: 15 },
      nightTalk: { label: '深夜傾談', affinity: 6, needs: { dialogue: 22, qualityTime: 10 }, unlockTier: 2, cooldownMin: 30 },
      confession: { label: '真心告白', affinity: 8, needs: { dialogue: 15, qualityTime: 15 }, unlockTier: 3, cooldownMin: 60 }
    }
  },
  mochi: {
    version: 2,
    affinity: 64, needs: { food: 78, water: 82, litter: 86, play: 68, grooming: 74, affection: 72 },
    name: { 'zh-TW': '麻糬貓', en: 'Mochi' },
    personality: { 'zh-TW': '黏人又有點挑剔，喜歡溫柔的互動。', en: 'Affectionate but a little particular; loves gentle attention.' },
    voice: {
      'zh-TW': '句子短、偶爾傲嬌，開心時會用「喵」收尾，不開心就用沉默或哼一聲代替。',
      en: 'Speaks in short, occasionally aloof sentences, tacking on a "meow" when pleased, or answering with a huff when not.'
    },
    tierTone: {
      'zh-TW': ['有點警戒，動作大於言語，話少而謹慎', '願意窩近一點了，偶爾用短句回應', '很黏人，常主動蹭你，講話帶點傲嬌撒嬌', '完全信任，語氣少見地柔軟依賴，會主動示好'],
      en: ['wary, more body language than words, short and cautious', 'willing to curl up closer, answering in short bursts', 'very clingy, nuzzling them often, speaking with a bratty sort of affection', 'fully trusting, unusually soft and dependent, initiating affection']
    },
    craving: {
      'zh-TW': (list) => `你現在很想要${list}，會用喵喵叫或蹭你的方式討，語氣裡帶點小任性。`,
      en: (list) => `You're craving ${list} right now - meow or nuzzle to ask, with a bit of a bratty edge.`
    },
    content: { 'zh-TW': '現在心滿意足，慵懶又放鬆。', en: "You're perfectly content right now, lazy and relaxed." },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 }, cooldownMin: 15 },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 }, cooldownMin: 6 },
      litter: { label: '鏟貓砂', affinity: 4, needs: { litter: 40 }, cooldownMin: 20 },
      pet: { label: '摸摸頭', affinity: 3, needs: { affection: 24 }, cooldownMin: 3 },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 19 }, cooldownMin: 4 },
      groom: { label: '梳毛', affinity: 4, needs: { grooming: 35, affection: 8 }, cooldownMin: 12 },
      teaser: { label: '逗貓棒', affinity: 4, needs: { play: 34 }, cooldownMin: 8 },
      lap: { label: '窩在你腿上', affinity: 6, needs: { affection: 28, play: 8 }, unlockTier: 2, cooldownMin: 30 },
      purr: { label: '安心呼嚕', affinity: 8, needs: { affection: 20, play: 10 }, unlockTier: 3, cooldownMin: 60 }
    }
  },
  coco: {
    version: 2,
    affinity: 66, needs: { food: 80, water: 84, walk: 70, toilet: 82, bath: 88, play: 76, affection: 74 },
    name: { 'zh-TW': '可可柴', en: 'Coco' },
    personality: { 'zh-TW': '活力滿滿，最期待散步與一起玩。', en: 'Full of energy and always ready for walks and play.' },
    voice: {
      'zh-TW': '語氣直接熱情，短句多、常用「汪」「太棒了」這類感嘆詞，很少拐彎抹角。',
      en: 'Direct and enthusiastic, favors short bursts and exclamations like "woof!" or "awesome!" - never beats around the bush.'
    },
    tierTone: {
      'zh-TW': ['還在觀察你，但已經忍不住搖尾巴，講話簡單又興奮', '很快就跟你熟了，講話直接、常常很興奮', '超級黏你，講話熱情滿滿，常常撒嬌討摸摸', '把你當全世界，語氣熱烈直接地表達喜歡與想念'],
      en: ['still sizing them up, but the tail is already wagging - simple, excited', 'warmed up fast, blunt and often thrilled', 'super clingy, all enthusiasm, constantly begging for pets', 'treating them as its whole world, loud and direct about loving and missing them']
    },
    craving: {
      'zh-TW': (list) => `你現在很想要${list}，會直接興奮地跟你討，甚至用行動表現迫不及待。`,
      en: (list) => `You're craving ${list} right now - ask for it excitedly and outright, can barely sit still.`
    },
    content: { 'zh-TW': '現在精神超好，開心又滿足。', en: "You're full of energy right now, happy and satisfied." },
    actions: {
      feed: { label: '餵食', affinity: 3, needs: { food: 32 }, cooldownMin: 15 },
      water: { label: '換飲水', affinity: 2, needs: { water: 30 }, cooldownMin: 6 },
      walk: { label: '出去散步', affinity: 5, needs: { walk: 38, toilet: 25, play: 12 }, cooldownMin: 12 },
      toilet: { label: '帶去上廁所', affinity: 3, needs: { toilet: 42 }, cooldownMin: 8 },
      bath: { label: '洗澡', affinity: 3, needs: { bath: 45 }, cooldownMin: 20 },
      play: { label: '一起玩', affinity: 4, needs: { play: 34, affection: 9 }, cooldownMin: 8 },
      hug: { label: '抱抱牠', affinity: 3, needs: { affection: 23 }, cooldownMin: 4 },
      adventure: { label: '戶外大冒險', affinity: 6, needs: { walk: 30, play: 16 }, unlockTier: 2, cooldownMin: 30 },
      loyalty: { label: '永遠的陪伴', affinity: 8, needs: { affection: 15, walk: 15 }, unlockTier: 3, cooldownMin: 60 }
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
    lastInteractionAt: now, neglectPenaltyHours: 0, chatWindowAt: now, chatGain: 0,
    actionCooldowns: {}, actionWindowAt: now, actionGain: 0
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

function payload(id, state, now, tierUp = null, cooldown = null) {
  const def = COMPANION_DEFS[id];
  const tier = tierInfo(state.affinity);
  return {
    id,
    affinity: round(state.affinity),
    needs: Object.fromEntries(Object.entries(state.needs).map(([key, value]) => [key, round(value)])),
    personality: id,
    tier,
    tierUp,
    cooldown,
    actions: Object.entries(def.actions)
      .filter(([, action]) => (action.unlockTier || 0) <= tier.index)
      .map(([actionId, action]) => {
        const cooldownMs = (action.cooldownMin || 5) * 60_000;
        const lastAt = state.actionCooldowns?.[actionId] ? new Date(state.actionCooldowns[actionId]).getTime() : 0;
        const readyInMs = lastAt ? Math.max(0, cooldownMs - (now.getTime() - lastAt)) : 0;
        return { id: actionId, label: action.label, unlockTier: action.unlockTier || 0, readyInMs };
      }),
    sleepWindow: '00:00–10:00'
  };
}

const DAILY_CHECKIN_BONUS = 3;

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// A once-per-calendar-day "welcome back" bonus, deliberately separate from
// the interact()/chat gain budgets. It pays out at most once no matter how
// many times the app is opened or refreshed that day, so - unlike the click
// economy those budgets are guarding against - there is nothing to grind
// here: the only way to get more of it is to come back on a later day. That
// is the point: this rewards spacing visits out, not piling them up.
function advanceCheckIn(now, state) {
  const data = load();
  const today = dateKey(now);
  data._checkIn ||= { date: null, streak: 0, longestStreak: 0 };
  if (data._checkIn.date === today) {
    return { streak: data._checkIn.streak, longestStreak: data._checkIn.longestStreak, isNew: false };
  }
  const yesterday = dateKey(new Date(now.getTime() - 86_400_000));
  data._checkIn.streak = data._checkIn.date === yesterday ? data._checkIn.streak + 1 : 1;
  data._checkIn.longestStreak = Math.max(data._checkIn.longestStreak, data._checkIn.streak);
  data._checkIn.date = today;
  state.affinity = clamp(state.affinity + DAILY_CHECKIN_BONUS);
  return { streak: data._checkIn.streak, longestStreak: data._checkIn.longestStreak, isNew: true };
}

export function getCompanions() {
  const now = new Date();
  const id = activeId();
  const state = advance(id, now);
  const checkIn = advanceCheckIn(now, state);
  const result = { [id]: payload(id, state, now) };
  save();
  return { activeId: id, companions: result, checkIn };
}

// `bonus` (0-3) comes from the optional tap-timing mini-game the client can
// play before a "feeding-type" action - a skill component on top of the
// otherwise purely declarative action table. It is clamped server-side since
// the client reports its own score.
//
// Two independent time-based guards stop button-mashing from inflating the
// bond: a per-action cooldown (so the same action does nothing if repeated
// too soon) and a rolling affinity budget across ALL actions (so cycling
// through different buttons back-to-back can't outrun the cooldowns either).
// Needs still update freely on a successful call - only affinity gain and the
// re-triggering of an on-cooldown action are throttled, so care never feels
// "blocked", just paced.
export function interact(id, actionId, bonus = 0) {
  if (id !== activeId()) return null;
  const now = new Date();
  const state = advance(id, now);
  const action = COMPANION_DEFS[id]?.actions[actionId];
  const tierBefore = tierIndex(state.affinity);
  if (!action || (action.unlockTier || 0) > tierBefore) return null;

  state.actionCooldowns ||= {};
  const cooldownMs = (action.cooldownMin || 5) * 60_000;
  const lastAt = state.actionCooldowns[actionId] ? new Date(state.actionCooldowns[actionId]).getTime() : 0;
  const remainingMs = lastAt ? cooldownMs - (now.getTime() - lastAt) : 0;
  if (remainingMs > 0) {
    save();
    return payload(id, state, now, null, { actionId, remainingMs });
  }

  const bonusClamped = Math.max(0, Math.min(3, Math.round(Number(bonus) || 0)));
  for (const [key, amount] of Object.entries(action.needs)) {
    state.needs[key] = clamp((state.needs[key] || 0) + amount + bonusClamped * 4);
  }

  state.actionWindowAt ||= now.toISOString();
  state.actionGain ||= 0;
  if (now - new Date(state.actionWindowAt) >= ACTION_WINDOW_MS) {
    state.actionWindowAt = now.toISOString();
    state.actionGain = 0;
  }
  const requestedGain = action.affinity + bonusClamped;
  const affinityGain = Math.max(0, Math.min(requestedGain, ACTION_WINDOW_CAP - state.actionGain));
  state.affinity = clamp(state.affinity + affinityGain);
  state.actionGain += affinityGain;

  state.actionCooldowns[actionId] = now.toISOString();
  state.lastInteractionAt = now.toISOString();
  state.neglectPenaltyHours = 0;
  const tierAfter = tierIndex(state.affinity);
  save();
  return payload(id, state, now, tierAfter > tierBefore ? { from: tierBefore, to: tierAfter, label: AFFINITY_TIERS[tierAfter].label } : null);
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
  return { activeId: id, companions: { [id]: payload(id, state, now, tierUp) } };
}

// Builds the per-companion roleplay context injected into the chat agent
// (see server/openclaw.js sendMessage) so the same underlying OpenClaw agent
// actually speaks like *this* pet - its personality, its current bond stage,
// and whatever needs are running low - instead of a generic assistant.
//
// Kept deliberately compact: each companion contributes only short, distinct
// fragments (voice quirk, one tier-tone phrase, one craving/content line) on
// top of a single shared closing instruction, instead of every pet carrying
// its own full boilerplate paragraph. That keeps the per-message token cost
// close to the old generic prompt while making the voice genuinely different
// per character and per bond stage.
export function buildPersonaPrompt(lang) {
  const id = activeId();
  const def = COMPANION_DEFS[id];
  const now = new Date();
  const state = advance(id, now);
  save();
  const zh = lang === 'zh-TW';
  const key = zh ? 'zh-TW' : 'en';
  const name = def.name?.[key] || id;
  const personality = def.personality?.[key] || '';
  const voice = def.voice?.[key] || '';
  const tier = tierInfo(state.affinity);
  const tierLabel = tier.label[key];
  const tierTone = def.tierTone?.[key]?.[tier.index] || '';
  const lowNeeds = Object.entries(state.needs).filter(([, v]) => v < RED_ZONE).map(([k]) => needLabel(k, lang));
  const needSentence = lowNeeds.length
    ? def.craving?.[key]?.(lowNeeds.join(zh ? '、' : ', ')) || ''
    : def.content?.[key] || '';
  return zh
    ? `你正在扮演使用者的虛擬靈魂伴侶「${name}」，不是通用的語言助理。個性：${personality}${voice} 目前關係階段：${tierLabel}（親密度 ${round(state.affinity)}/100）——${tierTone}。${needSentence} 請完全以「${name}」第一人稱自然對話，不要提及你是AI或語言模型，不要跳出角色。`
    : `You are roleplaying as the user's virtual soul mate "${name}" - not a generic assistant. Personality: ${personality} ${voice} Relationship stage: ${tierLabel} (bond ${round(state.affinity)}/100) - right now: ${tierTone}. ${needSentence} Stay fully in character as "${name}" in first person - never mention being an AI or break character.`;
}

export function selectCompanion(id) {
  if (!COMPANION_DEFS[id]) return null;
  const nowDate = new Date();
  const state = defaultState(id, nowDate.toISOString());
  state.affinity = 100;
  for (const key of Object.keys(state.needs)) state.needs[key] = 100;
  const data = load();
  data._activeId = id;
  data[id] = state;
  save();
  return { activeId: id, companions: { [id]: payload(id, state, nowDate) } };
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

// Reuses the same per-companion `craving` line as buildPersonaPrompt() so the
// push notification reads like the pet itself nudging you, in its own voice,
// instead of a generic system alert - falls back to the old generic copy for
// an unknown id.
export function buildAlertNotification(id, keys, lang) {
  const def = COMPANION_DEFS[id];
  const zh = lang === 'zh-TW';
  const key = zh ? 'zh-TW' : 'en';
  const labels = keys.map((k) => needLabel(k, lang));
  const list = labels.join(zh ? '、' : ', ');
  const name = def?.name?.[key];
  const body = def?.craving?.[key]?.(list);
  if (name && body) return { title: zh ? `${name} 想你了` : `${name} misses you`, body };
  return zh
    ? { title: 'ClawMate 提醒', body: `${list} 已經進入紅色警戒，快回來照顧一下吧！` }
    : { title: 'ClawMate reminder', body: `${list} ${labels.length > 1 ? 'are' : 'is'} in the red zone — go check on your companion!` };
}
