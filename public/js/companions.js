import { appUrl } from './urls.js';

const NEED_LABELS = {
  care: ['關心', 'Care'], affection: ['親密', 'Affection'], meals: ['飲食', 'Meals'], rest: ['休息', 'Rest'],
  sharing: ['分享', 'Sharing'], outing: ['外出', 'Outing'], dialogue: ['交流', 'Dialogue'], qualityTime: ['相處', 'Together'],
  food: ['飢餓', 'Hunger'], water: ['口渴', 'Thirst'], litter: ['貓砂盆', 'Litter'], play: ['玩樂', 'Play'],
  grooming: ['梳毛', 'Grooming'], walk: ['散步', 'Walk'], toilet: ['如廁', 'Toilet'], bath: ['清潔', 'Bath']
};

const ACTION_LABELS = {
  momo: {
    share: ['分享今天的小事', 'Share the little things'], walk: ['一起散步拍照', 'Take a photo walk'],
    hug: ['溫柔抱抱', 'A gentle hug'], treat: ['準備小點心', 'Prepare a little snack'],
    surprise: ['準備小驚喜', 'Prepare a surprise']
  },
  aria: {
    deepTalk: ['深度聊聊', 'Have a deep talk'], read: ['安靜共讀', 'Read quietly together'],
    tea: ['泡杯茶陪伴', 'Share a cup of tea'], cook: ['準備一頓晚餐', 'Prepare dinner'],
    nightTalk: ['深夜傾談', 'A late-night heart-to-heart']
  },
  mochi: {
    feed: ['餵食', 'Feed'], water: ['換飲水', 'Refresh water'], litter: ['鏟貓砂', 'Scoop litter'],
    pet: ['摸摸頭', 'Pet'], hug: ['抱抱牠', 'Give a hug'], groom: ['梳毛', 'Brush fur'], teaser: ['逗貓棒', 'Play with a teaser'],
    lap: ['窩在你腿上', 'Curl up on your lap']
  },
  coco: {
    feed: ['餵食', 'Feed'], water: ['換飲水', 'Refresh water'], walk: ['出去散步', 'Go for a walk'],
    toilet: ['帶去上廁所', 'Bathroom break'], bath: ['洗澡', 'Bath time'], play: ['一起玩', 'Play together'], hug: ['抱抱牠', 'Give a hug'],
    adventure: ['戶外大冒險', 'A big outdoor adventure']
  }
};

// Feeding-type action per companion that the mini-game (see minigame.js) can
// boost with a skill bonus before the actual API call.
export const FEED_ACTION = { momo: 'treat', aria: 'cook', mochi: 'feed', coco: 'feed' };

export function needLabel(id, lang) {
  return NEED_LABELS[id]?.[lang === 'zh-TW' ? 0 : 1] || id;
}

export function actionLabel(characterId, actionId, lang) {
  return ACTION_LABELS[characterId]?.[actionId]?.[lang === 'zh-TW' ? 0 : 1] || actionId;
}

async function request(path, options) {
  const response = await fetch(appUrl(path), options);
  if (!response.ok) throw new Error(`Companion request failed: ${response.status}`);
  return response.json();
}

export const companionApi = {
  get: async () => (await request('api/companions')).companions,
  act: async (id, action, bonus = 0) => (await request(`api/companions/${id}/actions/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bonus })
  })).companion,
  chat: async () => (await request('api/companions/chat-reward', { method: 'POST' })).companions,
  select: async (id) => (await request('api/companions/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })).companions
};
