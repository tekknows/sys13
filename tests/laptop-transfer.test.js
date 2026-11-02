const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const appCode = fs.readFileSync(require('path').join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');

const idMap = new Map();
const ensureElement = (id) => {
  if (!idMap.has(id)) {
    idMap.set(id, {
      id,
      value: '',
      innerHTML: '',
      dataset: {},
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      reset() {},
    });
  }
  return idMap.get(id);
};

const dayPills = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
  dataset: { day },
  classList: {
    add() { this.selected = true; },
    remove() { this.selected = false; },
    toggle(name, force) { this.selected = typeof force === 'boolean' ? force : !this.selected; },
    contains() { return Boolean(this.selected); },
  },
  selected: false,
}));

const scheduleRadios = ['weekly', 'date-range', 'daily', 'always'].map((value) => ({
  name: 'schedule-type',
  value,
  checked: value === 'daily',
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  dataset: {},
}));

const retentionFilterButtons = ['all', 'manual', 'scheduled'].map((filter) => ({
  dataset: { historyFilter: filter },
  classList: {
    add() {},
    remove() {},
    toggle(name, force) {
      this.active = typeof force === 'boolean' ? force : !this.active;
    },
    contains() { return Boolean(this.active); },
  },
  active: filter === 'all',
}));

const document = {
  body: { dataset: {}, style: { setProperty() {} } },
  documentElement: { style: { setProperty() {} } },
  getElementById: (id) => ensureElement(id),
  querySelectorAll: (selector) => {
    if (selector === '.day-pill') return dayPills;
    if (selector === 'input[name="schedule-type"]') return scheduleRadios;
    if (selector === '.day-pill.selected') return dayPills.filter((pill) => pill.selected);
    if (selector === '.segment-btn') return retentionFilterButtons;
    return [];
  },
  querySelector: (selector) => {
    if (selector === 'input[name="schedule-type"]') {
      return scheduleRadios.find((radio) => radio.checked) || scheduleRadios[2];
    }
    if (selector === 'input[name="schedule-type"]:checked') {
      return scheduleRadios.find((radio) => radio.checked) || scheduleRadios[2];
    }
    if (selector === '.segment-btn.active') {
      return retentionFilterButtons.find((button) => button.active) || retentionFilterButtons[0];
    }
    return null;
  },
  createElement: () => {
    const node = {
      dataset: {},
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      querySelector() { return null; },
      prepend() {},
      setAttribute() {},
      children: [],
      appendChild(child) { this.children.push(child); },
      remove() {},
      get textContent() {
        return this._textContent || '';
      },
      set textContent(value) {
        this._textContent = String(value);
      },
      get innerHTML() {
        return this._innerHTML || '';
      },
      set innerHTML(value) {
        this._innerHTML = String(value);
        const text = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        this._textContent = text;
      },
    };
    return node;
  },
};

const windowObject = {
  deviceSortValue: 'employeeId',
  Chart: null,
  alert() {},
  location: { href: '' },
};

windowObject.addEventListener = () => {};
windowObject.dispatchEvent = () => {};

const localStorage = {
  store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem(key, value) { this.store[key] = String(value); },
};

const context = {
  assert,
  console,
  window: windowObject,
  document,
  localStorage,
  navigator: { userAgent: 'Chrome/124.0.0.0', userAgentData: { brands: [{ brand: 'Chrome' }] } },
  Date,
  JSON,
  Math,
  setTimeout,
  clearTimeout,
};
context.global = context;
context.globalThis = context;

['summary-grid', 'devices-table', 'laptops-table', 'policy-table', 'usage-table', 'employees-table', 'replacement-table', 'tickets-table', 'incognito-toggle', 'settings-incognito-toggle', 'incognito-status', 'daily-chart', 'category-chart', 'usage-bar-chart', 'status-radar-chart'].forEach((id) => ensureElement(id));

vm.createContext(context);
vm.runInContext(appCode, context);

