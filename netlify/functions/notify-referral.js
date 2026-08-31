import { esc, sendEmail } from './_resend.js';
import { checkRateLimit, getClientIp } from './_rateLimit.js';

// "Suggest a Referral" is intentionally open to logged-out visitors (see
// directory.js — it only checks for a session to optionally attach a
// referrer_email, submission itself isn't gated), unlike notify-request.js's
// service requests. So this can't require a session without changing that
// product behavior — rate-limiting by IP blunts the same email-relay abuse
// vector without touching who can submit a referral.
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ip = getClientIp(event);
  const allowed = await checkRateLimit('referral-notify-rate-limit', ip, { max: MAX_PER_WINDOW, windowMs: WINDOW_MS });
  if (!allowed) {
    return { statusCode: 429, body: 'Too many referral submissions from this network. Please try again later.' };
  }

  let r;
  try {
    r = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const html = `
    <p>New referral from <strong>${esc(r.referrer)}</strong>${r.neighborhood ? ` (${esc(r.neighborhood)})` : ''}</p>
    <p><strong>${esc(r.name)}</strong> — ${esc(r.phone)}${r.category ? ` — ${esc(r.category)}` : ''}</p>
    <p>${esc(r.note)}</p>
  `;

  try {
    await sendEmail({
      subject: `${r.subjectPrefix || 'New Referral'}: ${r.name}`,
      html,
      userEmail: r.referrer_email || r.user_email || r.email,
    });
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }

  return { statusCode: 200, body: 'ok' };
};
