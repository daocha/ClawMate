import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawmate-reminders-'));
process.env.DATA_DIR = tempDir;
const { createNote, claimDueReminders, listSchedules, listNotes, updateReminder, deleteNotes, deleteExpiredNotes, dueReminders, markReminderDelivered } = await import('../server/notes.js');

test('dated note stores a reminder and a one-time reminder is claimed once', () => {
  const note = createNote('2026-09-22 18:30 打給媽媽');
  assert.equal(note.reminder.recurrence, 'once');
  assert.equal(claimDueReminders(new Date('2026-09-22T18:31:00+08:00')).map((item) => item.id)[0], note.id);
  assert.equal(claimDueReminders(new Date('2026-09-22T18:32:00+08:00')).length, 0);
});

test('birthday note repeats only once per calendar year', () => {
  const note = createNote('2026-09-22 媽媽生日');
  assert.equal(note.reminder.recurrence, 'yearly');
  assert.equal(claimDueReminders(new Date('2026-09-22T10:00:00+08:00')).some((item) => item.id === note.id), true);
  assert.equal(claimDueReminders(new Date('2026-09-22T10:01:00+08:00')).some((item) => item.id === note.id), false);
  assert.equal(claimDueReminders(new Date('2027-09-22T10:00:00+08:00')).some((item) => item.id === note.id), true);
});

test('schedules are ordered by their next reminder and can be rescheduled', () => {
  const later = createNote('2026-12-10 看牙');
  const sooner = createNote('2026-10-10 繳費');
  const ids = listSchedules().filter((note) => [later.id, sooner.id].includes(note.id)).map((note) => note.id);
  assert.deepEqual(ids, [sooner.id, later.id]);
  const moved = updateReminder(later.id, { remindAt: '2026-09-25T09:00:00+08:00', recurrence: 'yearly' });
  assert.equal(moved.reminder.recurrence, 'yearly');
  assert.equal(moved.expiresAt, null);
  assert.equal(listSchedules().filter((note) => [later.id, sooner.id].includes(note.id))[0].id, later.id);
});

test('yearly reminders are permanently retained until manually deleted', () => {
  const note = createNote('2030-12-12 birthday');
  assert.equal(note.reminder.recurrence, 'yearly');
  assert.equal(note.expiresAt, null);
  deleteExpiredNotes(new Date('2040-01-01T00:00:00+08:00'));
  assert.equal(listNotes().some((item) => item.id === note.id), true);
});

test('selected notes can be deleted together', () => {
  const first = createNote('2026-11-01 first');
  const second = createNote('2026-11-02 second');
  assert.equal(deleteNotes([first.id, second.id]), 2);
  assert.equal(listSchedules().some((note) => note.id === first.id || note.id === second.id), false);
});

test('delivery is only finalized after the Push service confirms it', () => {
  const note = createNote('2026-12-12 send only after success');
  const dueAt = new Date('2026-12-12T10:00:00+08:00');
  assert.equal(dueReminders(dueAt).some((item) => item.id === note.id), true);
  assert.equal(dueReminders(dueAt).some((item) => item.id === note.id), true);
  markReminderDelivered(note.id, dueAt);
  assert.equal(dueReminders(dueAt).some((item) => item.id === note.id), false);
});
