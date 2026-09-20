import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReminder } from '../server/date-parser.js';

const now = new Date('2026-09-20T12:00:00+08:00');
const at = (text) => parseReminder(text, { now })?.remindAt;

test('Chinese relative dates use 09:00 by default', () => {
  assert.equal(at('明天繳費'), '2026-09-21T01:00:00.000Z');
  assert.equal(at('後天剪頭髮'), '2026-09-22T01:00:00.000Z');
  assert.equal(at('3天後回電'), '2026-09-23T01:00:00.000Z');
  assert.equal(at('下週二媽媽生日'), '2026-09-22T01:00:00.000Z');
  assert.equal(at('下下週三剪頭髮'), '2026-09-30T01:00:00.000Z');
  assert.equal(at('下周二妈妈生日'), '2026-09-22T01:00:00.000Z');
});

test('Chinese next-week variants accept 週 and 禮拜', () => {
  for (const text of ['下禮拜二', '下個禮拜二', '下週二']) {
    assert.equal(at(text), '2026-09-22T01:00:00.000Z', text);
  }
  for (const text of ['下下個禮拜二', '下下週二', '下下禮拜二']) {
    assert.equal(at(text), '2026-09-29T01:00:00.000Z', text);
  }
});

test('Chinese explicit dates and times parse', () => {
  assert.equal(at('下個月3號是Lucy生日'), '2026-10-03T01:00:00.000Z');
  assert.equal(at('下个月3号是Lucy生日'), '2026-10-03T01:00:00.000Z');
  assert.equal(at('2026年10月3日 下午3點看牙'), '2026-10-03T07:00:00.000Z');
  assert.equal(at('兩天後下午三點剪頭髮'), '2026-09-22T07:00:00.000Z');
  assert.equal(at('9月22日 18:30 打給媽媽'), '2026-09-22T10:30:00.000Z');
});

test('Chinese half and quarter hours preserve their minutes', () => {
  assert.equal(at('明天6點半回電'), '2026-09-20T22:30:00.000Z');
  assert.equal(at('明天六點半回電'), '2026-09-20T22:30:00.000Z');
  assert.equal(at('明天6點一刻回電'), '2026-09-20T22:15:00.000Z');
  assert.equal(at('明天六點三刻回電'), '2026-09-20T22:45:00.000Z');
  assert.equal(at('明天晚上六點半回電'), '2026-09-21T10:30:00.000Z');
});

test('English relative and explicit dates parse', () => {
  assert.equal(at('haircut next Tuesday'), '2026-09-22T01:00:00.000Z');
  assert.equal(at('haircut next next Wednesday'), '2026-09-30T01:00:00.000Z');
  assert.equal(at('call Mom tomorrow at 6pm'), '2026-09-21T10:00:00.000Z');
  assert.equal(at("Lucy's birthday on October 3rd"), '2026-10-03T01:00:00.000Z');
  assert.equal(at('meeting in 3 days at 14:30'), '2026-09-23T06:30:00.000Z');
  assert.equal(at('lunch tomorrow at noon'), '2026-09-21T04:00:00.000Z');
});

test('birthday and anniversary words become yearly reminders', () => {
  assert.equal(parseReminder('下週二媽媽生日', { now }).recurrence, 'yearly');
  assert.equal(parseReminder('Our anniversary on October 3rd', { now }).recurrence, 'yearly');
  assert.equal(parseReminder('下週二剪頭髮', { now }).recurrence, 'once');
});

test('vague, invalid, and past expressions do not schedule', () => {
  assert.equal(parseReminder('車停在 B2', { now }), null);
  assert.equal(parseReminder('下週剪頭髮', { now }), null);
  assert.equal(parseReminder('sometime next month', { now }), null);
  assert.equal(parseReminder('2月30日看牙', { now }), null);
  assert.equal(parseReminder('今天繳費', { now }), null);
});
