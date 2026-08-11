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
    <p>Neighborhood launch suggestion: <strong>${esc(r.neighborhood)}</strong></p>
    <p>${esc(r.name)} — ${esc(r.email)} — ${esc(r.role)}</p>
    <p>${esc(r.message)}</p>
  `;

  try {
    await sendEmail({ subject: `New neighborhood suggestion: ${r.neighborhood}`, html });
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }

  return { statusCode: 200, body: 'ok' };
};
