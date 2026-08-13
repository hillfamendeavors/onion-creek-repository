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
  usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:#64748B;">Loading registered users…</td></tr>`;

  const [profilesRes, requestsRes, adminsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('email, category, date_needed'),
    supabase.from('admins').select('email'),
  ]);

  if (profilesRes.error) {
    usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:#DC2626;">Failed to load users: ${esc(profilesRes.error.message)}</td></tr>`;
    return;
  }

  const profiles = profilesRes.data || [];
  const requests = requestsRes.data || [];
  const adminEmails = new Set((adminsRes.data || []).map((a) => a.email.toLowerCase()));

  const usersCountEl = document.getElementById('usersCount');
  if (usersCountEl) usersCountEl.textContent = profiles.length;

  if (profiles.length === 0) {
    usersBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="table-empty-state">
            <div class="table-empty-icon">👥</div>
            <div class="table-empty-title">No registered users yet</div>
            <div class="table-empty-desc">User accounts created by neighbors will appear here.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  usersBody.innerHTML = profiles.map((p) => {
    const theirRequests = requests.filter((r) => r.email === p.email);
    const requestsHtml = theirRequests.length === 0
      ? '<span style="color:#94A3B8; font-size:0.85rem;">None yet</span>'
      : `<div style="display:flex; gap:4px; flex-wrap:wrap;">${theirRequests.map((r) => `
          <span class="pill-tag category" style="font-size:0.75rem;">
            ${esc(r.category)} <span style="opacity:0.65; margin-left:2px;">(${esc(r.date_needed)})</span>
          </span>
        `).join('')}</div>`;

    const isAdmin = adminEmails.has(p.email.toLowerCase());
    const adminAction = isAdmin
      ? '<span style="color:#94A3B8; font-size:0.8rem; font-weight:600;">Already Admin</span>'
      : `<button class="btn-action-secondary grant-admin-btn" data-email="${esc(p.email)}">Grant Admin</button>`;

    return `
      <tr>
        <td>
          <div class="contact-cell">
            <span class="contact-name">${esc(p.full_name || 'Unnamed Neighbor')}</span>
            <a href="mailto:${esc(p.email)}" class="contact-email">${esc(p.email)}</a>
          </div>
        </td>
        <td><span class="contact-phone">${esc(p.phone || '—')}</span></td>
        <td><span style="font-size:0.85rem; color:#64748B;">${esc(new Date(p.created_at).toLocaleDateString())}</span></td>
        <td>${requestsHtml}</td>
        <td>
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-action-secondary send-reset-btn" data-email="${esc(p.email)}">Send Reset</button>
            ${adminAction}
          </div>
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
