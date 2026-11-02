const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
const start = appSource.indexOf('const DEFAULT_SYNC_IDS =');
const end = appSource.indexOf('\nlet state = loadState();', start);
assert.ok(start >= 0 && end > start, 'Dashboard data mapping definitions should be present.');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(appSource.slice(start, end), context);

const source = {
  settings: { accentColor: '#123456' },
  features: { incognitoBlocker: false },
  schedules: [{ id: 'schedule-1', startTime: '09:00' }],
  analytics: { weeklyUsage: [1, 2, 3], assetStatus: [4, 5] },
  ticketSettings: {
    enabled: true,
    categories: [{ id: 'hardware', name: 'Hardware', active: true }],
    priorities: ['High'],
    statuses: [{ name: 'Open' }],
  },
  changelog: [{ version: 'v1.3.0', date: '2026-10-29', title: 'Update', changes: ['Fixes'] }],
};

const backend = context.window.sys13DataBindings.frontendToBackend(source);
assert.equal(backend.settings.features.incognitoBlocker, false);
assert.equal(backend.schedules[0].startTime, '09:00');
assert.equal(backend.analytics_snapshot.weekly_usage[1], 2);
assert.equal(backend.ticket_settings.enabled, true);
assert.equal(backend.ticket_category_settings.categories[0].name, 'Hardware');
assert.equal(backend.changelog[0].id, 'v1.3.0');

const frontend = context.window.sys13DataBindings.backendToFrontend(backend);
assert.equal(frontend.features.incognitoBlocker, false);
assert.equal(frontend.ticketSettings.categories[0].name, 'Hardware');
assert.equal(frontend.changelog[0].version, 'v1.3.0');

console.log('Dashboard data mapping checks passed.');
