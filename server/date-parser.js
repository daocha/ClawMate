// Deterministic reminder parser for the small, explicit date vocabulary we
// support in notes. It intentionally returns null for vague language instead
// of guessing. All dates use the server's local timezone (ClawMate defaults to
// Asia/Shanghai deployments); tests pass a fixed local Date.

const WEEKDAYS = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
const CN_NUMBERS = { 零: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cloneDay(now) { return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0); }
function daysLater(now, count) { const d = cloneDay(now); d.setDate(d.getDate() + count); return d; }
function validDate(year, month, day) { const d = new Date(year, month, day, 9); return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null; }
function nextWeekday(now, weekday) { const d = cloneDay(now); let delta = (weekday - d.getDay() + 7) % 7; if (!delta) delta = 7; d.setDate(d.getDate() + delta); return d; }
function number(value) {
  if (/^\d+$/.test(value)) return Number(value);
  if (CN_NUMBERS[value] !== undefined) return CN_NUMBERS[value];
  // Support compound Chinese hours too, e.g. 十一點半 or 二十三點三刻.
  if (/^[一二兩三四五六七八九十]+$/.test(value) && value.includes('十')) {
    const [tens, ones] = value.split('十');
    return (tens ? CN_NUMBERS[tens] : 1) * 10 + (ones ? CN_NUMBERS[ones] : 0);
  }
  return NaN;
}

function applyTime(date, text) {
  if (/\bnoon\b/i.test(text)) { date.setHours(12, 0, 0, 0); return date; }
  if (/\bmidnight\b/i.test(text)) { date.setHours(0, 0, 0, 0); return date; }
  const hourToken = '(\\d{1,2}|[一二兩三四五六七八九十]+)';
  // 半、一刻、三刻 are part of the time expression; without this, 6點半
  // matches as a plain 6:00 and loses the trailing word.
  let match = text.match(new RegExp(`((?:上午|早上|下午|晚上|傍晚)?)\\s*${hourToken}\\s*(?:點|时|時)(?:\\s*(?:(\\d{1,2})\\s*分?|半|([一三])\\s*刻))?`, 'i'));
  let pm = /(?:下午|晚上|傍晚)/.test(match?.[1] || '');
  let hour;
  let minute;
  if (match) {
    hour = number(match[2]);
    minute = match[3] !== undefined ? Number(match[3]) : (match[0].includes('半') ? 30 : (match[4] ? number(match[4]) * 15 : 0));
  } else {
    match = text.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    pm = match?.[3]?.toLowerCase() === 'pm';
    if (!match) match = text.match(/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/);
    if (!match) return date;
    hour = number(match[1]);
    minute = Number(match[2] || 0);
  }
  if (pm && hour < 12) hour += 12;
  if (!pm && /am/i.test(match[3] || '') && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return date;
  date.setHours(hour, minute, 0, 0);
  return date;
}

function explicitDate(text, now) {
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b|\b(20\d{2})年(\d{1,2})月(\d{1,2})(?:日|號|号)?/);
  if (m) return validDate(Number(m[1] || m[4]), Number(m[2] || m[5]) - 1, Number(m[3] || m[6]));
  m = text.match(/(\d{1,2})月(\d{1,2})(?:日|號|号)?/);
  if (m) {
    let date = validDate(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
    if (date && date < cloneDay(now)) date = validDate(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
    return date;
  }
  m = text.toLowerCase().match(new RegExp(`\\b(${Object.keys(MONTHS).join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (m) {
    let date = validDate(now.getFullYear(), MONTHS[m[1]], Number(m[2]));
    if (date && date < cloneDay(now)) date = validDate(now.getFullYear() + 1, MONTHS[m[1]], Number(m[2]));
    return date;
  }
  return null;
}

export function parseReminder(text, { now = new Date() } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let date = explicitDate(raw, now);
  let match;
  if (!date && /(後天|day after tomorrow)/i.test(raw)) date = daysLater(now, 2);
  else if (!date && /(明天|tomorrow)/i.test(raw)) date = daysLater(now, 1);
  else if (!date && /(今天|today)/i.test(raw)) date = cloneDay(now);
  if (!date && (match = raw.match(/(\d+|[一二兩三四五六七八九十]+)\s*天(?:後|后)/))) date = daysLater(now, number(match[1]));
  if (!date && (match = lower.match(/\bin\s+(\d+)\s+days?\b/))) date = daysLater(now, Number(match[1]));
  if (!date && (match = raw.match(/下下(?:個|个)?(?:週|周|星期|禮拜)\s*([一二三四五六日天])/))) {
    date = nextWeekday(now, WEEKDAYS[match[1]]); date.setDate(date.getDate() + 7);
  }
  if (!date && (match = raw.match(/下(?:個|个)?(?:週|周|星期|禮拜)\s*([一二三四五六日天])/))) date = nextWeekday(now, WEEKDAYS[match[1]]);
  if (!date && (match = raw.match(/(?:週|周|星期|禮拜)\s*([一二三四五六日天])/))) date = nextWeekday(now, WEEKDAYS[match[1]]);
  if (!date && (match = lower.match(/\b(?:next next|the week after next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/))) {
    date = nextWeekday(now, WEEKDAYS[match[1]]); date.setDate(date.getDate() + 7);
  }
  if (!date && (match = lower.match(/\b(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/))) date = nextWeekday(now, WEEKDAYS[match[1]]);
  if (!date && (match = raw.match(/下(?:個|个)月\s*(\d{1,2})(?:日|號|号)?/))) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9); date = validDate(d.getFullYear(), d.getMonth(), Number(match[1]));
  }
  if (!date && (match = lower.match(/\bnext month\s+(\d{1,2})(?:st|nd|rd|th)?\b/))) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9); date = validDate(d.getFullYear(), d.getMonth(), Number(match[1]));
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  applyTime(date, raw);
  // A same-day default 09:00 that has already passed is too ambiguous to push;
  // leave it as an ordinary note rather than silently scheduling tomorrow.
  if (date <= now) return null;
  const yearly = /(生日|週年|周年|紀念日|anniversary|birthday)/i.test(raw);
  return { remindAt: date.toISOString(), recurrence: yearly ? 'yearly' : 'once' };
}
