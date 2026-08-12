import { esc, sendEmail } from './_resend.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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
