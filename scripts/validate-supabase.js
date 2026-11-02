const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const values = {};

  if (!fs.existsSync(envPath)) {
    return values;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }

  return values;
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (!url || !anonKey) {
    console.error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY or VITE_* equivalents.');
    process.exit(1);
  }

  if (url.includes('your-project') || anonKey.includes('your_')) {
    console.error('Supabase values are still placeholders. Replace them with your real project URL and publishable key.');
    process.exit(1);
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    console.log('Supabase connectivity test');
    console.log('URL status:', response.status);
    console.log('URL valid:', response.ok || response.status === 401 ? 'yes' : 'no');

    if (response.ok) {
      console.log('Supabase connection succeeded.');
      return;
    }

    if (response.status === 401) {
      console.log('Supabase is reachable and rejecting the request as unauthorized, which usually means the key is valid but the endpoint or RLS setup is still being checked.');
      return;
    }

    const body = await response.text();
    console.error('Supabase request failed:', body.slice(0, 400));
    process.exit(1);
  } catch (error) {
    console.error('Supabase connectivity failed:', error.message);
    process.exit(1);
  }
}

main();