vm.runInContext(`state.devices = [
  {
    id: 'dev-1',
    user: 'User',
    surname: 'One',
    email: 'user1@company.com',
    employeeId: 'EMP-001',
    laptopId: 'LT-001',
    laptopName: 'Dell Latitude 5430',
    brand: 'Dell',
    specs: 'Intel i5',
    purchasedAt: '2025-02-15',
    macAddress: '00:AA:BB:CC:DD:EE',
    status: 'taken',
    isRegistered: true,
  },
  {
    id: 'dev-2',
    user: 'Unassigned',
    surname: '',
    email: '',
    employeeId: '',
    laptopId: 'LT-002',
    laptopName: 'HP ProBook 440',
    brand: 'HP',
    specs: 'Intel i7',
    purchasedAt: '2024-09-01',
    macAddress: '00:11:22:33:44:55',
    status: 'available',
    isRegistered: true,
  },
];

state.employees = [
  { id: 'emp-001', employeeId: 'EMP-001', name: 'User', surname: 'One', email: 'user1@company.com', department: 'IT', role: 'Support' },
];`, context);

const formElements = [
  ['replacement-employee', 'User One'],
  ['replacement-old-id', 'LT-001'],
  ['replacement-new-id', 'LT-002'],
  ['replacement-reason', 'Broken screen'],
  ['replacement-status', 'Approved'],
  ['replacement-form', null],
];

for (const [id, value] of formElements) {
  const el = ensureElement(id);
  if (value !== null) el.value = value;
  el.reset = () => {};
  el.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

vm.runInContext('saveReplacement({ preventDefault() {} });', context);

const state = vm.runInContext('state', context);
const oldLaptop = state.devices.find((device) => device.laptopId === 'LT-001');
const newLaptop = state.devices.find((device) => device.laptopId === 'LT-002');

assert.strictEqual(oldLaptop.status, 'defective', 'Old laptop should be marked defective after approval');
assert.strictEqual(oldLaptop.user, 'Unassigned', 'Old laptop should be returned to unassigned status');
assert.strictEqual(newLaptop.user, 'User', 'New laptop should be assigned to the employee');
assert.strictEqual(newLaptop.email, 'user1@company.com', 'New laptop should carry the employee email');
assert.strictEqual(newLaptop.laptopId, 'LT-002', 'The assigned laptop id should remain the active device id');
assert.ok(state.devices.filter((device) => device.user !== 'Unassigned' && device.email).length >= 1, 'Active registered devices should include the assigned user');

vm.runInContext(`
  state.devices = [{
    id: 'dev-dup-1',
    user: 'Unassigned',
    surname: '',
    email: '',
    employeeId: '',
    laptopId: 'LT-900',
    laptopName: 'Dell XPS',
    status: 'available',
    isRegistered: true,
    macAddress: '00:DE:AD:BE:EF:00'
  }];
  state.employees = [{
    id: 'emp-001',
    employeeId: 'EMP-001',
    name: 'User',
    surname: 'One',
    email: 'user1@company.com',
    department: 'IT',
    role: 'Support'
  }];

  document.getElementById('device-employee-id').value = 'EMP-001';
  document.getElementById('device-laptop-id').value = 'LT-900';
  document.getElementById('device-preview-mac').value = '00:DE:AD:BE:EF:00';
  document.getElementById('device-edit-id').value = '';
  document.getElementById('device-preview-name').value = 'User One';
  document.getElementById('device-preview-email').value = 'user1@company.com';
  document.getElementById('device-preview-laptop').value = 'Dell XPS';
`, context);

vm.runInContext('registerDevice({ preventDefault() {} });', context);

const dedupedState = vm.runInContext('state', context);
assert.strictEqual(dedupedState.devices.filter((device) => device.laptopId === 'LT-900').length, 1, 'Only one device row should exist for a laptop ID in registration');

vm.runInContext(`
  state.policies = [];
  document.getElementById('block-domain').value = 'example.com';
  document.getElementById('block-category').value = 'social';
  document.getElementById('block-scope').value = 'specific';
  document.getElementById('block-user-target').selectedOptions = [{ value: 'emp-001' }];
  document.querySelector('input[name="schedule-type"]').value = 'weekly';
  document.getElementById('schedule-start-time').value = '09:00';
  document.getElementById('schedule-end-time').value = '11:00';
  document.querySelectorAll('.day-pill').forEach((pill) => { pill.classList.add('selected'); });
  addBlocklistEntry({ preventDefault() {} });
`, context);

const policyWithSchedule = vm.runInContext('state.policies[state.policies.length - 1]', context);
assert.ok(policyWithSchedule.schedule, 'Blocking policy should store schedule metadata');
assert.strictEqual(policyWithSchedule.schedule.type, 'weekly', 'Schedule type should persist with the rule');
const persistedDays = Array.from(policyWithSchedule.schedule.days || []);
assert.strictEqual(persistedDays.length, 7, 'All selected weekly days should persist');
assert.ok(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].every((day) => persistedDays.includes(day)), 'Selected weekly days should persist');
assert.strictEqual(policyWithSchedule.schedule.start, '09:00', 'Schedule start time should persist');
assert.strictEqual(policyWithSchedule.schedule.end, '11:00', 'Schedule end time should persist');

