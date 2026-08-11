function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: ['hillfamendeavors@gmail.com', 'hillfamilyautofair.marconi@gmail.com'],
      subject: `New service request: ${r.category} in ${r.neighborhood}`,
      html,
    }),
  });

  if (!res.ok) {
    return { statusCode: 502, body: `Resend request failed: ${await res.text()}` };
  }

  return { statusCode: 200, body: 'ok' };
};
