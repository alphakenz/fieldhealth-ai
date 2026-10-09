const APP_DB = 'fieldhealth-pwa';
const APP_STORE = 'visits';
const DEMO_CODE_KEY = 'fieldhealth_demo_code';

const fields = [
  ['household_code', 'Household code'],
  ['households_visited', 'Households visited'],
  ['people_present', 'People present'],
  ['water_source', 'Water source'],
  ['follow_up_required', 'Follow-up required'],
  ['follow_up_type', 'Follow-up type']
];

const state = {
  route: 'dashboard',
  records: [],
  current: null,
  captureMode: 'speak',
  manualFields: new Set(),
  aiHasAnalyzed: false,
  aiNote: '',
  aiResult: null,
  aiBusy: false,
  listening: false,
  installPrompt: null,
  serverOnline: false,
  syncConflict: null,
  lastError: ''
};

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `visit-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const nowIso = () => new Date().toISOString();
const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not recorded';
const numberValue = (value) => value === null || value === undefined ? '' : String(value);
const token = () => sessionStorage.getItem(DEMO_CODE_KEY) || '';

function emptyRecord() {
  return {
    id: uid(),
    activity: 'household_visit',
    community: 'Fictional demo workspace',
    visit_date: new Date().toISOString().slice(0, 10),
    follow_up_status: 'open',
    server_revision: 0,
    sync_state: 'pending',
    household_code: '',
    households_visited: null,
    people_present: null,
    water_source: '',
    follow_up_required: false,
    follow_up_type: '',
    note: '',
    status: 'draft',
    created_at: nowIso(),
    updated_at: nowIso(),
    synced: false
  };
}

function normalizeRecord(record) {
  const normalized = { ...emptyRecord(), ...record };
  if (normalized.follow_up_required === 'true') normalized.follow_up_required = true;
  if (normalized.follow_up_required === 'false') normalized.follow_up_required = false;
  return normalized;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(APP_STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(APP_STORE, 'readonly').objectStore(APP_STORE).getAll();
    request.onsuccess = () => resolve(request.result.filter((record) => !record.deleted).map(normalizeRecord).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
    request.onerror = () => reject(request.error);
  });
}

async function localGetDeleted() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(APP_STORE, 'readonly').objectStore(APP_STORE).getAll();
    request.onsuccess = () => resolve(request.result.filter((record) => record.deleted).map(normalizeRecord));
    request.onerror = () => reject(request.error);
  });
}

async function localPut(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(APP_STORE, 'readwrite').objectStore(APP_STORE).put(normalizeRecord(record));
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

async function localDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(APP_STORE, 'readwrite').objectStore(APP_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function setNotice(message, type = 'info') {
  const notice = $('#notice');
  if (!notice) return;
  notice.className = `notice ${type}`;
  notice.textContent = message;
  notice.hidden = !message;
  if (message) window.setTimeout(() => { if (notice.textContent === message) notice.hidden = true; }, 6000);
}

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(path, { ...options, headers });
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) {
    const error = new Error(body.error || (response.status === 401 ? 'Enter the demo access code in Settings.' : 'The service is unavailable right now.'));
    error.status = response.status;
    error.data = body;
    throw error;
  }
  return body;
}

function normalizedHouseholdCode(record) {
  return String(record?.household_code || '').trim().toUpperCase();
}

function duplicateVisit(record) {
  const householdCode = normalizedHouseholdCode(record);
  if (!householdCode || !record?.visit_date) return null;
  return state.records.find((candidate) => candidate.id !== record.id && normalizedHouseholdCode(candidate) === householdCode && candidate.visit_date === record.visit_date) || null;
}

function fieldIssueMap(record) {
  const issues = {};
  if (!record.household_code || !/^HH-[A-Za-z0-9-]{1,30}$/.test(record.household_code)) issues.household_code = 'Add a household code like HH-014.';
  if (!record.households_visited || Number(record.households_visited) < 1) issues.households_visited = 'Add the number of households visited.';
  if (record.people_present === null || record.people_present === '' || Number(record.people_present) < 0) issues.people_present = 'Add the number of people present.';
  if (!record.water_source) issues.water_source = 'Choose a water source.';
  if (record.follow_up_required && !record.follow_up_type) issues.follow_up_type = 'Choose a follow-up type.';
  const duplicate = duplicateVisit(record);
  if (duplicate) issues.household_code = `A visit for ${duplicate.household_code} already exists for ${duplicate.visit_date}.`;
  return issues;
}

function qualityIssues(record) {
  return Object.values(fieldIssueMap(record));
}

function pendingCount() {
  return state.records.filter((record) => !record.synced).length;
}

function connectionStatus() {
  const pending = pendingCount();
  if (navigator.onLine === false) return { className: 'offline', label: 'Offline · saved on device' };
  if (state.syncConflict) return { className: 'conflict', label: 'Conflict · choose a copy' };
  if (!token()) return { className: 'attention', label: 'Online · demo code needed' };
  if (pending) return { className: 'pending', label: `Waiting to sync (${pending})` };
  if (state.serverOnline) return { className: 'online', label: 'Synced' };
  return { className: 'offline', label: 'Saved on device' };
}

function connectionMarkup() {
  const status = connectionStatus();
  return `<span id="connection" class="connection status-chip ${status.className}" role="status" aria-live="polite"><span class="status-mark" aria-hidden="true"></span>${status.label}</span>`;
}

function attentionMarkup() {
  const items = [];
  if (state.syncConflict) items.push({ label: 'Sync conflict', detail: 'Choose which copy to keep in Records.', action: 'records' });
  state.records.filter((record) => !record.synced).slice(0, 3).forEach((record) => {
    items.push({ label: record.household_code || 'Uncoded household', detail: record.status === 'draft' ? 'Complete the missing details before confirmation.' : 'Saved on this device and waiting to sync.', action: 'edit', id: record.id });
  });
  if (!items.length) return '';
  const rows = items.map((item) => {
    const attributes = item.action === 'edit' ? `data-action="edit-record" data-id="${esc(item.id)}"` : 'data-route="records"';
    return `<button class="attention-row" ${attributes} type="button"><span class="attention-mark" aria-hidden="true">!</span><span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span><span class="attention-arrow" aria-hidden="true">›</span></button>`;
  }).join('');
  return `<section class="attention-card" aria-labelledby="attention-title"><div class="card-heading"><div><p class="eyebrow">Needs attention</p><h2 id="attention-title">Keep your fieldwork moving</h2></div><span class="attention-count">${items.length}</span></div><div class="attention-list">${rows}</div></section>`;
}

function navIcon(name) {
  const paths = {
    today: '<path d="M4 5.5h16M6.5 3v5M17.5 3v5M5 9.5h14v10H5z"/><path d="M8 13h3M13 13h3M8 16h3"/>',
    visit: '<path d="M12 5v14M5 12h14"/>',
    records: '<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    settings: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19 13.5 1.2 1-.1 1.8-1.5.8-.4 1.4.8 1.5-1.3 1.3-1.5-.8-1.4.4-.8 1.5-1.8.1-1-1.2-1.4-.4-1.5.8-1.3-1.3.8-1.5-.4-1.4-1.5-.8-.1-1.8 1.2-1  .4-1.4- .8-1.5 1.3-1.3 1.5.8 1.4-.4.8-1.5 1.8-.1 1 1.2 1.4.4Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function navMarkup() {
  const items = [['dashboard', 'Today', 'today'], ['visit', 'New visit', 'visit'], ['records', 'Records', 'records'], ['settings', 'Settings', 'settings']];
  return items.map(([route, label, icon]) => `<a class="nav-link ${state.route === route ? 'active' : ''}" href="#${route}" data-route="${route}">${navIcon(icon)}<span>${label}</span></a>`).join('');
}

function micIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/></svg>';
}

function shellMarkup() {
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <aside class="app-sidebar">
      <a class="brand" href="#dashboard" aria-label="FieldHealth home"><span class="brand-mark">FH</span><span><strong>FieldHealth</strong><small>Field reporting workspace</small></span></a>
      <nav class="primary-nav" aria-label="Primary navigation">${navMarkup()}</nav>
      <div class="sidebar-foot"><span class="offline-dot"></span><span id="sidebar-status">Local-first workspace</span></div>
    </aside>
    <div class="app-shell">
      <header class="topbar">
        <div><p class="eyebrow">FieldHealth AI</p><h1 id="page-title">Today</h1></div>
        <div class="topbar-actions">${connectionMarkup()}<button id="sync" class="button secondary" type="button">Sync <span id="pending">0</span></button></div>
      </header>
      <div class="scope-notice" role="note"><span class="scope-icon" aria-hidden="true">i</span><span><strong>Fictional data</strong> · Administrative reporting only</span></div>
      <main id="main" tabindex="-1"></main>
      <nav class="mobile-nav" aria-label="Mobile navigation">${navMarkup()}</nav>
      <div id="notice" class="notice" role="status" hidden></div>
    </div>`;
}