vm.runInContext(`
  state.devices = [
    { user: 'User', surname: 'One', email: 'user1@company.com', laptopId: 'LT-001', laptopName: 'Dell Latitude', status: 'taken' },
    { user: 'Jane', surname: 'Doe', email: 'jane@company.com', laptopId: 'LT-002', laptopName: 'HP ProBook', status: 'taken' }
  ];
  state.tickets = [
    { employee: 'User One', email: 'user1@company.com', laptopId: 'LT-001', priority: 'High', status: 'Open' },
    { employee: 'Jane Doe', email: 'jane@company.com', laptopId: 'LT-002', priority: 'Low', status: 'Open' }
  ];
  state.usage = [
    { user: 'User One', laptop: 'Dell Latitude', mbUsed: 200, onlineHours: 3.0 },
    { user: 'Jane Doe', laptop: 'HP ProBook', mbUsed: 150, onlineHours: 2.0 }
  ];
  syncUserActivityAnalytics();
`, context);

const syncedUsage = vm.runInContext('state.usage', context);
assert.ok(syncedUsage.some((entry) => entry.user === 'User One' && Number(entry.mbUsed) >= 320), 'User analytics should aggregate device and ticket activity');
assert.ok(syncedUsage.some((entry) => entry.user === 'Jane Doe' && Number(entry.mbUsed) >= 200), 'Second user activity should also be aggregated');

vm.runInContext(`
  state.tickets = [];
  document.getElementById('issue-employee').value = 'User One|user1@company.com';
  document.getElementById('issue-laptop').value = 'LT-001';
  document.getElementById('issue-category').value = 'Hardware';
  document.getElementById('issue-priority').value = 'High';
  document.getElementById('issue-description').value = 'Laptop battery drains too fast';
  submitIssue({ preventDefault() {} });
`, context);

const createdTicket = vm.runInContext('state.tickets[0]', context);
assert.ok(createdTicket.messages && createdTicket.messages.length >= 1, 'Employee ticket submissions should store a message thread');
assert.strictEqual(createdTicket.messages[0].sender, 'employee', 'Initial ticket message should be tagged as employee feedback');
assert.strictEqual(createdTicket.messages[0].text, 'Laptop battery drains too fast', 'Employee message text should be preserved in the ticket thread');

const toastContainer = ensureElement('toast-container');
toastContainer.children = [];
toastContainer.querySelectorAll = () => toastContainer.children.filter((child) => child && child.dataset && child.dataset.toastId);
toastContainer.appendChild = (node) => {
  toastContainer.children.push(node);
};
context.requestAnimationFrame = (callback) => callback();
context.setTimeout = (callback) => {
  callback();
  return 1;
};

