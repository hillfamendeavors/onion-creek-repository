import { supabase } from '../lib/supabase.js';
import { requestPasswordReset } from '../lib/auth.js';
import { showToast } from './ui-feedback.js';

const usersBody = document.getElementById('usersBody');
let loaded = false;

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

window.addEventListener('users-tab-shown', async () => {
  if (loaded) return;
  loaded = true;
  await loadUsers();
});

async function loadUsers() {
  if (!usersBody) return;
  usersBody.innerHTML = `<tr><td colspan="6">Loading users…</td></tr>`;

  const [profilesRes, requestsRes, adminsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('email, category, date_needed'),
    supabase.from('admins').select('email'),
  ]);

  if (profilesRes.error) {
    usersBody.innerHTML = `<tr><td colspan="6">Failed to load users: ${esc(profilesRes.error.message)}</td></tr>`;
    return;
  }

  const profiles = profilesRes.data || [];
  const requests = requestsRes.data || [];
  const adminEmails = new Set((adminsRes.data || []).map((a) => a.email.toLowerCase()));

  if (profiles.length === 0) {
    usersBody.innerHTML = `<tr><td colspan="6">No registered users yet.</td></tr>`;
    return;
  }

  usersBody.innerHTML = profiles.map((p) => {
    const theirRequests = requests.filter((r) => r.email === p.email);
    const requestsHtml = theirRequests.length === 0
      ? '<span style="color:#9CA3AF;">None yet</span>'
      : theirRequests.map((r) => `
          <span style="display:inline-block; background:#F3F4F6; border-radius:12px; padding:3px 10px; font-size:0.78rem; font-weight:600; color:#374151; margin:2px 4px 2px 0;">
            ${esc(r.category)} <span style="color:#9CA3AF;">(${esc(r.date_needed)})</span>
          </span>
        `).join('');

    const isAdmin = adminEmails.has(p.email.toLowerCase());
    const adminAction = isAdmin
      ? '<span style="color:#9CA3AF; font-size:0.85rem;">Already Admin</span>'
      : `<button class="icon-btn grant-admin-btn" data-email="${esc(p.email)}">Grant Admin</button>`;

    return `
      <tr>
        <td>${esc(p.full_name) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></td>
        <td>${esc(p.phone) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td>${esc(new Date(p.created_at).toLocaleDateString())}</td>
        <td>${requestsHtml}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="icon-btn send-reset-btn" data-email="${esc(p.email)}">Send Reset</button>
          ${adminAction}
        </td>
      </tr>
    `;
  }).join('');

  usersBody.querySelectorAll('.send-reset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const { error } = await requestPasswordReset(btn.dataset.email);
      btn.disabled = false;
      btn.textContent = 'Send Reset';
      if (error) {
        showToast('Failed to send reset email: ' + error.message, true);
        return;
      }
      showToast(`Password reset email sent to ${btn.dataset.email}.`);
    });
  });

  usersBody.querySelectorAll('.grant-admin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Granting…';
      const { error } = await supabase.from('admins').insert({ email: btn.dataset.email });
      if (error) {
        btn.disabled = false;
        btn.textContent = 'Grant Admin';
        showToast('Failed to grant admin role: ' + error.message, true);
        return;
      }
      showToast(`Admin role granted to ${btn.dataset.email}.`);
      await loadUsers();
    });
  });
}