function dashboardView() {
  const confirmed = state.records.filter((record) => record.status === 'confirmed');
  const households = confirmed.reduce((total, record) => total + Number(record.households_visited || 0), 0);
  const people = confirmed.reduce((total, record) => total + Number(record.people_present || 0), 0);
  const followUps = confirmed.filter((record) => record.follow_up_required).length;
  const ai = state.aiResult;
  return `
    <section class="welcome-row"><div><p class="eyebrow accent">Good fieldwork starts with a clear note</p><h2>Turn a spoken observation into a ready-to-review visit.</h2><p class="lede">Use the assistant to capture what you see in plain language. It suggests structured fields while keeping your original note for review.</p></div><button class="button primary-action" data-action="new-visit" type="button">Start a visit</button></section>
    <section class="ai-card" aria-labelledby="assistant-title">
      <div class="ai-card-heading"><div class="ai-badge">AI</div><div><p class="eyebrow accent">FieldHealth AI</p><h2 id="assistant-title">AI Field Assistant</h2><p>Speak or type a field note. The assistant finds counts, water sources, and follow-up needs while leaving your original words intact.</p></div><span class="ai-live">Ready</span></div>
      <div class="assistant-input"><label for="ai-note">What did you observe?</label><div class="input-with-action"><textarea id="ai-note" rows="4" placeholder="Example: We visited five households. Two people were present at each home. Three use a borehole. One household needs a follow-up visit.">${esc(state.aiNote)}</textarea><button id="ai-voice" class="voice-button ${state.listening ? 'listening' : ''}" type="button" aria-label="Use voice input">${micIcon()}<span>${state.listening ? 'Listening…' : 'Speak'}</span></button></div><div class="assistant-actions"><span class="hint">Tip: tap your phone keyboard microphone if browser voice input is unavailable.</span><button id="analyze" class="button primary" type="button" ${state.aiBusy ? 'disabled' : ''}>${state.aiBusy ? 'Analyzing…' : 'Analyze note'}</button></div></div>
      ${ai ? aiResultMarkup(ai) : '<div class="ai-empty"><strong>Your original words stay visible.</strong><span>After analysis, review each suggestion before saving the visit.</span></div>'}
    </section>
    ${attentionMarkup()}
    <section class="section-heading"><div><p class="eyebrow">Confirmed activity</p><h2>Your field snapshot</h2></div><button class="text-button" data-route="reports" type="button">Open reports</button></section>
    <section class="metrics metrics-four"><article class="metric-card"><span>Households visited</span><strong>${households}</strong><small>Confirmed visits</small></article><article class="metric-card"><span>People reached</span><strong>${people}</strong><small>Present during visits</small></article><article class="metric-card"><span>Follow-ups</span><strong>${followUps}</strong><small>Need attention</small></article><article class="metric-card"><span>Pending sync</span><strong>${pendingCount()}</strong><small>${state.serverOnline ? 'Ready to sync' : 'Saved on this device'}</small></article></section>
    ${state.records.length ? `<section class="card recent-card"><div class="card-heading"><div><p class="eyebrow">Recent records</p><h2>Latest visits</h2></div><button class="text-button" data-route="records" type="button">View all</button></div>${recentRows(state.records.slice(0, 3))}</section>` : '<section class="empty-card"><div class="empty-icon">+</div><h2>Your first visit starts here</h2><p>Capture a household visit and it will remain available even when you lose connection.</p><button class="button primary" data-action="new-visit" type="button">Create visit</button></section>'}`;
}

