import { appUrl } from './urls.js';

const NEED_LABELS = {
  care: ['關心', 'Care'], affection: ['親密', 'Affection'], meals: ['飲食', 'Meals'], rest: ['休息', 'Rest'],
  sharing: ['分享', 'Sharing'], outing: ['外出', 'Outing'], dialogue: ['交流', 'Dialogue'], qualityTime: ['相處', 'Together'],
  food: ['飢餓', 'Hunger'], water: ['口渴', 'Thirst'], litter: ['貓砂盆', 'Litter'], play: ['玩樂', 'Play'],
  grooming: ['梳毛', 'Grooming'], walk: ['散步', 'Walk'], toilet: ['如廁', 'Toilet'], bath: ['清潔', 'Bath']
};

export function needLabel(id, lang) {
  return NEED_LABELS[id]?.[lang === 'zh-TW' ? 0 : 1] || id;
}

async function request(path, options) {
  const response = await fetch(appUrl(path), options);
  if (!response.ok) throw new Error(`Companion request failed: ${response.status}`);
  return response.json();
}

export const companionApi = {
  get: async () => (await request('api/companions')).companions,
  act: async (id, action) => (await request(`api/companions/${id}/actions/${action}`, { method: 'POST' })).companion,
  chat: async () => (await request('api/companions/chat-reward', { method: 'POST' })).companions,
  select: async (id) => (await request('api/companions/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })).companions
};
