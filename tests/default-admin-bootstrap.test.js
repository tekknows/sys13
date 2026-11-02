const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
const adminSeedSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'admin-seed.sql'), 'utf8');

assert.match(adminSeedSource, /insert into public\.employees/i);
assert.match(adminSeedSource, /insert into public\.user_credentials/i);
assert.match(adminSeedSource, /insert into public\.admin_access_assignments/i);
assert.match(adminSeedSource, /on conflict \(email\) do update/i);

const extractFunctionSource = (source, functionName) => {
  const startIndex = source.indexOf(`async function ${functionName}(`);
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

const ensureSource = extractFunctionSource(appSource, 'ensureDefaultAdminAccount');
const syncSource = extractFunctionSource(appSource, 'syncUserCredentialRecord');

const calls = { employeeQueries: 0, employeeInserts: 0, userCredentialUpserts: 0 };
const client = {
  from(tableName) {
    const table = tableName;
    return {
      select() {
        if (table === 'employees') {
          calls.employeeQueries += 1;
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
          };
        }

        return {
          eq() {
            return {
              maybeSingle: async () => ({ data: null, error: null }),
            };
          },
        };
      },
      upsert(payload, options) {
        if (table === 'employees') {
          calls.employeeInserts += 1;
          assert.deepStrictEqual(options.onConflict, 'email');
          return {
            select() {
              return {
                maybeSingle: async () => ({ data: { id: 'emp-admin-123', ...payload }, error: null }),
              };
            },
          };
        }

        if (table === 'user_credentials') {
          calls.userCredentialUpserts += 1;
          assert.deepStrictEqual(options.onConflict, 'email');
          return { error: null };
        }

        return { error: null };
      },
    };
  },
};

const context = {
  console,
  state: { security: {} },
  DEFAULT_ADMIN_EMAIL: 'admin@sys13.com',
  DEFAULT_ADMIN_PASSWORD: 'admin123',
  getSupabaseClient: () => client,
  secureHashString: async (value) => `hash:${String(value)}`,
};

vm.createContext(context);
vm.runInContext(`${ensureSource}\n${syncSource}`, context);

(async () => {
  await vm.runInContext('ensureDefaultAdminAccount()', context);

  assert.ok(calls.employeeQueries > 0, 'The admin bootstrap should look for the default employee.');
  assert.ok(calls.employeeInserts > 0, 'The admin bootstrap should create the default admin employee if it is missing.');
  assert.ok(calls.userCredentialUpserts > 0, 'The admin bootstrap should sync the default admin credentials.');

  console.log('Default admin bootstrap checks passed.');
})();