vm.runInContext(`
  showToast('success', 'Sync complete', 'Policy changes were synced successfully.', { id: 'sync-policy-success' });
  showToast('success', 'Sync complete', 'Policy changes were synced successfully.', { id: 'sync-policy-success' });
  showToast('error', 'Sync failed', 'Policy changes could not be synced.', { id: 'sync-policy-error' });
  showToast('success', 'Sync complete', 'Policy changes were synced successfully.', { id: 'sync-policy-success-2' });
`, context);

assert.strictEqual(toastContainer.children.length, 3, 'Duplicate sync successes should collapse into one toast and unrelated error notifications should remain visible');
assert.ok(toastContainer.children.some((node) => node.textContent && node.textContent.includes('Sync failed')), 'Failed sync operations should still display an error toast');
assert.ok(toastContainer.children.some((node) => node.textContent && node.textContent.includes('Sync complete')), 'Successful syncs should still show their success toast');

vm.runInContext(`
  state.settings = state.settings || {};
  state.settings.accentColor = '#aa55cc';
  const accentPicker = document.getElementById('accent-picker');
  if (accentPicker) accentPicker.value = '#8e6a5e';
  applySavedAccentColor();
`, context);

assert.strictEqual(vm.runInContext("document.getElementById('accent-picker').value", context), '#aa55cc', 'The saved accent color should be restored on initialization');

vm.runInContext(`
  const initialHistory = getTicketSettings().cleanupHistory;
  assert.ok(Array.isArray(initialHistory) && initialHistory.length >= 2, 'Retention history should include seeded entries on first load');

  state.ticketSettings = { ...getTicketSettings(), cleanupHistory: [
    { date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), count: 8, status: 'Completed', manual: true, reason: 'manual' },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: 14, status: 'Completed', manual: false, reason: 'scheduled' },
  ]};

  document.getElementById('ticket-cleanup-search').value = 'manual';
  document.querySelectorAll('.segment-btn').forEach((button) => {
    button.active = button.dataset.historyFilter === 'manual';
  });
  renderTicketSettings();

  const historyMarkup = document.getElementById('ticket-cleanup-history').innerHTML;
  assert.ok(historyMarkup.includes('Manual') || historyMarkup.includes('manual'), 'Retention history should render manual cleanup events when filtered');

  state.settings = state.settings || {};
  state.settings.ticketRetentionDays = 21;
  state.ticketSettings = { ...getTicketSettings(), resolvedTicketRetentionDays: 21 };
  renderTicketSettings();
  assert.strictEqual(document.getElementById('ticket-closed-retention-days').value, '21', 'Resolved/closed ticket cleanup should be editable in the retention panel');
`, context);

vm.runInContext(`
  const sharedTicketState = [
    {
      id: 'tk-shared-1',
      employee: 'Shared User',
      email: 'shared@company.com',
      laptopId: 'LT-777',
      category: 'Hardware',
      priority: 'High',
      description: 'Battery is draining quickly',
      status: 'Open',
      createdAt: '2026-10-28T09:00:00Z',
      messages: [{ sender: 'employee', text: 'Battery is draining quickly', createdAt: '2026-10-28T09:00:00Z' }],
    }
  ];

  persistSharedTickets(sharedTicketState);
  const loadedSharedTickets = loadSharedTickets();
  assert.ok(Array.isArray(loadedSharedTickets), 'Persisted shared tickets should load as an array');
  assert.strictEqual(loadedSharedTickets[0].id, 'tk-shared-1', 'The shared ticket ID should survive a save and reload');
  assert.strictEqual(loadedSharedTickets[0].messages[0].text, 'Battery is draining quickly', 'Shared ticket message threads should remain intact');
`, context);

console.log('laptop transfer flow verified');
