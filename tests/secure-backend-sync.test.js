const assert = require('node:assert/strict');

const { resolveSupabaseConfig, createSyncRequestPayload } = require('../backend/supabase-sync');

const config = resolveSupabaseConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key',
  API_BASE_URL: 'http://localhost:3000',
});

assert.equal(config.url, 'https://example.supabase.co');
assert.equal(config.serviceRoleKey, 'service-role-secret-key');
assert.equal(config.apiBaseUrl, 'http://localhost:3000');

const payload = createSyncRequestPayload({
  employees: [{ id: 'emp-1', name: 'Alice' }],
  settings: { retentionDate: '2026-10-29' },
  ticket_settings: {
    categories: [
      { id: 'hardware', name: 'Hardware', active: true },
      { id: 'legacy', name: 'Legacy', active: false },
    ],
  },
  changelog: [{ version: 'v1.3.0', date: '2026-10-29', title: 'Update', changes: ['Fixes'] }],
});

assert.equal(payload.employees[0].name, 'Alice');
assert.equal(payload.settings.retentionDate, '2026-10-29');
assert.equal(payload.settings.id, '10000000-0000-4000-8000-000000000001');
assert.deepEqual(payload.ticket_category_settings.categories.map((category) => category.name), ['Hardware', 'Legacy']);
assert.equal(payload.ticket_category_settings.id, 1);
assert.equal(payload.ticket_settings.id, '10000000-0000-4000-8000-000000000003');
assert.equal(payload.changelog[0].id, 'v1.3.0');

console.log('Secure backend sync checks passed.');
