export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export async function sendEmail({ subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: ['hillfamendeavors@gmail.com', 'trustedneighbors.marc@gmail.com'],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend request failed: ${await res.text()}`);
  }
}
