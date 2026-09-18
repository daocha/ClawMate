export const LANGS = ['zh-TW', 'en'];

const DICT = {
  'zh-TW': {
    appName: 'ClawMate 伴靈',
    tabPet: '伴靈', tabChat: '聊天', tabSettings: '設定',
    theme: '主題', themeLight: '淺色', themeDark: '深色', themeAuto: '跟隨系統',
    language: '語言', refresh: '刷新頁面', more: '更多',
    character: '角色', artStyle: '畫風', styleHd: 'HD', styleChibi: 'Q 版', styleCartoon: '卡通版', stylePixel: '像素版',
    pickCharacter: '切換陪伴角色', careMenu: '互動', switchCharacter: '切換角色',
    selectThisCharacter: '選擇此角色', currentCharacter: '目前選定的角色', cancel: '取消', confirmSwitch: '確認切換', switchConfirmTitle: '確認切換角色？', enlargePreview: '放大查看角色預覽',
    switchCharacterConfirm: '要選擇 {name} 作為陪伴角色嗎？新角色的親密度與需求將重設為 100%，目前角色的狀態會保留並停止變化。',
    switchCharacterDone: '已選定新角色，親密度已重設為滿值。',
    chatPlaceholder: '跟我說說話…', send: '送出', voice: '語音輸入', voiceStop: '停止錄音',
    listening: '聆聽中…', clearChat: '清除對話',
    newSession: '開始新對話', newSessionConfirmTitle: '開始新的對話？', newSessionConfirm: '之後的訊息將不再參考先前的對話內容，但聊天紀錄仍會保留在畫面上。',
    sessionStarted: '已開始新對話',
    settingsTitle: '設定', settingsHint: '只要填好下面幾項，就能開始跟你的 AI 伴靈聊天。',
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
    pushHelp: '當你離開頁面時，伴靈的回覆會用系統通知提醒你。',
    pushOn: '推播已開啟', pushOff: '推播已關閉', pushDenied: '瀏覽器已封鎖通知權限',
    pushUnsupported: '這個瀏覽器不支援推播',
    connected: '已連線', connecting: '連線中…', disconnected: '未連線', reconnecting: '重新連線中…',
    notConfigured: '尚未設定',
    petName: '暱稱',
    hapticsOn: '震動回饋', reducedMotion: '減少動態效果',
    interactionHint: '輕點頭、手、身體或腳有不同反應・滑動逗牠玩・長按抱抱',
    statHappy: '心情', statEnergy: '活力', statAffinity: '親密度',
    pullToRefresh: '下拉刷新', releaseToRefresh: '放開以更新', refreshing: '正在更新最新頁面…', refreshDone: '已刷新為最新頁面 ✓',
    needDecayHint: '設定中的請勿打擾時段內不會扣親密度；醒著時若需求長時間未被照顧，親密度會慢慢下降。',
    needAlerts: '需求過低時通知我', needAlertsHelp: '任何需求或親密度進入紅色警戒時發送通知，但不會在請勿打擾時段內發送。',
    dndHours: '請勿打擾時段',
    aboutText: '本機執行的電子伴靈，透過 OpenClaw 與你的 AI 代理人對話。',
    errNoServer: '請先到「設定」填寫 OpenClaw 網址。',
    errSend: '訊息送不出去，請檢查設定或連線。',
    thinking: '思考中…',
    you: '你',
    micDenied: '無法使用麥克風，請檢查瀏覽器權限。',
    micUnsupported: '這個瀏覽器不支援語音輸入，請改用鍵盤。',
    emptyChat: '還沒有對話，先跟牠打聲招呼吧！',
    reactPet: '好舒服～', reactPoke: '欸！', reactSwipe: '哇啊～', reactHug: '最喜歡你了！',
    reactFeed: '好好吃！', reactSleep: 'Zzz…',
    pairingTitle: '這台裝置尚未配對', pairingHint: '請在執行 ClawMate 的電腦終端機輸入下面指令來核准這台裝置：',
    pairingCopy: '複製指令', pairingCopied: '已複製！', pairingWaiting: '等待核准中，核准後會自動繼續…',
    tierUpTitle: '親密度提升！', tierUpBody: '你們的關係進入了「{tier}」階段！', tierUpOk: '太棒了！',
    tierStage: '關係階段：{tier}',
    achievements: '成就', achievementsHint: '透過互動、聊天與小遊戲解鎖成就吧！', achievementUnlocked: '解鎖成就：{title}',
    lockedAchievement: '尚未解鎖',
    actionCooldown: '牠現在還在回味剛才，晚點再來吧～', actionCooldownHint: '還需要 {min} 分鐘才能再做這個互動'
  },
  en: {
    appName: 'ClawMate',
    tabPet: 'Mate', tabChat: 'Chat', tabSettings: 'Settings',
    theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeAuto: 'System',
    language: 'Language', refresh: 'Refresh page', more: 'More',
    character: 'Character', artStyle: 'Art style', styleHd: 'Photoreal', styleChibi: 'Chibi', styleCartoon: 'Cartoon', stylePixel: 'Pixel',
    pickCharacter: 'Switch companion', careMenu: 'Care', switchCharacter: 'Switch',
    selectThisCharacter: 'Choose this character', currentCharacter: 'Current companion', cancel: 'Cancel', confirmSwitch: 'Confirm switch', switchConfirmTitle: 'Switch companion?', enlargePreview: 'Enlarge character preview',
    switchCharacterConfirm: 'Choose {name} as your companion? The new companion starts with 100% bond and needs. The current companion is kept and will stop changing.',
    switchCharacterDone: 'New companion selected with a full bond.',
    chatPlaceholder: 'Say something…', send: 'Send', voice: 'Voice input', voiceStop: 'Stop recording',
    listening: 'Listening…', clearChat: 'Clear chat',
    newSession: 'Start new session', newSessionConfirmTitle: 'Start a new session?', newSessionConfirm: 'New messages will no longer use earlier chat as context, but your chat history stays visible.',
    sessionStarted: 'New session started',
    settingsTitle: 'Settings', settingsHint: 'Fill in the few fields below and you can start chatting with Claw Mate.',
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
    pushHelp: 'Get a system notification when your mate replies while the app is in the background.',
    pushOn: 'Push enabled', pushOff: 'Push disabled', pushDenied: 'Notifications are blocked by the browser',
    pushUnsupported: 'Push is not supported in this browser',
    connected: 'Connected', connecting: 'Connecting…', disconnected: 'Offline', reconnecting: 'Reconnecting…',
    notConfigured: 'Not configured',
    petName: 'Nickname',
    hapticsOn: 'Haptics', reducedMotion: 'Reduce motion',
    interactionHint: 'Tap the head, hands, body, or feet for different reactions · Swipe to play · Long-press for a hug',
    statHappy: 'Mood', statEnergy: 'Energy', statAffinity: 'Bond',
    pullToRefresh: 'Pull down to refresh', releaseToRefresh: 'Release to refresh', refreshing: 'Updating to the latest page…', refreshDone: 'Page is up to date ✓',
    needDecayHint: 'The do-not-disturb hours from Settings pause bond loss. Unmet needs slowly reduce the bond while awake.',
    needAlerts: 'Notify me on low needs', needAlertsHelp: 'Send a notification when any need or the bond hits the red zone — but never during do-not-disturb hours.',
    dndHours: 'Do-not-disturb hours',
    aboutText: 'A locally hosted digital mate that talks to your AI agent through OpenClaw.',
    errNoServer: 'Add your OpenClaw URL in Settings first.',
    errSend: "Couldn't send that message — check your settings or connection.",
    thinking: 'Thinking…',
    you: 'You',
    micDenied: 'Microphone unavailable — check your browser permissions.',
    micUnsupported: 'Voice input is not supported here, please type instead.',
    emptyChat: 'No messages yet — say hi!',
    reactPet: 'So cosy~', reactPoke: 'Hey!', reactSwipe: 'Whoaa~', reactHug: 'I love you!',
    reactFeed: 'Yummy!', reactSleep: 'Zzz…',
    pairingTitle: 'This device is not paired yet', pairingHint: 'Run this command in a terminal on the computer running ClawMate to approve it:',
    pairingCopy: 'Copy command', pairingCopied: 'Copied!', pairingWaiting: 'Waiting for approval — this will continue automatically once approved…',
    tierUpTitle: 'Your bond just leveled up!', tierUpBody: 'Your relationship reached the "{tier}" stage!', tierUpOk: 'Yay!',
    tierStage: 'Bond stage: {tier}',
    achievements: 'Achievements', achievementsHint: 'Unlock badges by interacting, chatting and playing mini-games!', achievementUnlocked: 'Achievement unlocked: {title}',
    lockedAchievement: 'Not yet unlocked',
    actionCooldown: "Still savoring that - try again in a bit~", actionCooldownHint: 'Ready again in {min} min'
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
