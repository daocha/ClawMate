import { appUrl } from './urls.js';
import { getLang, t } from './i18n.js';

async function request(path, options) {
  const response = await fetch(appUrl(path), options);
  if (!response.ok) throw new Error(`Note request failed: ${response.status}`);
  return response.json();
}

const api = {
  list: () => request('api/notes'),
  create: (text) => request('api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
  update: (id, patch) => request(`api/notes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }),
  schedules: () => request('api/notes/schedules'),
  updateReminder: (id, patch) => request(`api/notes/${id}/reminder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }),
  remove: (id) => request(`api/notes/${id}`, { method: 'DELETE' }),
  removeMany: (ids) => request('api/notes/delete-many', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }),
  removeExpired: () => request('api/notes/delete-expired', { method: 'POST' })
};

function formatDate(iso, withTime = false) {
  return new Intl.DateTimeFormat(getLang(), withTime
    ? { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric' }).format(new Date(iso));
}

function noteDate(iso) {
  return new Date(iso).toDateString() === new Date().toDateString()
    ? new Intl.DateTimeFormat(getLang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    : formatDate(iso);
}

function isPermanent(note) { return note.expiresAt === null || note.reminder?.recurrence === 'yearly'; }

// Notes created before expiry support have no expiresAt. Keep them readable
// during a rolling server/PWA upgrade by treating them as the original 7-day
// default instead of throwing while a detail sheet is opening.
function expiryFor(note) {
  if (isPermanent(note)) return null;
  if (Number.isFinite(Date.parse(note.expiresAt))) return note.expiresAt;
  const date = new Date(note.createdAt);
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function isExpired(note) { const expiry = expiryFor(note); return expiry ? Date.parse(expiry) <= Date.now() : false; }

function localDateTimeValue(iso) {
  const d = new Date(iso); const pad = (value) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class NotesView {
  constructor(els, { onToast } = {}) {
    Object.assign(this, els);
    this.onToast = onToast;
    this.notes = [];
    this.schedules = [];
    this.scheduleId = null;
    this.selectedId = null;
    this.selection = new Set();
    this.recognition = null;
    this.search.addEventListener('input', () => this.render());
    this.addBtn.addEventListener('click', () => this.openEditor());
    this.closeBtns.forEach((button) => button.addEventListener('click', () => this.close()));
    this.contentBtn.addEventListener('click', () => this.openEditor(this.selected()));
    this.saveBtn.addEventListener('click', () => this.save());
    this.deleteBtn.addEventListener('click', () => this.remove());
    this.pinBtn.addEventListener('click', () => this.togglePin());
    this.deleteExpiredBtn.addEventListener('click', () => this.removeExpired());
    this.micBtn.addEventListener('click', () => this.toggleVoice());
    this.cancelDeleteBtns.forEach((button) => button.addEventListener('click', () => this.resolveDeleteConfirmation(false)));
    this.confirmDeleteBtn.addEventListener('click', () => this.resolveDeleteConfirmation(true));
    this.schedulesToggle.addEventListener('click', () => {
      const open = this.schedulesPanel.hidden;
      this.schedulesPanel.hidden = !open;
      this.schedulesToggle.setAttribute('aria-expanded', String(open));
    });
    this.scheduleCloseBtns.forEach((button) => button.addEventListener('click', () => { this.scheduleSheet.hidden = true; this.scheduleId = null; }));
    this.saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
    this.selectBtn.addEventListener('click', () => this.setSelecting(true));
    this.cancelSelectionBtn.addEventListener('click', () => this.setSelecting(false));
    this.deleteSelectedBtn.addEventListener('click', () => this.removeSelected());
    this.input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') this.save();
    });
  }

  selected() { return this.notes.find((note) => note.id === this.selectedId); }

  async load() {
    try {
      this.notes = (await api.list()).notes;
      try { await this.loadSchedules(); } catch { this.schedules = []; }
      this.render();
    }
    catch { this.onToast?.(t('notesLoadFail')); }
  }

  async openFromNotification(noteId) {
    await this.load();
    const note = this.notes.find((item) => item.id === noteId);
    if (note) this.openDetail(note);
  }

  matching(notes) {
    const needle = this.search.value.trim().toLocaleLowerCase();
    return needle ? notes.filter((note) => note.text.toLocaleLowerCase().includes(needle)) : notes;
  }

  makeCard(note) {
    const card = document.createElement('article');
    const selecting = !this.selectionBar.hidden;
    card.className = `sticky-note${note.pinned ? ' is-pinned' : ''}${selecting ? ' is-selecting' : ''}${this.selection.has(note.id) ? ' is-selected' : ''}`;
    card.tabIndex = 0;
    const text = document.createElement('p'); text.textContent = note.text;
    const meta = document.createElement('footer');
    const pin = document.createElement('span'); pin.textContent = note.pinned ? '📌' : '';
    const date = document.createElement('time'); date.dateTime = note.createdAt; date.textContent = noteDate(note.createdAt);
    meta.append(pin, date); card.append(text, meta);
    if (selecting) { const check = document.createElement('i'); check.className = 'note-check'; check.textContent = '✓'; card.append(check); }
    const open = () => selecting ? this.toggleSelection(note.id) : this.openDetail(note);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    return card;
  }

  fillList(target, notes) { target.innerHTML = ''; notes.forEach((note) => target.appendChild(this.makeCard(note))); }

  render() {
    const active = this.matching(this.notes.filter((note) => !isExpired(note)));
    const expired = this.matching(this.notes.filter(isExpired));
    this.fillList(this.list, active);
    this.fillList(this.expiredList, expired);
    this.empty.hidden = active.length + expired.length > 0;
    this.expiredSection.hidden = expired.length === 0;
    this.renderSchedules();
    this.selectionCount.textContent = t('selectedNotes').replace('{count}', String(this.selection.size));
    this.deleteSelectedBtn.textContent = t('deleteSelected');
    this.deleteSelectedBtn.disabled = this.selection.size === 0;
  }

  setSelecting(on) {
    this.selection.clear();
    this.selectionBar.hidden = !on;
    this.selectBtn.hidden = on;
    this.addBtn.hidden = on;
    this.render();
  }

  toggleSelection(id) { this.selection.has(id) ? this.selection.delete(id) : this.selection.add(id); this.render(); }

  async loadSchedules() {
    this.schedules = (await api.schedules()).schedules;
  }

  renderSchedules() {
    this.schedulesList.innerHTML = '';
    this.schedulesEmpty.hidden = this.schedules.length > 0;
    this.schedulesCount.textContent = this.schedules.length ? t('scheduleCount').replace('{count}', String(this.schedules.length)) : '';
    this.schedules.forEach((note) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'schedule-item';
      const icon = document.createElement('i'); icon.textContent = '🔔';
      const copy = document.createElement('span'); const title = document.createElement('b'); const meta = document.createElement('small');
      title.textContent = note.text;
      meta.textContent = `${formatDate(note.reminder.remindAt, true)} · ${t(note.reminder.recurrence === 'yearly' ? 'scheduleYearly' : 'scheduleOnce')}`;
      copy.append(title, meta); button.append(icon, copy); button.addEventListener('click', () => this.openScheduleEditor(note));
      this.schedulesList.appendChild(button);
    });
  }

  openScheduleEditor(note) {
    this.scheduleId = note.id;
    this.scheduleNoteText.textContent = note.text;
    this.scheduleTimeInput.value = localDateTimeValue(note.reminder.remindAt);
    this.scheduleRepeatInput.value = note.reminder.recurrence;
    this.scheduleSheet.hidden = false;
  }

  async saveSchedule() {
    const value = this.scheduleTimeInput.value;
    const remindAt = new Date(value);
    if (!this.scheduleId || Number.isNaN(remindAt.getTime()) || remindAt <= new Date()) return;
    this.saveScheduleBtn.disabled = true;
    try {
      const note = (await api.updateReminder(this.scheduleId, { remindAt: remindAt.toISOString(), recurrence: this.scheduleRepeatInput.value })).note;
      this.upsert(note); await this.loadSchedules(); this.render(); this.scheduleSheet.hidden = true; this.scheduleId = null;
      this.onToast?.(t('scheduleSaved'));
    } catch { this.onToast?.(t('scheduleSaveFail')); }
    finally { this.saveScheduleBtn.disabled = false; }
  }

  showSheet() { this.sheet.hidden = false; }

  openDetail(note) {
    this.stopVoice();
    this.selectedId = note.id;
    this.sheetTitle.textContent = t('noteDetail');
    this.contentBtn.textContent = note.text;
    this.contentBtn.hidden = false;
    this.expiryText.hidden = false;
    const reminder = note.reminder
      ? `🔔 ${t(note.reminder.recurrence === 'yearly' ? 'noteReminderYearly' : 'noteReminderOnce').replace('{date}', formatDate(note.reminder.remindAt, true))}`
      : '';
    const retention = isPermanent(note)
      ? t('noteKeptForever')
      : t('noteExpiresOn').replace('{date}', formatDate(expiryFor(note), true));
    this.expiryText.textContent = [reminder, retention, t('editNoteHint')].filter(Boolean).join(' · ');
    this.input.hidden = true;
    this.micBtn.hidden = true;
    this.saveBtn.hidden = true;
    this.deleteBtn.hidden = false;
    this.pinBtn.hidden = false;
    this.pinBtn.classList.toggle('is-on', Boolean(note.pinned));
    this.pinBtn.textContent = note.pinned ? t('unpinNote') : t('pinNote');
    this.showSheet();
  }

  openEditor(note = null) {
    this.stopVoice();
    this.selectedId = note?.id || null;
    this.sheetTitle.textContent = note ? t('editNote') : t('newNote');
    this.input.value = note?.text || '';
    this.contentBtn.hidden = true;
    this.expiryText.hidden = true;
    this.input.hidden = false;
    this.micBtn.hidden = false;
    this.saveBtn.hidden = false;
    this.saveBtn.textContent = note ? t('saveNote') : t('addNote');
    this.deleteBtn.hidden = !note;
    this.pinBtn.hidden = !note;
    this.pinBtn.classList.toggle('is-on', Boolean(note?.pinned));
    this.pinBtn.textContent = note?.pinned ? t('unpinNote') : t('pinNote');
    this.showSheet();
    // Editing an existing note is an intentional second tap, so put the caret
    // straight into the replacement textarea. Creating a new note stays calm
    // until the user chooses to tap the field or microphone.
    if (note) requestAnimationFrame(() => this.input.focus());
  }

  close() { this.stopVoice(); this.sheet.hidden = true; this.selectedId = null; }

  confirmDelete(message, actionKey = 'deleteNote') {
    this.deleteModalText.textContent = message;
    this.confirmDeleteBtn.textContent = t(actionKey);
    this.deleteModal.hidden = false;
    return new Promise((resolve) => { this.deleteConfirmation = resolve; });
  }

  resolveDeleteConfirmation(confirmed) {
    this.deleteModal.hidden = true;
    const resolve = this.deleteConfirmation;
    this.deleteConfirmation = null;
    resolve?.(confirmed);
  }

  upsert(note) {
    const index = this.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) this.notes[index] = note;
    else this.notes.unshift(note);
    this.notes.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }

  async save() {
    const text = this.input.value.trim();
    if (!text) return;
    this.saveBtn.disabled = true;
    try {
      const note = this.selectedId ? (await api.update(this.selectedId, { text })).note : (await api.create(text)).note;
      this.upsert(note);
      try { await this.loadSchedules(); } catch { /* notes must remain usable if schedules are unavailable */ }
      this.render(); this.close(); this.onToast?.(t('noteSaved'));
    } catch { this.onToast?.(t('notesSaveFail')); }
    finally { this.saveBtn.disabled = false; }
  }

  async togglePin() {
    const note = this.selected();
    if (!note) return;
    this.pinBtn.disabled = true;
    try {
      const updated = (await api.update(note.id, { pinned: !note.pinned })).note;
      this.upsert(updated); this.render(); this.openDetail(updated);
    } catch { this.onToast?.(t('notesSaveFail')); }
    finally { this.pinBtn.disabled = false; }
  }

  async remove() {
    const note = this.selected();
    if (!note || !await this.confirmDelete(t('deleteNoteConfirm'))) return;
    this.deleteBtn.disabled = true;
    try {
      await api.remove(note.id); this.notes = this.notes.filter((item) => item.id !== note.id);
      try { await this.loadSchedules(); } catch { /* best effort */ }
      this.render(); this.close(); this.onToast?.(t('noteDeleted'));
    } catch { this.onToast?.(t('notesSaveFail')); }
    finally { this.deleteBtn.disabled = false; }
  }

  async removeSelected() {
    const ids = [...this.selection];
    if (!ids.length || !await this.confirmDelete(t('deleteSelectedConfirm').replace('{count}', String(ids.length)), 'deleteSelected')) return;
    this.deleteSelectedBtn.disabled = true;
    try {
      await api.removeMany(ids);
      this.notes = this.notes.filter((note) => !this.selection.has(note.id));
      this.setSelecting(false);
      try { await this.loadSchedules(); } catch { /* best effort */ }
      this.render(); this.onToast?.(t('noteDeleted'));
    } catch { this.onToast?.(t('notesSaveFail')); }
    finally { this.deleteSelectedBtn.disabled = false; }
  }

  async removeExpired() {
    if (!await this.confirmDelete(t('deleteExpiredConfirm'), 'deleteExpired')) return;
    this.deleteExpiredBtn.disabled = true;
    try {
      await api.removeExpired(); this.notes = this.notes.filter((note) => !isExpired(note));
      this.render(); this.onToast?.(t('noteDeleted'));
    } catch { this.onToast?.(t('notesSaveFail')); }
    finally { this.deleteExpiredBtn.disabled = false; }
  }

  toggleVoice() {
    if (this.recognition) return this.stopVoice();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return this.onToast?.(t('micUnsupported'));
    const recognition = new SR();
    recognition.lang = getLang() === 'zh-TW' ? 'zh-TW' : 'en-US'; recognition.interimResults = true; recognition.continuous = false;
    this.recognition = recognition; this.micBtn.classList.add('is-live');
    let finalText = this.input.value.trim();
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${finalText ? ' ' : ''}${chunk}`;
        else interim += chunk;
      }
      this.input.value = `${finalText}${interim ? `${finalText ? ' ' : ''}${interim}` : ''}`;
    };
    recognition.onerror = (event) => { this.onToast?.(event.error === 'not-allowed' ? t('micDenied') : t('micUnsupported')); this.stopVoice(); };
    recognition.onend = () => this.stopVoice();
    try { recognition.start(); } catch { this.stopVoice(); }
  }

  stopVoice() {
    this.micBtn.classList.remove('is-live');
    if (!this.recognition) return;
    const recognition = this.recognition; this.recognition = null; recognition.onend = null;
    try { recognition.stop(); } catch { /* already stopped */ }
  }
}
