const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
const sessionMatch = appSource.match(/function getCurrentSessionUser\(\) \{[\s\S]*?\n\}/m);
const authMatch = appSource.match(/function setAuthenticated\(isLoggedIn, user = null\) \{[\s\S]*?\n\}/m);
const helperMatch = appSource.match(/function resolveActiveAccountEmail\(\) \{[\s\S]*?\n\}/m);
const mergeStateMatch = appSource.match(/function mergeHydratedStateWithLocalState\(previousState, hydratedState\) \{[\s\S]*?\n\}/m);

assert.ok(sessionMatch, 'getCurrentSessionUser helper is missing.');
assert.ok(authMatch, 'setAuthenticated helper is missing.');
assert.ok(helperMatch, 'resolveActiveAccountEmail helper is missing.');
assert.ok(mergeStateMatch, 'mergeHydratedStateWithLocalState helper is missing.');

const extractFunctionSource = (source, functionName) => {
  const startIndex = source.indexOf(`function ${functionName}(`);
  assert.ok(startIndex >= 0, `${functionName} helper is missing.`);

  let depth = 0;
  let inBody = false;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      inBody = true;
    } else if (char === '}') {
      depth -= 1;
      if (inBody && depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error(`${functionName} helper could not be parsed.`);
};

const renderEmployeeRoleRowsSource = extractFunctionSource(appSource, 'renderEmployeeRoleRows');

const sessionSource = sessionMatch[0];
const authSource = authMatch[0];
const helperSource = helperMatch[0];

const localStorageFactory = (sessionValue = null, statePasswords = {}) => ({
  store: {
    ...(sessionValue ? { 'site-blocker-admin-session': JSON.stringify(sessionValue) } : {}),
  },
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  statePasswords,
});

const scenarios = [
  {
    name: 'prefers active session email',
    state: { settings: { adminEmail: 'admin@sys13.com' } },
    localStorage: localStorageFactory({ email: 'admin@sys13.com', role: 'Administrator' }),
    expected: 'admin@sys13.com',
  },
  {
    name: 'falls back to configured admin account when session is empty',
    state: { settings: { adminEmail: 'admin@sys13.com' } },
    localStorage: localStorageFactory(null),
    expected: 'admin@sys13.com',
  },
  {
    name: 'returns empty string when no active account exists',
    state: { settings: {} },
    localStorage: localStorageFactory(null),
    expected: '',
  },
];

for (const scenario of scenarios) {
  const localStorage = scenario.localStorage;
  const state = scenario.state;

  const vmContext = {
    state,
    localStorage,
    console,
  };

  const vm = require('vm');
  vm.runInNewContext(`
    ${sessionSource}
    ${helperSource}
  `, vmContext);

  const actual = vm.runInNewContext('resolveActiveAccountEmail()', vmContext);
  assert.strictEqual(actual, scenario.expected, `${scenario.name} failed: expected ${scenario.expected}, got ${actual}`);
}

const authLocalStorage = {
  store: {
    'site-blocker-admin-auth': 'true',
    'site-blocker-admin-session': JSON.stringify({ email: 'admin@sys13.com', role: 'Administrator' }),
  },
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

const authContext = {
  localStorage: authLocalStorage,
  console,
  document: {
    body: { classList: { toggle() {} } },
    getElementById() { return null; },
    querySelector() { return null; },
  },
  state: { settings: { adminEmail: 'admin@sys13.com' } },
};

const authVm = require('vm');
authVm.runInNewContext(`
  ${sessionSource}
  ${authSource}
  function getCurrentUserRole() { return 'Administrator'; }
  function resolveActiveAccountEmail() { return 'admin@sys13.com'; }
`, authContext);
authVm.runInNewContext('setAuthenticated(true)', authContext);
assert.strictEqual(JSON.parse(authLocalStorage.getItem('site-blocker-admin-session')).email, 'admin@sys13.com', 'Session should be preserved when re-authenticating.');

const roleList = { innerHTML: '' };
const roleSearch = { value: '' };
const roleContext = {
  roleList,
  roleSearch,
  state: {
    employees: [{ id: 'emp-1', name: 'Alice', surname: 'Jones', email: 'alice@company.com', accountRole: 'Administrator' }],
    devices: [],
    security: { accountPasswords: { 'alice@company.com': 'Welcome123!' } },
  },
  console,
  document: {
    getElementById(id) {
      return id === 'role-assignment-list' ? roleList : (id === 'role-assignment-search' ? roleSearch : null);
    },
  },
  isPrivilegedAccountRole: (roleName) => roleName === 'Administrator' || roleName === 'IT Staff',
};
const roleVm = require('vm');
roleVm.runInNewContext(`
  ${renderEmployeeRoleRowsSource}
`, roleContext);
roleVm.runInNewContext('renderEmployeeRoleRows()', roleContext);
assert.ok(roleList.innerHTML.includes('role-user-auth'), 'Admin role rows should include an auth/password column.');
assert.ok(roleList.innerHTML.includes('Welcome123!'), 'Privileged accounts should display their generated login password in the admin UI.');

const hydratedStateSource = extractFunctionSource(appSource, 'mergeHydratedStateWithLocalState');
const mergeContext = {
  localState: { employees: [{ id: 'emp-1', name: 'Alice' }], settings: { accentColor: '#111111' } },
  hydratedState: { employees: [], settings: { accentColor: '#222222' } },
};
const mergeVm = require('vm');
mergeVm.runInNewContext(`
  ${hydratedStateSource}
`, mergeContext);
const merged = mergeVm.runInNewContext('mergeHydratedStateWithLocalState(localState, hydratedState)', mergeContext);
assert.deepStrictEqual(merged.employees, [{ id: 'emp-1', name: 'Alice' }], 'A blank remote employee list should not erase local employees after a relog.');

console.log('Security account resolution checks passed.');