function aiResultMarkup(result) {
  const extraction = result.extraction || result.draft || {};
  const rows = fields.map(([key, label]) => `<div class="suggestion-row"><span>${label}</span><strong>${esc(extraction[key] === null || extraction[key] === undefined || extraction[key] === '' ? 'Not found in notes' : extraction[key])}</strong></div>`).join('');
  const applied = result.applied;
  const actions = applied
    ? '<p class="ai-applied-note"><span aria-hidden="true">✓</span><span>These values were filled into the visit details below. Review anything marked <strong>Needs attention</strong>.</span></p><button class="text-button" data-action="clear-ai" type="button">Clear result</button>'
    : '<button class="button primary" data-action="use-extraction" type="button">Review in visit form</button><button class="text-button" data-action="clear-ai" type="button">Clear result</button>';
  return `<div class="ai-result"><div class="result-header"><div><p class="eyebrow accent">${applied ? 'AI values applied' : 'AI proposal'}</p><h3>${applied ? 'Check the visit details' : result.quality?.is_confirmable ? 'The note is ready to review' : 'A few details still need your input'}</h3></div><span class="confidence-pill">${applied ? 'Review now' : result.quality?.is_confirmable ? 'Good coverage' : 'Needs review'}</span></div><div class="suggestions-grid">${rows}</div><div class="original-note"><span>Original note</span><p>${esc(result.original_note || state.aiNote)}</p></div><div class="result-actions">${actions}</div></div>`;
}

function recentRows(records) {
  return `<div class="recent-list">${records.map((record) => `<button class="recent-row" data-action="edit-record" data-id="${esc(record.id)}" type="button"><span class="record-status ${record.status}"></span><span class="recent-main"><strong>${esc(record.household_code || 'Uncoded household')}</strong><small>${dateLabel(record.updated_at)} · ${record.households_visited || 0} household${Number(record.households_visited) === 1 ? '' : 's'}</small></span><span class="row-state">${record.status === 'confirmed' ? 'Confirmed' : 'Draft'}<span aria-hidden="true">›</span></span></button>`).join('')}</div>`;
}

