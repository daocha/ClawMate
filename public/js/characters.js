// Character catalogue. Every entry renders in `hd`, `chibi`, and `pixel` mode.
export const CHARACTERS = [
  {
    id: 'momo',
    visible: true,
    archetype: 'humanoid',
    body: 'real',
    name: { en: 'Momo', 'zh-TW': '小桃' },
    tagline: { en: 'Sweet everyday trendsetter', 'zh-TW': '清純可愛的日常女孩' },
    companion: { type: 'human', personality: { 'zh-TW': '清純活潑、很在意日常分享與被記得的小事。喜歡一起散步、互傳心情與溫柔的擁抱。', en: 'Sweet and lively; treasures daily sharing and little things you remember. Loves walks, check-ins and gentle hugs.' } },
    hair: 'soft-bangs',
    eyeStyle: 'realistic',
    palette: {
      skin: '#f3ccb2', skinLight: '#ffe3d0', skinShade: '#cc9879',
      lip: '#bc6670', lipDark: '#87424f', browColor: '#493532', lashColor: '#251c1d',
      hair: '#35282a', hairDark: '#1b1517', hairLight: '#72514b',
      // Shared through HD, chibi and pixel: cream cardigan + blush-pink skirt.
      cloth: '#f5eee7', clothDark: '#d8c6bf', cloth2: '#f4bcc4', accent: '#d98d9a',
      iris: '#7e543e', irisDark: '#3b241c', blush: '#e89b91', outline: '#503b3d'
    }
  },
  {
    id: 'aria',
    visible: true,
    archetype: 'humanoid',
    body: 'tall',
    name: { en: 'Aria', 'zh-TW': '艾莉亞' },
    tagline: { en: 'Poised, thoughtful confidante', 'zh-TW': '成熟知性的都會女性' },
    companion: { type: 'human', personality: { 'zh-TW': '成熟沉穩、理性而細膩，重視有內容的交流與被尊重的陪伴。喜歡深度聊天、安靜共讀與有心準備的一餐。', en: 'Mature, calm and perceptive; values meaningful conversation and respectful company. Loves deep talks, quiet reading and a thoughtful meal.' } },
    hair: 'long-straight',
    eyeStyle: 'realistic',
    palette: {
      skin: '#f8d8c0', skinLight: '#ffeade', skinShade: '#d9a888',
      lip: '#d4737a', lipDark: '#a8505c', browColor: '#6e4a43', lashColor: '#3d2a2a', hair: '#4a3436', hairDark: '#2b1d20',
      hairLight: '#8a6360', cloth: '#f6eee5', clothDark: '#573444', cloth2: '#fffaf2',
      accent: '#795061', iris: '#a85a4c', irisDark: '#5c2a26', blush: '#f2a8a4', outline: '#5a4044'
    }
  },
  {
    id: 'mochi',
    visible: true,
    archetype: 'critter',
    ears: 'cat',
    tail: 'cat',
    name: { en: 'Mochi', 'zh-TW': '麻糬貓' },
    tagline: { en: 'Cream kitty', 'zh-TW': '奶油小貓咪' },
    companion: { type: 'cat', personality: { 'zh-TW': '黏人又有點挑剔，喜歡溫柔的互動。', en: 'Affectionate but a little particular; loves gentle attention.' } },
    eyeStyle: 'round',
    palette: {
      body: '#fff4e2', bodyDark: '#f0d9bd', belly: '#fffdf8', inner: '#ffc2cf',
      accent: '#ffb3a7', iris: '#3fbf9a', irisDark: '#1d7d63', blush: '#ffaeb9',
      outline: '#c9a98a', nose: '#ff9aae'
    }
  },
  {
    id: 'coco',
    visible: true,
    archetype: 'critter',
    ears: 'dog',
    tail: 'fluff',
    name: { en: 'Coco', 'zh-TW': '可可柴' },
    tagline: { en: 'Happy shiba', 'zh-TW': '開心小柴犬' },
    companion: { type: 'dog', personality: { 'zh-TW': '活力滿滿，最期待散步與一起玩。', en: 'Full of energy and always ready for walks and play.' } },
    eyeStyle: 'round',
    palette: {
      body: '#f0a95a', bodyDark: '#d08737', belly: '#fff3e0', inner: '#f5b5a0',
      accent: '#c9752c', iris: '#5a3420', irisDark: '#2f1a0f', blush: '#f79a86',
      outline: '#a9662a', nose: '#41291d'
    }
  },
  {
    id: 'luna',
    archetype: 'critter',
    ears: 'bunny',
    tail: 'puff',
    name: { en: 'Luna', 'zh-TW': '露娜兔' },
    tagline: { en: 'Moonlit bunny', 'zh-TW': '月光小兔兔' },
    eyeStyle: 'round',
    palette: {
      body: '#f6f0ff', bodyDark: '#ddd2f0', belly: '#fffdff', inner: '#ffc4d8',
      accent: '#b79df0', iris: '#e06fa6', irisDark: '#a83c73', blush: '#ffb0c6',
      outline: '#b0a3cc', nose: '#f0799e'
    }
  },
  {
    id: 'kiko',
    archetype: 'critter',
    ears: 'fox',
    tail: 'fox',
    name: { en: 'Kiko', 'zh-TW': '奇可狐' },
    tagline: { en: 'Sunset fox', 'zh-TW': '夕陽小狐狸' },
    eyeStyle: 'round',
    palette: {
      body: '#ff8f4d', bodyDark: '#e06d2c', belly: '#fff2e3', inner: '#ffc9a8',
      accent: '#ffd9a0', iris: '#c8a020', irisDark: '#8a6a0c', blush: '#ff9b86',
      outline: '#c25f20', nose: '#4a2a1c'
    }
  },
  {
    id: 'bao',
    archetype: 'critter',
    ears: 'panda',
    tail: 'puff',
    name: { en: 'Bao', 'zh-TW': '包包貓熊' },
    tagline: { en: 'Bamboo buddy', 'zh-TW': '竹子好朋友' },
    eyeStyle: 'round',
    palette: {
      body: '#fdfdfd', bodyDark: '#e4e6ea', belly: '#ffffff', inner: '#ffb9c4',
      accent: '#2f2f38', iris: '#6fd0c8', irisDark: '#2d8f89', blush: '#ffa9b8',
      outline: '#c5c8cf', nose: '#2f2f38'
    }
  },
  {
    id: 'ember',
    archetype: 'critter',
    ears: 'dragon',
    tail: 'dragon',
    wings: true,
    name: { en: 'Ember', 'zh-TW': '小燼龍' },
    tagline: { en: 'Tiny dragon', 'zh-TW': '迷你小龍' },
    eyeStyle: 'round',
    palette: {
      body: '#79e0c0', bodyDark: '#4cbb9a', belly: '#f3fff9', inner: '#c8a6f5',
      accent: '#b491f0', iris: '#ffb340', irisDark: '#c07a10', blush: '#8fe8c8',
      outline: '#3fa387', nose: '#3fa387'
    }
  },
  {
    id: 'pino',
    archetype: 'critter',
    ears: 'none',
    tail: 'none',
    beak: true,
    name: { en: 'Pino', 'zh-TW': '皮諾企鵝' },
    tagline: { en: 'Chilly penguin', 'zh-TW': '冰涼小企鵝' },
    eyeStyle: 'round',
    palette: {
      body: '#3f4a6b', bodyDark: '#2b3450', belly: '#ffffff', inner: '#ffb85c',
      accent: '#ffb037', iris: '#4fc3f7', irisDark: '#1a7fae', blush: '#ff9fb0',
      outline: '#232a42', nose: '#ff9d2e'
    }
  },
  {
    id: 'nova',
    archetype: 'critter',
    ears: 'star',
    tail: 'none',
    float: true,
    name: { en: 'Nova', 'zh-TW': '星靈諾娃' },
    tagline: { en: 'Star spirit', 'zh-TW': '閃亮小星靈' },
    eyeStyle: 'round',
    palette: {
      body: '#b79bff', bodyDark: '#8f6df0', belly: '#e9e0ff', inner: '#ffe38a',
      accent: '#ffd76a', iris: '#fff6d8', irisDark: '#5f3fb0', blush: '#ff9fd8',
      outline: '#7d59d8', nose: '#7d59d8'
    }
  }
];

export const CHARACTER_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id) {
  return CHARACTER_MAP[id] || CHARACTERS[0];
}
