export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export async function sendEmail({ subject, html, userEmail }) {
  const envRecipients = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NOTIFICATION_EMAIL || process.env.RESEND_TO_EMAIL;
  
  let recipients = [];
  if (envRecipients) {
    recipients = envRecipients.split(',').map((e) => e.trim()).filter(Boolean);
  } else {
    recipients = ['hillfamendeavors@gmail.com', 'trustedneighbors.marc@gmail.com'];
  }

  if (userEmail && typeof userEmail === 'string' && !recipients.includes(userEmail.trim())) {
    recipients.push(userEmail.trim());
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'notifications@trustedneighbors.net',
      to: recipients,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend request failed: ${await res.text()}`);
  }
}
