import { SUPABASE_URL, SUPABASE_ANON_KEY } from './_supabaseConfig.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: 'Missing Authorization header' };
  }

  const check = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=email`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
  });
  const rows = await check.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { statusCode: 403, body: 'Not an admin' };
  }

  if (!process.env.NETLIFY_BUILD_HOOK_URL) {
    return { statusCode: 500, body: 'NETLIFY_BUILD_HOOK_URL not configured' };
  }

  const res = await fetch(process.env.NETLIFY_BUILD_HOOK_URL, { method: 'POST' });
  if (!res.ok) {
    return { statusCode: 502, body: `Build hook failed: ${await res.text()}` };
  }

  return { statusCode: 200, body: 'ok' };
};
