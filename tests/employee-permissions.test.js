const assert = require('node:assert/strict');
const { buildEmployeePermissionRecord, resolvePermissionState } = require('../backend/employee-permissions');

const permission = buildEmployeePermissionRecord({
  employeeId: '11111111-1111-4111-8111-111111111111',
  canAccessAdmin: true,
  permissionGrantedBy: '22222222-2222-4222-8222-222222222222',
  permissionGrantedAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:05:00.000Z',
});

assert.equal(permission.employee_id, '11111111-1111-4111-8111-111111111111');
assert.equal(permission.can_access_admin, true);
assert.equal(permission.permission_granted_by, '22222222-2222-4222-8222-222222222222');
assert.equal(permission.permission_granted_at, '2026-10-29T12:00:00.000Z');

const resolved = resolvePermissionState({ can_access_admin: true, permission_granted_by: 'admin-1' });
assert.equal(resolved.permissionLabel, 'Granted');
assert.equal(resolved.accessAllowed, true);

console.log('Employee permission checks passed.');
