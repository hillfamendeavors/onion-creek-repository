import { supabase } from '../lib/supabase.js';
import { requestPasswordReset } from '../lib/auth.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { bootAdminPage } from './admin-boot.js';

let profiles = [];
let requests = [];
let adminEmails = new Set();

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadUsers() {
  const usersBody = document.getElementById('usersBody');
  if (!usersBody) return;
  usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:36px; color:#64748B;">Loading registered users…</td></tr>`;

  const [profilesRes, requestsRes, adminsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('email, category, date_needed'),
    supabase.from('admins').select('email'),
  ]);

  if (profilesRes.error) {
    usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:36px; color:#DC2626;">Failed to load users: ${esc(profilesRes.error.message)}</td></tr>`;
    return;
  }

  profiles = profilesRes.data || [];
  requests = requestsRes.data || [];
  adminEmails = new Set((adminsRes.data || []).map((a) => a.email.toLowerCase()));

  renderUsersTable();
}

function renderUsersTable() {
  const usersBody = document.getElementById('usersBody');
  const userSearchInput = document.getElementById('userSearchInput');
  if (!usersBody) return;

  const searchQ = (userSearchInput?.value || '').trim().toLowerCase();

  const filtered = profiles.filter((p) => {
    if (!searchQ) return true;
    const str = `${p.full_name || ''} ${p.email || ''} ${p.phone || ''}`.toLowerCase();
    return str.includes(searchQ);
  });

  if (filtered.length === 0) {
    usersBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:48px 20px;">
          <div style="font-size:2rem; margin-bottom:10px; color:#64748B;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style="font-weight:700; font-size:1.05rem; color:#334155; margin-bottom:6px;">No Registered Users Found</div>
          <div style="font-size:0.88rem; color:#64748B;">No neighbors match your search criteria.</div>
        </td>
      </tr>
    `;
    return;
  }

  usersBody.innerHTML = filtered.map((p) => {
    const theirRequests = requests.filter((r) => r.email === p.email);
    const requestsHtml = theirRequests.length === 0
      ? '<span style="color:#94A3B8; font-size:0.82rem;">None yet</span>'
      : `<div style="display:flex; gap:6px; flex-wrap:wrap;">${theirRequests.map((r) => `
          <span class="pill-tag category" style="font-size:0.75rem;">
            ${esc(r.category)} <span style="opacity:0.65; margin-left:2px;">(${esc(r.date_needed)})</span>
          </span>
        `).join('')}</div>`;

    const isAdmin = adminEmails.has((p.email || '').toLowerCase());
    const initials = getInitials(p.full_name);

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-chip">${esc(initials)}</div>
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
              <span style="font-weight:700; color:#0F172A; font-size:0.9rem; line-height:1.2;">
                ${esc(p.full_name || 'Unnamed Neighbor')}
              </span>
              <a href="mailto:${esc(p.email)}" style="font-size:0.78rem; color:#047857; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                ${esc(p.email)}
              </a>
            </div>
          </div>
        </td>
        <td>
          <a href="tel:${esc(p.phone)}" style="font-size:0.85rem; color:#0F172A; font-weight:600; text-decoration:none; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${esc(p.phone || '—')}
          </a>
        </td>
        <td>
          <span style="font-size:0.82rem; color:#64748B; font-weight:500; white-space:nowrap;">
            ${esc(new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}
          </span>
        </td>
        <td>${requestsHtml}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-secondary send-reset-btn" data-email="${esc(p.email)}" style="padding:4px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9m-4 4L3.5 19.5a2.121 2.121 0 0 0 3 3L13 16m2-2l3.5-3.5a2.121 2.121 0 0 0-3-3L12 11"/><circle cx="16.5" cy="7.5" r=".5"/></svg>
              Send Reset
            </button>
            ${isAdmin
              ? `
                <span class="pill-tag" style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; display:inline-flex; align-items:center; gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin</span>
                <button class="btn-secondary revoke-admin-btn" data-email="${esc(p.email)}" style="padding:4px 9px; font-size:0.75rem; color:#DC2626; border-color:#FECACA; background:#FEF2F2;" title="Revoke administrator privileges">Revoke</button>
              `
              : `<button class="btn-secondary grant-admin-btn" data-email="${esc(p.email)}" style="padding:4px 10px; font-size:0.75rem;">+ Grant Admin</button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire Password Reset
  usersBody.querySelectorAll('.send-reset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog(`Send a password reset link to ${btn.dataset.email}?`))) return;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const { error } = await requestPasswordReset(btn.dataset.email);
      btn.disabled = false;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9m-4 4L3.5 19.5a2.121 2.121 0 0 0 3 3L13 16m2-2l3.5-3.5a2.121 2.121 0 0 0-3-3L12 11"/><circle cx="16.5" cy="7.5" r=".5"/></svg> Send Reset`;
      if (error) {
        showToast('Failed to send reset: ' + error.message, true);
        return;
      }
      showToast(`Password reset link sent to ${btn.dataset.email}`);
    });
  });

  // Wire Grant Admin
  usersBody.querySelectorAll('.grant-admin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = (btn.dataset.email || '').trim().toLowerCase();
      if (!email) return;
      if (!(await confirmDialog(`Grant administrator privileges to ${email}?`))) return;
      btn.disabled = true;
      btn.textContent = 'Granting…';
      const { error } = await supabase.from('admins').insert({ email });
      if (error) {
        showToast('Failed to grant admin: ' + error.message, true);
        btn.disabled = false;
        btn.textContent = '+ Grant Admin';
        return;
      }
      showToast(`Admin privileges granted to ${email}`);
      adminEmails.add(email);
      renderUsersTable();
    });
  });

  // Wire Revoke Admin
  usersBody.querySelectorAll('.revoke-admin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = (btn.dataset.email || '').trim().toLowerCase();
      if (!email) return;

      const currentAdminEmail = (sessionStorage.getItem('tn_admin_verified_email') || '').trim().toLowerCase();
      const isSelf = currentAdminEmail && currentAdminEmail === email;

      const confirmMsg = isSelf
        ? `Warning: You are revoking your own administrator privileges for ${email}. You will lose access to the Admin Portal upon reload. Proceed?`
        : `Revoke administrator access for ${email}? This will restore the account to a regular user.`;

      if (!(await confirmDialog(confirmMsg))) return;

      btn.disabled = true;
      btn.textContent = 'Revoking…';

      const { error } = await supabase.from('admins').delete().ilike('email', email);
      if (error) {
        showToast('Failed to revoke admin: ' + error.message, true);
        btn.disabled = false;
        btn.textContent = 'Revoke';
        return;
      }

      showToast(`Admin privileges revoked for ${email}`);
      adminEmails.delete(email);
      renderUsersTable();

      if (isSelf) {
        sessionStorage.removeItem('tn_admin_verified_email');
        window.location.reload();
      }
    });
  });
}

function wireUsers() {
  const userSearchInput = document.getElementById('userSearchInput');
  const refreshUsersBtn = document.getElementById('refreshUsersBtn');

  userSearchInput?.addEventListener('input', renderUsersTable);
  refreshUsersBtn?.addEventListener('click', loadUsers);
}

bootAdminPage('usersBody', { wire: wireUsers, load: loadUsers });