function displayLabel(value) {
  return String(value || 'Not recorded').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function syncConflictMarkup() {
  const conflict = state.syncConflict;
  if (!conflict) return '';
  const local = conflict.local || {};
  const server = conflict.server || {};
  return `<section class="card sync-conflict" role="alert" aria-labelledby="sync-conflict-title"><p class="eyebrow accent">Sync needs a choice</p><h3 id="sync-conflict-title">This visit changed in two places</h3><p class="muted">Choose which version to keep. Your local version stays on this device until you decide.</p><div class="conflict-compare"><div><strong>Your device</strong><span>${esc(local.household_code || 'Uncoded')} · ${esc(local.note || 'No note')}</span></div><div><strong>Online copy</strong><span>${esc(server.household_code || 'Uncoded')} · ${esc(server.note || 'No note')}</span></div></div><div class="conflict-actions"><button class="button secondary" data-action="use-server-conflict" type="button">Use online copy</button><button class="button primary" data-action="keep-local-conflict" type="button">Keep my copy</button></div></section>`;
}

function visitView() {
  const record = normalizeRecord(state.current || emptyRecord());
  const issues = qualityIssues(record);
  return `<section class="page-intro"><div><p class="eyebrow accent">Household visit</p><h2>${record.status === 'confirmed' ? 'Review confirmed visit' : 'New household visit'}</h2><p class="lede">Complete the quick facts, then review the note before confirming.</p></div><span class="save-state ${record.synced ? 'synced' : ''}">${record.synced ? 'Synced' : record.status === 'confirmed' ? 'Saved locally' : 'Draft'}</span></section>
    <div class="visit-layout"><form id="visit-form" class="card visit-form" novalidate><div class="form-card-heading"><div><p class="eyebrow">Step 1</p><h3>Visit facts</h3></div><span class="required-note">Required fields marked *</span></div><div class="form-grid"><label>Household code<input name="household_code" value="${esc(record.household_code)}" placeholder="Example: HH-014" autocomplete="off"></label><label>Households visited *<input name="households_visited" type="number" min="1" max="1000" inputmode="numeric" value="${numberValue(record.households_visited)}"></label><label>People present *<input name="people_present" type="number" min="0" max="100" inputmode="numeric" value="${numberValue(record.people_present)}"></label><label>Water source *<select name="water_source"><option value="">Choose one</option>${['borehole', 'tap', 'well', 'surface_water', 'rainwater', 'other'].map((value) => `<option value="${value}" ${record.water_source === value ? 'selected' : ''}>${value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>`).join('')}</select></label><label>Follow-up needed<select name="follow_up_required"><option value="false" ${!record.follow_up_required ? 'selected' : ''}>No</option><option value="true" ${record.follow_up_required ? 'selected' : ''}>Yes</option></select></label><label>Follow-up type<input name="follow_up_type" value="${esc(record.follow_up_type)}" placeholder="Example: water treatment"></label></div><div class="form-divider"></div><div class="form-card-heading note-heading"><div><p class="eyebrow">Step 2</p><h3>Observation note</h3></div><button id="form-voice" class="small-button" type="button">${state.listening ? 'Listening…' : 'Speak note'}</button></div><p class="field-help">Use your voice or type naturally. The original note is kept with the visit.</p><textarea name="note" rows="6" placeholder="Describe what you observed in the community…">${esc(record.note)}</textarea><div class="form-actions"><button class="button secondary" data-action="cancel-visit" type="button">Cancel</button><button class="button primary" type="submit">${record.status === 'confirmed' ? 'Save changes' : 'Save visit'}</button></div></form><aside class="review-rail"><div class="card"><p class="eyebrow accent">Before you confirm</p><h3>Quick quality check</h3>${issues.length ? `<ul class="issue-list">${issues.map((issue) => `<li>${esc(issue)}</li>`).join('')}</ul><p class="rail-copy">You can save this as a draft and finish it later.</p>` : '<div class="ready-state"><span>✓</span><p><strong>Looks complete</strong><br>Review the details, then save the visit.</p></div>'}</div><div class="card assistant-tip"><div class="ai-badge small">AI</div><h3>Need help structuring the note?</h3><p>Go to Today and use the AI Field Assistant. It will suggest values without replacing your original words.</p><button class="text-button" data-route="dashboard" type="button">Open assistant</button></div></aside></div>`;
}

function recordsView() {
  const cards = state.records.map((record) => `<button class="record-card" data-action="edit-record" data-id="${esc(record.id)}" type="button"><span class="record-card-heading"><strong>${esc(record.household_code || 'Uncoded household')}</strong><span class="table-status ${record.status}">${record.status === 'confirmed' ? 'Confirmed' : 'Draft'}</span></span><span class="record-card-details"><span>${record.households_visited || 0} household${Number(record.households_visited) === 1 ? '' : 's'}</span><span>${record.people_present ?? '—'} people</span><span>${esc(displayLabel(record.water_source))}</span></span><span class="record-card-footer"><span>${dateLabel(record.updated_at)}</span><span aria-hidden="true">Open ›</span></span></button>`).join('');
  return `${syncConflictMarkup()}<section class="page-intro"><div><p class="eyebrow accent">Your records</p><h2>Visit register</h2><p class="lede">Everything captured on this device, including drafts waiting for sync.</p></div><button class="button primary" data-action="new-visit" type="button">New visit</button></section>${state.records.length ? `<section class="records-list" aria-label="Saved visits">${cards}</section>` : '<section class="empty-card"><div class="empty-icon">+</div><h2>No visits yet</h2><p>Saved visits will appear here and can be exported as CSV.</p></section>'}`;
}

function reportsView() {
  const confirmed = state.records.filter((record) => record.status === 'confirmed');
  const households = confirmed.reduce((sum, record) => sum + Number(record.households_visited || 0), 0);
  const people = confirmed.reduce((sum, record) => sum + Number(record.people_present || 0), 0);
  const followUps = confirmed.filter((record) => record.follow_up_required).length;
  const water = confirmed.reduce((counts, record) => { const key = record.water_source || 'not recorded'; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
  return `<section class="page-intro"><div><p class="eyebrow accent">Reports</p><h2>Simple field snapshot</h2><p class="lede">Use these totals for a quick review, then export the underlying records.</p></div><button class="button primary" data-action="export-csv" type="button">Export CSV</button></section><section class="metrics metrics-three"><article class="metric-card"><span>Households visited</span><strong>${households}</strong><small>Confirmed records</small></article><article class="metric-card"><span>People reached</span><strong>${people}</strong><small>People present</small></article><article class="metric-card"><span>Follow-ups</span><strong>${followUps}</strong><small>Records needing action</small></article></section><section class="report-grid"><div class="card"><div class="card-heading"><div><p class="eyebrow">Water sources</p><h3>What communities reported</h3></div></div>${Object.keys(water).length ? `<div class="bar-list">${Object.entries(water).map(([name, count]) => `<div class="bar-row"><div><span>${esc(name)}</span><strong>${count}</strong></div><div class="bar-track"><span style="width:${Math.min(100, count / Math.max(...Object.values(water)) * 100)}%"></span></div></div>`).join('')}</div>` : '<p class="muted">Confirm a visit to see the snapshot.</p>'}</div><div class="card"><p class="eyebrow accent">Export-ready</p><h3>Share the evidence</h3><p class="muted">CSV export includes visit facts, the original note, status, and timestamps. It works offline with the records on this device.</p><button class="button secondary" data-action="export-csv" type="button">Download visit CSV</button></div></section>`;
}

function settingsView() {
  return `<section class="page-intro"><div><p class="eyebrow accent">Settings</p><h2>Workspace settings</h2><p class="lede">Use the public demo with fictional records.</p></div></section><section class="settings-grid"><div class="card"><p class="eyebrow accent">Demo access</p><h3>Connect online services</h3><p class="muted">The demo access code enables synchronization and the AI assistant. It stays in this browser tab’s session.</p><label>Demo access code<input id="demo-code" type="password" value="${esc(token())}" placeholder="Enter the code provided for this demo" autocomplete="off"></label><div class="form-actions"><button class="button primary" data-action="save-token" type="button">Save demo code</button><button class="button secondary" data-action="clear-token" type="button">Clear</button></div></div><div class="card"><p class="eyebrow">Install</p><h3>Keep FieldHealth on your phone</h3><p class="muted">Install the PWA for a focused field workspace. Forms and records remain available when you are offline.</p><button id="install-app" class="button secondary" data-action="install-app" type="button" ${state.installPrompt ? '' : 'disabled'}>${state.installPrompt ? 'Install FieldHealth' : 'Install option appears in a supported browser'}</button></div><div class="card"><p class="eyebrow">Demo safety</p><h3>Fictional records only</h3><p class="muted">This public demo is for fictional records only. Do not enter names, phone numbers, or medical details.</p><div class="privacy-callout"><span>i</span><p>AI suggestions are not a diagnosis or a decision. A field worker reviews every suggestion before a visit is confirmed.</p></div></div><div class="card"><p class="eyebrow">Explore</p><h3>Reports and exports</h3><p class="muted">Review totals and download your visit register as a CSV file.</p><button class="button secondary" data-route="reports" type="button">Open reports</button></div></section>`;
}

function render() {
  const titles = { dashboard: 'Today', visit: 'New visit', records: 'Records', reports: 'Reports', settings: 'Settings' };
  $('#page-title').textContent = titles[state.route] || 'Today';
  document.querySelectorAll('.primary-nav, .mobile-nav').forEach((nav) => { nav.innerHTML = navMarkup(); });
  $('#main').innerHTML = state.route === 'dashboard' ? dashboardView() : state.route === 'visit' ? visitView() : state.route === 'records' ? recordsView() : state.route === 'reports' ? reportsView() : settingsView();
  $('#pending').textContent = pendingCount();
  const connection = $('#connection');
  if (connection) connection.outerHTML = connectionMarkup();
  $('#sidebar-status').textContent = state.serverOnline ? 'Online services ready' : 'Local-first workspace';
  bindViewEvents();
  if (state.route === 'visit' && state.captureMode === 'speak' && state.aiHasAnalyzed) {
    window.requestAnimationFrame(() => $('#visit-error-summary')?.focus({ preventScroll: false }));
  }
}

function setRoute(route) {
  state.route = route;
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  if (route !== 'visit') state.listening = false;
  render();
  window.requestAnimationFrame(() => $('#main')?.focus({ preventScroll: true }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateCurrentFromForm(form) {
  if (!state.current) state.current = emptyRecord();
  const data = new FormData(form);
  state.current = normalizeRecord({ ...state.current, household_code: data.get('household_code')?.trim() || '', households_visited: data.get('households_visited') === '' ? null : Number(data.get('households_visited')), people_present: data.get('people_present') === '' ? null : Number(data.get('people_present')), water_source: data.get('water_source') || '', follow_up_required: data.get('follow_up_required') === 'true', follow_up_type: data.get('follow_up_type')?.trim() || '', note: data.get('note') || '', updated_at: nowIso() });
}

async function saveCurrent(event) {
  event.preventDefault();
  updateCurrentFromForm(event.currentTarget);
  const duplicate = duplicateVisit(state.current);
  if (duplicate) {
    setNotice(`Duplicate visit: ${duplicate.household_code} already has a record for ${duplicate.visit_date}.`, 'warning');
    render();
    return;
  }
  const issues = qualityIssues(state.current);
  state.current.status = issues.length ? 'draft' : 'confirmed';
  state.current.synced = false;
  await localPut(state.current);
  state.records = await localGetAll();
  setNotice(issues.length ? 'Draft saved. Complete the missing fields, then confirm the visit.' : 'Visit confirmed on this device. Sync it when you are online.', issues.length ? 'warning' : 'success');
  setRoute('records');
}

async function deleteCurrent() {
  const record = state.current;
  if (!record || !state.records.some((candidate) => candidate.id === record.id)) return;
  if (!window.confirm(`Delete the visit for ${record.household_code || 'this household'}? This cannot be undone.`)) return;
  try {
    if (record.synced || Number(record.server_revision) > 0) {
      await localPut({ ...record, deleted: true, synced: false, updated_at: nowIso() });
    } else {
      await localDelete(record.id);
    }
    state.records = await localGetAll();
    state.current = null;
    setNotice('Visit deleted.', 'success');
    setRoute('records');
  } catch (error) {
    setNotice(error.message || 'The visit could not be deleted.', 'warning');
  }
}

function applyExtraction(options = {}) {
  const extraction = state.aiResult?.extraction || state.aiResult?.draft;
  if (!extraction) return;
  const current = { ...(state.current || emptyRecord()) };
  fields.forEach(([key]) => {
    const value = extraction[key];
    if (value !== null && value !== undefined && value !== '' && !state.manualFields.has(key)) current[key] = value;
  });
  state.current = normalizeRecord({ ...current, note: state.aiResult.original_note || state.aiNote || current.note || '', status: 'draft' });
  state.aiHasAnalyzed = true;
  if (!options.keepResult) {
    state.aiResult = null;
    setRoute('visit');
  }
}

function startVoice(target) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { setNotice('Voice input is not available in this browser. Use the microphone on your phone keyboard instead.', 'info'); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-NG';
  recognition.interimResults = true;
  recognition.continuous = false;
  state.listening = true;
  render();
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ');
    if (target === 'assistant') { state.aiNote = transcript; } else { const textarea = document.querySelector('#visit-form textarea[name="note"]'); const existing = state.current?.note || textarea?.value || ''; const next = `${existing ? `${existing} ` : ''}${transcript}`; if (state.current) state.current.note = next; }
    render();
  };
  recognition.onerror = () => { state.listening = false; setNotice('Voice input stopped. You can use the keyboard microphone or type the note.', 'info'); render(); };
  recognition.onend = () => { state.listening = false; render(); };
  recognition.start();
}

async function analyzeNote() {
  const visitForm = $('#visit-form');
  if (visitForm) updateCurrentFromForm(visitForm);
  const note = $('#ai-note')?.value.trim() || visitForm?.querySelector('textarea[name="note"]')?.value.trim() || state.current?.note?.trim() || '';
  state.aiNote = note;
  if (state.current) state.current.note = note;
  if (!note) { setNotice('Add or speak an observation first.', 'warning'); return; }
  state.aiBusy = true;
  render();
  try {
    const result = await api('/api/extract', { method: 'POST', body: JSON.stringify({ note, synthetic_data_confirmed: true }) });
    state.aiResult = result;
    if (visitForm && state.captureMode === 'speak') {
      applyExtraction({ keepResult: true });
      state.aiResult = { ...result, applied: true };
      setNotice('AI filled the visit details. Review the fields marked Needs attention.', 'success');
    } else {
      setNotice('AI suggestions are ready for your review.', 'success');
    }
  }
  catch (error) { setNotice(error.message, 'warning'); }
  finally { state.aiBusy = false; render(); }
}

async function syncRecords() {
  if (!navigator.onLine) { setNotice('You are offline. Records are safe on this device and will sync later.', 'info'); return; }
  try {
    const deleted = await localGetDeleted();
    for (const record of deleted) {
      try {
        await api(`/api/visits/${encodeURIComponent(record.id)}?server_revision=${encodeURIComponent(record.server_revision || 0)}`, { method: 'DELETE' });
      } catch (error) {
        if (!String(error.message || '').toLowerCase().includes('not found')) throw error;
      }
      await localDelete(record.id);
    }
    const pending = state.records.filter((record) => !record.synced);
    for (const record of pending) { const allowedFollowUp = ['health_education', 'administrative', 'other']; const serverRecord = { ...record, follow_up_type: record.follow_up_required ? (allowedFollowUp.includes(record.follow_up_type) ? record.follow_up_type : 'other') : null }; const result = await api('/api/visits', { method: 'POST', body: JSON.stringify(serverRecord) }); await localPut({ ...(result.visit || serverRecord), synced: true }); }
    const remote = await api('/api/visits');
    for (const record of remote.visits || []) await localPut({ ...record, synced: true });
    state.records = await localGetAll();
    setNotice('Records synced successfully.', 'success');
  } catch (error) {
    if (error.status === 409 && error.data?.server_record) {
      const server = normalizeRecord(error.data.server_record);
      const local = state.records.find((record) => record.id === server.id) || null;
      state.syncConflict = { local, server };
      setNotice('A visit changed online. Choose which copy to keep in Records.', 'warning');
    } else {
      setNotice(error.message, 'warning');
    }
  }
  render();
}

async function resolveSyncConflict(choice) {
  const conflict = state.syncConflict;
  if (!conflict) return;
  const server = conflict.server;
  const local = conflict.local;
  try {
    if (choice === 'server') {
      await localPut({ ...server, synced: true });
      setNotice('The online copy is now saved on this device.', 'success');
    } else if (local) {
      await localPut({ ...local, server_revision: server.server_revision, synced: false, updated_at: nowIso() });
      setNotice('Your copy is kept and ready to sync again.', 'success');
    }
    state.syncConflict = null;
    state.records = await localGetAll();
  } catch (error) {
    setNotice(error.message || 'The sync choice could not be saved.', 'warning');
  }
  render();
}

function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function exportCsv() {
  const headings = ['id', 'household_code', 'households_visited', 'people_present', 'water_source', 'follow_up_required', 'follow_up_type', 'note', 'status', 'created_at', 'updated_at'];
  const body = state.records.map((record) => headings.map((heading) => csvCell(record[heading])).join(','));
  const blob = new Blob([[headings.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fieldhealth-visits-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  setNotice('CSV export downloaded.', 'success');
}

async function seedDemo() {
  state.records = await localGetAll();
  if (state.records.length) return;
  const examples = [
    { id: 'demo-001', household_code: 'HH-DEMO-001', households_visited: 1, people_present: 4, water_source: 'borehole', follow_up_required: false, follow_up_type: '', note: 'Fictional demo record: household uses a borehole and reported no urgent concern.', status: 'confirmed', synced: false },
    { id: 'demo-002', household_code: 'HH-DEMO-002', households_visited: 1, people_present: 3, water_source: 'well', follow_up_required: true, follow_up_type: 'health_education', note: 'Fictional demo record: family requested a follow-up on safe water treatment.', status: 'confirmed', synced: false }
  ];
  for (const example of examples) await localPut({ ...emptyRecord(), ...example, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() });
  state.records = await localGetAll();
}

async function installApp() {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  render();
}

function updateVisitActionState(form) {
  updateCurrentFromForm(form);
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  const record = state.current || emptyRecord();
  const issues = qualityIssues(record);
  const confirmed = issues.length === 0;
  submit.textContent = issues.length ? 'Save draft' : (record.status === 'confirmed' ? 'Save changes' : 'Confirm visit');
  submit.classList.toggle('confirm-button', confirmed);
  updateVisitFieldFeedback(form);
}

function applyCaptureMode(form) {
  const manual = state.captureMode === 'manual';
  form.classList.toggle('manual-mode', manual);
  const speakButton = form.querySelector('#mode-speak');
  const manualButton = form.querySelector('#mode-manual');
  speakButton?.classList.toggle('active', !manual);
  manualButton?.classList.toggle('active', manual);
  speakButton?.setAttribute('aria-pressed', String(!manual));
  manualButton?.setAttribute('aria-pressed', String(manual));
  const help = form.querySelector('#capture-mode-help');
  if (help) help.textContent = manual
    ? 'Manual mode is selected. Complete the fields below, then confirm the visit.'
    : 'Speak mode is selected. Use the microphone, edit the note, then review it with AI.';
  arrangeVisitCapture(form);
  updateVisitFieldFeedback(form);
}

function arrangeVisitCapture(form) {
  const mode = form.querySelector('#capture-mode');
  const noteHeading = form.querySelector('.note-heading');
  const noteHelp = form.querySelector('.note-heading + .field-help');
  const textarea = form.querySelector('textarea[name="note"]');
  const panel = form.querySelector('#visit-ai-panel');
  const divider = form.querySelector('.form-divider');
  if (!mode || !noteHeading || !noteHelp || !textarea || !divider) return;
  let capture = form.querySelector('#speak-capture-area');
  if (state.captureMode === 'speak') {
    if (!capture) {
      capture = document.createElement('section');
      capture.id = 'speak-capture-area';
      capture.className = 'speak-capture-area';
      mode.after(capture);
    }
    [noteHeading, noteHelp, textarea, panel].filter(Boolean).forEach((node) => capture.append(node));
  } else {
    if (capture) capture.remove();
    divider.after(noteHeading, noteHelp, textarea, panel);
  }
}

function updateVisitFieldFeedback(form) {
  const showIssues = (state.captureMode === 'speak' && state.aiHasAnalyzed) || Boolean(duplicateVisit(state.current || emptyRecord()));
  const issues = showIssues ? fieldIssueMap(state.current || emptyRecord()) : {};
  form.querySelectorAll('[name]').forEach((field) => {
    if (!field.id) field.id = `visit-${field.name}`;
    field.closest('label')?.setAttribute('for', field.id);
    const label = field.closest('label');
    if (!label) return;
    const message = issues[field.name];
    label.classList.toggle('field-missing', Boolean(message));
    if (message) {
      let error = label.querySelector('.field-error');
      if (!error) {
        error = document.createElement('span');
        error.className = 'field-error';
        label.append(error);
      }
      error.id = `field-error-${field.name}`;
      error.innerHTML = `<span aria-hidden="true">!</span>${esc(message)}`;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
    } else {
      label.querySelector('.field-error')?.remove();
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  });
  let summary = form.querySelector('#visit-error-summary');
  const messages = Object.values(issues);
  if (messages.length) {
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'visit-error-summary';
      summary.className = 'visit-error-summary';
      summary.setAttribute('role', 'alert');
      summary.setAttribute('aria-live', 'polite');
      summary.tabIndex = -1;
      form.querySelector('#capture-mode')?.after(summary);
    }
    const firstField = Object.keys(issues)[0];
    summary.innerHTML = `<strong>Needs attention</strong><span>${messages.length} field${messages.length === 1 ? '' : 's'} still need your input before confirmation. <a href="#visit-${esc(firstField)}">Review the first one</a></span>`;
  } else {
    summary?.remove();
  }
}

function enhanceVisitAssistant(form) {
  const textarea = form.querySelector('textarea[name="note"]');
  if (!textarea || $('#visit-ai-panel')) return;
  form.querySelectorAll('.form-card-heading .eyebrow').forEach((element) => {
    if (/^Step\s+\d+$/i.test(element.textContent.trim())) element.remove();
  });
  const headings = form.querySelectorAll('.form-card-heading h3');
  if (headings[0]) headings[0].textContent = 'Visit details';
  if (headings[1]) headings[1].textContent = 'Observation note';
  const formVoice = form.querySelector('#form-voice');
  if (formVoice) formVoice.innerHTML = `${micIcon()}<span>${state.listening ? 'Listening…' : 'Speak note'}</span>`;
  const requiredNote = form.querySelector('.required-note');
  if (requiredNote) requiredNote.textContent = 'Complete what you know';
  const water = form.querySelector('select[name="water_source"]');
  if (water && !water.querySelector('option[value="not_recorded"]')) {
    const option = document.createElement('option');
    option.value = 'not_recorded';
    option.textContent = 'Not recorded';
    water.append(option);
  }
  if (water && state.current?.water_source) water.value = state.current.water_source;
  const followUp = form.querySelector('[name="follow_up_type"]');
  if (followUp && followUp.tagName === 'INPUT') {
    const select = document.createElement('select');
    select.name = 'follow_up_type';
    select.innerHTML = '<option value="">Choose one</option><option value="health_education">Health education</option><option value="administrative">Administrative</option><option value="other">Other</option>';
    select.value = ['health_education', 'administrative', 'other'].includes(state.current?.follow_up_type) ? state.current.follow_up_type : '';
    followUp.replaceWith(select);
  }
  form.querySelector('.assistant-tip')?.remove();
  if (state.records.some((record) => record.id === state.current?.id) && !form.querySelector('#delete-visit')) {
    const actions = form.querySelector('.form-actions');
    const submit = actions?.querySelector('button[type="submit"]');
    const deleteButton = document.createElement('button');
    deleteButton.id = 'delete-visit';
    deleteButton.className = 'button danger';
    deleteButton.dataset.action = 'delete-visit';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete visit';
    if (actions && submit) actions.insertBefore(deleteButton, submit);
  }
  form.insertAdjacentHTML('afterbegin', `<section id="capture-mode" class="capture-mode" aria-labelledby="capture-mode-title"><div><p class="eyebrow accent">Choose how to capture</p><h3 id="capture-mode-title">Speak or fill the form</h3><p class="capture-mode-copy">Use your voice to fill the note and let AI suggest fields, or enter the form yourself.</p></div><div class="capture-mode-actions"><button id="mode-speak" class="capture-mode-button" type="button">Speak to fill form</button><button id="mode-manual" class="capture-mode-button secondary-mode" type="button">Fill manually</button></div><p id="capture-mode-help" class="hint"></p></section>`);
  $('#mode-speak')?.addEventListener('click', () => { state.captureMode = 'speak'; applyCaptureMode(form); });
  $('#mode-manual')?.addEventListener('click', () => { state.captureMode = 'manual'; applyCaptureMode(form); });
  applyCaptureMode(form);
  textarea.insertAdjacentHTML('afterend', `<section id="visit-ai-panel" class="visit-ai-panel" aria-labelledby="visit-ai-title"><div class="visit-ai-heading"><div class="ai-badge">AI</div><div><p class="eyebrow accent">FieldHealth AI</p><h3 id="visit-ai-title">Fill the visit details with AI</h3><p>Speak or type above, edit the words while they are still fresh, then let AI fill the existing fields below.</p></div></div><div class="visit-ai-actions"><span class="hint">Your note stays editable. AI will not replace fields you have already entered.</span><button id="visit-ai-analyze" class="button primary" type="button" ${state.aiBusy ? 'disabled' : ''}>${state.aiBusy ? 'Analyzing…' : 'Analyze & fill visit details'}</button></div>${state.aiResult ? aiResultMarkup(state.aiResult) : state.aiHasAnalyzed ? '<div class="visit-ai-empty"><strong>Fields filled below.</strong> Review anything marked Needs attention.</div>' : '<div class="visit-ai-empty">No suggestions yet. Complete your note first, then analyze it.</div>'}</section>`);
  $('#visit-ai-analyze')?.addEventListener('click', analyzeNote);
  $('#visit-ai-panel [data-action="use-extraction"]')?.addEventListener('click', applyExtraction);
  $('#visit-ai-panel [data-action="clear-ai"]')?.addEventListener('click', () => { state.aiResult = null; render(); });
  arrangeVisitCapture(form);
  updateVisitActionState(form);
}

function bindViewEvents() {
  document.querySelectorAll('[data-route]').forEach((element) => element.addEventListener('click', (event) => { event.preventDefault(); setRoute(element.dataset.route); }));
  document.querySelectorAll('[data-action="new-visit"]').forEach((element) => element.addEventListener('click', () => { state.current = emptyRecord(); state.captureMode = 'speak'; state.manualFields = new Set(); state.aiHasAnalyzed = false; state.aiResult = null; setRoute('visit'); }));
  document.querySelectorAll('[data-action="edit-record"]').forEach((element) => element.addEventListener('click', () => { const existing = state.records.find((record) => record.id === element.dataset.id); state.current = existing || emptyRecord(); state.captureMode = 'speak'; state.manualFields = existing ? new Set(fields.map(([key]) => key)) : new Set(); state.aiHasAnalyzed = false; state.aiResult = null; setRoute('visit'); }));
  document.querySelectorAll('[data-action="cancel-visit"]').forEach((element) => element.addEventListener('click', () => setRoute('records')));
  document.querySelectorAll('[data-action="export-csv"]').forEach((element) => element.addEventListener('click', exportCsv));
  document.querySelectorAll('[data-action="use-extraction"]').forEach((element) => element.addEventListener('click', applyExtraction));
  document.querySelectorAll('[data-action="clear-ai"]').forEach((element) => element.addEventListener('click', () => { state.aiResult = null; render(); }));
  document.querySelectorAll('[data-action="use-server-conflict"]').forEach((element) => element.addEventListener('click', () => resolveSyncConflict('server')));
  document.querySelectorAll('[data-action="keep-local-conflict"]').forEach((element) => element.addEventListener('click', () => resolveSyncConflict('local')));
  document.querySelectorAll('[data-action="save-token"]').forEach((element) => element.addEventListener('click', async () => { const value = $('#demo-code')?.value.trim() || ''; if (value) sessionStorage.setItem(DEMO_CODE_KEY, value); else sessionStorage.removeItem(DEMO_CODE_KEY); state.serverOnline = false; try { await api('/api/health'); state.serverOnline = true; setNotice('Demo code saved for this session.', 'success'); } catch (error) { setNotice(error.message, 'warning'); } render(); }));
  document.querySelectorAll('[data-action="clear-token"]').forEach((element) => element.addEventListener('click', () => { sessionStorage.removeItem(DEMO_CODE_KEY); state.serverOnline = false; setNotice('Demo access cleared.', 'info'); render(); }));
  document.querySelectorAll('[data-action="install-app"]').forEach((element) => element.addEventListener('click', installApp));
  const form = $('#visit-form'); if (form) {
    enhanceVisitAssistant(form);
    form.addEventListener('click', (event) => { if (event.target.closest('[data-action="delete-visit"]')) deleteCurrent(); });
    form.addEventListener('submit', saveCurrent);
    const refreshVisitState = (event) => { if (event.target?.name) state.manualFields.add(event.target.name); updateCurrentFromForm(form); updateVisitActionState(form); };
    form.addEventListener('input', refreshVisitState);
    form.addEventListener('change', refreshVisitState);
    form.addEventListener('blur', refreshVisitState, true);
  }
  document.querySelectorAll('label').forEach((label) => {
    const field = label.querySelector('input, select, textarea');
    if (field) {
      if (!field.id) field.id = field.name ? `field-${field.name}` : `field-${Math.random().toString(16).slice(2)}`;
      label.setAttribute('for', field.id);
    }
  });
  const note = $('#ai-note'); if (note) note.addEventListener('input', () => { state.aiNote = note.value; });
  $('#analyze')?.addEventListener('click', analyzeNote); $('#ai-voice')?.addEventListener('click', () => startVoice('assistant')); $('#form-voice')?.addEventListener('click', () => startVoice('form')); $('#sync')?.addEventListener('click', syncRecords);
}

async function refreshHealth() {
  try { await api('/api/health'); state.serverOnline = true; } catch { state.serverOnline = false; }
  render();
}

window.addEventListener('online', refreshHealth);
window.addEventListener('offline', () => { state.serverOnline = false; render(); setNotice('Offline mode: new records will stay on this device.', 'info'); });
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.installPrompt = event; render(); });
window.addEventListener('hashchange', () => { const route = location.hash.slice(1); if (['dashboard', 'visit', 'records', 'reports', 'settings'].includes(route) && route !== state.route) setRoute(route); });

(async function boot() {
  try {
    document.body.innerHTML = shellMarkup();
    await seedDemo();
    render();
    await refreshHealth();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (location.hash) window.dispatchEvent(new Event('hashchange'));
  } catch (error) {
    document.body.innerHTML = `<main class="boot-error"><h1>FieldHealth could not start</h1><p>Your saved information was not changed. Refresh the page or use a browser with offline storage enabled.</p><button class="button primary" type="button" onclick="location.reload()">Refresh FieldHealth</button></main>`;
  }
})();
