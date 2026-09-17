export const LANGS = ['zh-TW', 'en'];

const DICT = {
  'zh-TW': {
    appName: 'ClawMate 伴靈',
    tabPet: '寵物', tabChat: '聊天', tabSettings: '設定',
    theme: '主題', themeLight: '淺色', themeDark: '深色', themeAuto: '跟隨系統',
    language: '語言', install: '安裝到主畫面', installed: '已安裝！',
    character: '角色', artStyle: '畫風', styleHd: 'HD 寫實', styleChibi: 'Q 版', stylePixel: '像素版',
    pickCharacter: '選擇你的寵物',
    chatPlaceholder: '跟我說說話…', send: '送出', voice: '語音輸入', voiceStop: '停止錄音',
    listening: '聆聽中…', clearChat: '清除對話',
    newSession: '開始新對話', newSessionConfirm: '要開始新對話嗎？目前的對話紀錄會被清除。',
    sessionStarted: '已開始新對話',
    settingsTitle: '設定', settingsHint: '只要填好下面幾項，就能開始跟你的 AI 寵物聊天。',
    secConnection: '連線', secAgent: 'AI 代理人', secNotify: '通知', secAbout: '關於',
    serverUrl: 'OpenClaw 網址',
    serverUrlHelp: '你的 OpenClaw Gateway 位置，例如 http://localhost:18789',
    token: 'OpenClaw 權杖 (Token)',
    tokenHelp: '在 OpenClaw 設定的 gateway token。只會存在伺服器端，不會傳到瀏覽器。',
    agentId: 'Agent ID',
    agentIdHelp: '會自動抓取你 OpenClaw 上的代理人清單，選一個就好。',
    refreshAgents: '重新抓取',
    agentLoadFail: '抓不到代理人清單，請先確認網址與權杖',
    transport: '傳輸方式',
    transportHelp: 'OpenAI 相容模式最穩定，建議先用這個。',
    transportOpenai: 'OpenAI 相容 (建議)', transportGateway: 'Gateway WebSocket',
    testConnection: '測試連線', testing: '測試中…',
    testOk: '連線成功！', testFail: '連線失敗',
    recommendGateway: '這台伺服器沒有開啟 OpenAI 相容 API，已自動幫你改用 Gateway WebSocket。',
    unauthorized: '權杖不正確或沒有權限',
    unreachable: '連不到這個網址',
    save: '儲存', saved: '已儲存', saving: '儲存中…',
    enablePush: '開啟推播通知',
    pushHelp: '當你離開頁面時，寵物的回覆會用系統通知提醒你。',
    pushOn: '推播已開啟', pushOff: '推播已關閉', pushDenied: '瀏覽器已封鎖通知權限',
    pushUnsupported: '這個瀏覽器不支援推播',
    connected: '已連線', connecting: '連線中…', disconnected: '未連線', reconnecting: '重新連線中…',
    notConfigured: '尚未設定',
    petName: '寵物暱稱',
    soundOn: '音效', hapticsOn: '震動回饋', reducedMotion: '減少動態效果',
    interactionHint: '輕點摸摸頭・滑動逗牠玩・長按抱抱',
    statHappy: '心情', statEnergy: '活力',
    aboutText: '本機執行的電子寵物，透過 OpenClaw 與你的 AI 代理人對話。',
    errNoServer: '請先到「設定」填寫 OpenClaw 網址。',
    errSend: '訊息送不出去，請檢查設定或連線。',
    thinking: '思考中…',
    you: '你',
    micDenied: '無法使用麥克風，請檢查瀏覽器權限。',
    micUnsupported: '這個瀏覽器不支援語音輸入，請改用鍵盤。',
    emptyChat: '還沒有對話，先跟牠打聲招呼吧！',
    reactPet: '好舒服～', reactPoke: '欸！', reactSwipe: '哇啊～', reactHug: '最喜歡你了！',
    reactFeed: '好好吃！', reactSleep: 'Zzz…'
  },
  en: {
    appName: 'ClawMate',
    tabPet: 'Pet', tabChat: 'Chat', tabSettings: 'Settings',
    theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeAuto: 'System',
    language: 'Language', install: 'Install app', installed: 'Installed!',
    character: 'Character', artStyle: 'Art style', styleHd: 'HD Realistic', styleChibi: 'Chibi', stylePixel: 'Pixel',
    pickCharacter: 'Choose your pet',
    chatPlaceholder: 'Say something…', send: 'Send', voice: 'Voice input', voiceStop: 'Stop recording',
    listening: 'Listening…', clearChat: 'Clear chat',
    newSession: 'Start new session', newSessionConfirm: 'Start a new session? This clears the current chat history.',
    sessionStarted: 'New session started',
    settingsTitle: 'Settings', settingsHint: 'Fill in the few fields below and you can start chatting with your AI pet.',
    secConnection: 'Connection', secAgent: 'AI agent', secNotify: 'Notifications', secAbout: 'About',
    serverUrl: 'OpenClaw URL',
    serverUrlHelp: 'Where your OpenClaw Gateway lives, e.g. http://localhost:18789',
    token: 'OpenClaw token',
    tokenHelp: 'The gateway token from your OpenClaw config. Stored on the server, never sent to the browser.',
    agentId: 'Agent ID',
    agentIdHelp: 'Loaded automatically from your OpenClaw instance — just pick one.',
    refreshAgents: 'Reload',
    agentLoadFail: "Couldn't load the agent list — check the URL and token first",
    transport: 'Transport',
    transportHelp: 'The OpenAI-compatible mode is the most reliable — start with that.',
    transportOpenai: 'OpenAI-compatible (recommended)', transportGateway: 'Gateway WebSocket',
    testConnection: 'Test connection', testing: 'Testing…',
    testOk: 'Connected!', testFail: 'Connection failed',
    recommendGateway: "This server doesn't expose the OpenAI-compatible API, so we switched you to Gateway WebSocket.",
    unauthorized: 'Token is wrong or lacks permission',
    unreachable: 'Could not reach that URL',
    save: 'Save', saved: 'Saved', saving: 'Saving…',
    enablePush: 'Enable push notifications',
    pushHelp: 'Get a system notification when your pet replies while the app is in the background.',
    pushOn: 'Push enabled', pushOff: 'Push disabled', pushDenied: 'Notifications are blocked by the browser',
    pushUnsupported: 'Push is not supported in this browser',
    connected: 'Connected', connecting: 'Connecting…', disconnected: 'Offline', reconnecting: 'Reconnecting…',
    notConfigured: 'Not configured',
    petName: 'Pet nickname',
    soundOn: 'Sound', hapticsOn: 'Haptics', reducedMotion: 'Reduce motion',
    interactionHint: 'Tap to pet · Swipe to play · Long-press for a hug',
    statHappy: 'Mood', statEnergy: 'Energy',
    aboutText: 'A locally hosted digital pet that talks to your AI agent through OpenClaw.',
    errNoServer: 'Add your OpenClaw URL in Settings first.',
    errSend: "Couldn't send that message — check your settings or connection.",
    thinking: 'Thinking…',
    you: 'You',
    micDenied: 'Microphone unavailable — check your browser permissions.',
    micUnsupported: 'Voice input is not supported here, please type instead.',
    emptyChat: 'No messages yet — say hi!',
    reactPet: 'So cosy~', reactPoke: 'Hey!', reactSwipe: 'Whoaa~', reactHug: 'I love you!',
    reactFeed: 'Yummy!', reactSleep: 'Zzz…'
  }
};

let current = 'zh-TW';

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'zh-TW';
  document.documentElement.lang = current;
  applyTranslations();
  return current;
}

export function getLang() { return current; }
export function t(key) { return DICT[current]?.[key] ?? DICT.en[key] ?? key; }

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

export function localized(obj) {
  if (!obj) return '';
  return obj[current] ?? obj.en ?? '';
}
