import { esc, sendEmail } from './_resend.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './_supabaseConfig.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // The site's own UI already blocks posting a service request while logged
  // out (see the getSession() check in directory.js/requests-page.js/
  // account-page.js) — this endpoint had no server-side equivalent, so it
  // was callable directly (curl, no browser) to relay email to any address
  // via trustedneighbors.net's verified sending domain. Verifying the bearer
  // token against Supabase Auth closes that off without changing product
  // behavior: every real caller already has a session by the time it submits.
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: 'Missing Authorization header' };
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
  });
  if (!userRes.ok) {
    return { statusCode: 401, body: 'Invalid or expired session' };
  }
  const user = await userRes.json();
  const verifiedEmail = user?.email;
  if (!verifiedEmail) {
    return { statusCode: 401, body: 'Invalid session' };
  }

  let r;
  try {
    r = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const html = `
    <p><strong>${esc(r.category)}</strong> needed in <strong>${esc(r.neighborhood)}</strong> on ${esc(r.date_needed)}</p>
    <p>${esc(r.name)} — ${esc(r.phone)}${r.email ? ` — ${esc(r.email)}` : ''}</p>
    <p>${esc(r.notes)}</p>
  `;

  try {
    await sendEmail({
      subject: `New service request: ${r.category} in ${r.neighborhood}`,
      html,
      // Use the token-verified email, not the client-supplied one, as the
      // recipient added to the notification.
      userEmail: verifiedEmail,
    });
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }

  return { statusCode: 200, body: 'ok' };
};
