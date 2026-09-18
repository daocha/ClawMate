// Lightweight, entirely client-side achievement layer (localStorage-backed) -
// there is no server-side gamification infrastructure yet, and these badges
// don't need to be authoritative or synced across devices to be worth having.
import { actionIds } from './companions.js';
import { getCharacter } from './characters.js';

const STATS_KEY = 'clawmate:stats';
const UNLOCKED_KEY = 'clawmate:achievements';
const COMPANION_IDS = ['momo', 'aria', 'mochi', 'coco'];

// One "reached Soulbound" and one "tried every interaction" badge per
// companion, on top of the global badges below - since bond stage and which
// actions were used are already tracked per companion, this reuses that data
// instead of adding new state.
const PER_COMPANION_ACHIEVEMENTS = COMPANION_IDS.flatMap((id) => {
  const name = getCharacter(id)?.name || { 'zh-TW': id, en: id };
  const total = actionIds(id).length;
  return [
    {
      id: `bond-${id}`, icon: '💞',
      title: { 'zh-TW': `與${name['zh-TW']}心靈羈絆`, en: `Soulbound with ${name.en}` },
      desc: { 'zh-TW': `和${name['zh-TW']}的親密度達到「羈絆」階段`, en: `Reach the Soulbound stage with ${name.en}` },
      check: (s) => (s.perCompanionMaxTier?.[id] || 0) >= 3
    },
    {
      id: `explorer-${id}`, icon: '🗺️',
      title: { 'zh-TW': `熟悉${name['zh-TW']}的一切`, en: `Know ${name.en} Inside Out` },
      desc: { 'zh-TW': `體驗過${name['zh-TW']}的每一種互動`, en: `Try every interaction with ${name.en}` },
      check: (s) => (s.actionsUsed?.[id]?.length || 0) >= total
    }
  ];
});

export const ACHIEVEMENTS = [
  { id: 'first-interact', icon: '🐾', title: { 'zh-TW': '初次互動', en: 'First Touch' }, desc: { 'zh-TW': '完成第一次互動', en: 'Complete your first interaction' }, check: (s) => s.interactions >= 1 },
  { id: 'ten-interact', icon: '🎾', title: { 'zh-TW': '玩心大發', en: 'Playful Streak' }, desc: { 'zh-TW': '累積 10 次互動', en: 'Reach 10 interactions' }, check: (s) => s.interactions >= 10 },
  { id: 'fifty-interact', icon: '🏆', title: { 'zh-TW': '照顧達人', en: 'Devoted Caretaker' }, desc: { 'zh-TW': '累積 50 次互動', en: 'Reach 50 interactions' }, check: (s) => s.interactions >= 50 },
  { id: 'first-chat', icon: '💬', title: { 'zh-TW': '第一次聊天', en: 'First Words' }, desc: { 'zh-TW': '傳送第一則訊息', en: 'Send your first message' }, check: (s) => s.chats >= 1 },
  { id: 'chatty', icon: '📮', title: { 'zh-TW': '話匣子', en: 'Chatterbox' }, desc: { 'zh-TW': '累積傳送 30 則訊息', en: 'Send 30 messages' }, check: (s) => s.chats >= 30 },
  { id: 'tier-familiar', icon: '🌱', title: { 'zh-TW': '漸漸熟悉', en: 'Getting Familiar' }, desc: { 'zh-TW': '親密度進入「熟悉」階段', en: 'Reach the Familiar bond stage' }, check: (s) => s.maxTier >= 1 },
  { id: 'tier-close', icon: '🌟', title: { 'zh-TW': '成為摯友', en: 'Close Friends' }, desc: { 'zh-TW': '親密度進入「摯友」階段', en: 'Reach the Close friend bond stage' }, check: (s) => s.maxTier >= 2 },
  { id: 'tier-bonded', icon: '💎', title: { 'zh-TW': '心靈羈絆', en: 'Soulbound' }, desc: { 'zh-TW': '親密度進入「羈絆」階段', en: 'Reach the Soulbound bond stage' }, check: (s) => s.maxTier >= 3 },
  { id: 'perfect-catch', icon: '✨', title: { 'zh-TW': '完美接住', en: 'Perfect Catch' }, desc: { 'zh-TW': '在小遊戲中滿分接住', en: 'Get a perfect score in the catch mini-game' }, check: (s) => s.perfectCatches >= 1 },
  { id: 'switcher', icon: '🔄', title: { 'zh-TW': '博愛的心', en: 'Making New Friends' }, desc: { 'zh-TW': '切換過陪伴角色', en: 'Switch to a different companion' }, check: (s) => s.switches >= 1 },
  ...PER_COMPANION_ACHIEVEMENTS
];

const DEFAULT_STATS = { interactions: 0, chats: 0, maxTier: 0, perfectCatches: 0, switches: 0, perCompanionMaxTier: {}, actionsUsed: {} };

function loadStats() {
  try { return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem(STATS_KEY)) }; }
  catch { return { ...DEFAULT_STATS }; }
}
function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* private mode */ } }
function loadUnlocked() {
  try { const raw = JSON.parse(localStorage.getItem(UNLOCKED_KEY)); return Array.isArray(raw) ? raw : []; }
  catch { return []; }
}
function saveUnlocked() { try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...unlocked])); } catch { /* private mode */ } }

const stats = loadStats();
const unlocked = new Set(loadUnlocked());

// type: 'interaction' | 'chat' | 'tier' | 'perfectCatch' | 'switch' | 'actionUsed'
// For 'tier', value is { id, index } - index is the tier reached, kept as a
// running max both globally and per companion id.
// For 'actionUsed', value is { id, actionId } - actionId is recorded once per
// companion so "tried every interaction" can be checked later.
export function recordEvent(type, value = 1) {
  if (type === 'interaction') stats.interactions += value;
  else if (type === 'chat') stats.chats += value;
  else if (type === 'tier') {
    stats.maxTier = Math.max(stats.maxTier, value.index);
    stats.perCompanionMaxTier[value.id] = Math.max(stats.perCompanionMaxTier[value.id] || 0, value.index);
  } else if (type === 'perfectCatch') stats.perfectCatches += value;
  else if (type === 'switch') stats.switches += value;
  else if (type === 'actionUsed') {
    const used = stats.actionsUsed[value.id] || [];
    if (!used.includes(value.actionId)) stats.actionsUsed[value.id] = [...used, value.actionId];
  }
  saveStats();

  const newlyUnlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(stats)) {
      unlocked.add(a.id);
      newlyUnlocked.push(a);
    }
  }
  if (newlyUnlocked.length) saveUnlocked();
  return newlyUnlocked;
}

export function listAchievements() {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}
