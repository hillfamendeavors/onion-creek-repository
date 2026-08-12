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
    <p><strong>${esc(r.category)}</strong> needed in <strong>${esc(r.neighborhood)}</strong> on ${esc(r.date_needed)}</p>
    <p>${esc(r.name)} — ${esc(r.phone)}${r.email ? ` — ${esc(r.email)}` : ''}</p>
    <p>${esc(r.notes)}</p>
  `;

  try {
    await sendEmail({
      subject: `New service request: ${r.category} in ${r.neighborhood}`,
      html,
      userEmail: r.email || r.user_email,
    });
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }

  return { statusCode: 200, body: 'ok' };
};
