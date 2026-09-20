import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DATA_DIR, getConfig } from './config.js';
import { parseReminder } from './date-parser.js';

const FILE = path.join(DATA_DIR, 'notes.json');
const MAX_TEXT_LENGTH = 1200;

let cache = null;

function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    cache = Array.isArray(parsed) ? parsed.filter(isNote) : [];
  } catch {
    cache = [];
  }
  let changed = false;
  for (const note of cache) {
    // Repeating reminders are calendar events, not disposable sticky notes.
    // Migrate existing yearly notes too; users remove them manually.
    if (note.reminder?.recurrence === 'yearly') {
      if (note.expiresAt !== null) { note.expiresAt = null; changed = true; }
    } else if (!Object.hasOwn(note, 'expiresAt')) {
      note.expiresAt = expiryAt(note.createdAt); changed = true;
    }
  }
  if (changed) fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  return cache;
}

function isNote(value) {
  return value && typeof value.id === 'string' && typeof value.text === 'string' && typeof value.createdAt === 'string';
}

function persist() {
  fs.writeFileSync(FILE, JSON.stringify(load(), null, 2));
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LENGTH);
}

function expiryAt(createdAt = new Date().toISOString()) {
  const days = Number(getConfig().noteExpiryDays) || 7;
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function expired(note, now = Date.now()) {
  return Number.isFinite(Date.parse(note.expiresAt)) && Date.parse(note.expiresAt) <= now;
}

function order(notes) {
  return [...notes].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt));
}

export function listNotes(query = '') {
  const needle = cleanText(query).toLocaleLowerCase();
  const notes = load();
  return order(needle ? notes.filter((note) => note.text.toLocaleLowerCase().includes(needle)) : notes);
}

export function listSchedules() {
  return load()
    .filter((note) => note.reminder?.remindAt && !note.reminder.notifiedAt)
    .sort((a, b) => Date.parse(a.reminder.remindAt) - Date.parse(b.reminder.remindAt));
}

export function createNote(text) {
  const clean = cleanText(text);
  if (!clean) return null;
  const now = new Date().toISOString();
  const reminder = parseReminder(clean);
  const note = { id: randomUUID(), text: clean, pinned: false, createdAt: now, updatedAt: now, expiresAt: reminder?.recurrence === 'yearly' ? null : expiryAt(now), reminder };
  load().push(note);
  persist();
  return note;
}

export function updateNote(id, patch = {}) {
  const note = load().find((item) => item.id === id);
  if (!note) return null;
  if ('text' in patch) {
    const text = cleanText(patch.text);
    if (!text) return null;
    note.text = text;
    note.reminder = parseReminder(text);
    if (note.reminder?.recurrence === 'yearly') note.expiresAt = null;
  }
  if ('pinned' in patch) note.pinned = Boolean(patch.pinned);
  note.updatedAt = new Date().toISOString();
  persist();
  return note;
}

export function updateReminder(id, patch = {}) {
  const note = load().find((item) => item.id === id);
  const remindAt = new Date(patch.remindAt);
  if (!note || !note.reminder || Number.isNaN(remindAt.getTime()) || remindAt <= new Date()) return null;
  const recurrence = patch.recurrence === 'yearly' ? 'yearly' : 'once';
  note.reminder = { remindAt: remindAt.toISOString(), recurrence };
  if (recurrence === 'yearly') note.expiresAt = null;
  note.updatedAt = new Date().toISOString();
  persist();
  return note;
}

export function deleteNote(id) {
  const notes = load();
  const index = notes.findIndex((item) => item.id === id);
  if (index < 0) return false;
  notes.splice(index, 1);
  persist();
  return true;
}

export function deleteNotes(ids) {
  const wanted = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
  if (!wanted.size) return 0;
  const notes = load();
  const before = notes.length;
  cache = notes.filter((note) => !wanted.has(note.id));
  if (cache.length !== before) persist();
  return before - cache.length;
}

// Deliberately invoked only by the user-facing cleanup action. There is no
// scheduler: an expired note remains visible in the pending-delete section.
export function deleteExpiredNotes(now = Date.now()) {
  const notes = load();
  const before = notes.length;
  cache = notes.filter((note) => !expired(note, now));
  if (cache.length !== before) persist();
  return before - cache.length;
}

// Claim due notifications before sending them so the one-minute scheduler can
// never spam the same reminder. Yearly reminders retain their schedule and
// become eligible again in the following calendar year.
export function claimDueReminders(now = new Date()) {
  const current = now.getTime();
  const due = [];
  for (const note of load()) {
    const reminder = note.reminder;
    if (!reminder?.remindAt || Date.parse(reminder.remindAt) > current) continue;
    const year = now.getFullYear();
    if (reminder.recurrence === 'yearly') {
      if (reminder.lastNotifiedYear === year) continue;
      reminder.lastNotifiedYear = year;
      const next = new Date(reminder.remindAt);
      next.setFullYear(year + 1);
      reminder.remindAt = next.toISOString();
    } else {
      if (reminder.notifiedAt) continue;
      reminder.notifiedAt = now.toISOString();
    }
    due.push(note);
  }
  if (due.length) persist();
  return due;
}

// Used by the delivery loop: unlike claimDueReminders(), this does not mutate
// state. A reminder is only marked delivered after Web Push reports success.
export function dueReminders(now = new Date()) {
  const current = now.getTime();
  const year = now.getFullYear();
  return load().filter((note) => {
    const reminder = note.reminder;
    if (!reminder?.remindAt || Date.parse(reminder.remindAt) > current) return false;
    return reminder.recurrence === 'yearly' ? reminder.lastNotifiedYear !== year : !reminder.notifiedAt;
  });
}

export function markReminderDelivered(id, now = new Date()) {
  const note = load().find((item) => item.id === id);
  const reminder = note?.reminder;
  if (!reminder) return null;
  if (reminder.recurrence === 'yearly') {
    reminder.lastNotifiedYear = now.getFullYear();
    const next = new Date(reminder.remindAt);
    next.setFullYear(now.getFullYear() + 1);
    reminder.remindAt = next.toISOString();
  } else {
    reminder.notifiedAt = now.toISOString();
  }
  persist();
  return note;
}
