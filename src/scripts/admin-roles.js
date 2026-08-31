import { supabase } from '../lib/supabase.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { bootAdminPage } from './admin-boot.js';

let admins = [];

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function getInitials(email) {
  if (!email) return 'AD';
  return email.slice(0, 2).toUpperCase();
}

async function loadAdmins() {
  const adminsBody = document.getElementById('adminsBody');
  if (!adminsBody) return;
  adminsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:36px; color:#64748B;">Loading admin accounts…</td></tr>`;

  const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });

  if (error) {
    adminsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:36px; color:#DC2626;">Failed to load admins: ${esc(error.message)}</td></tr>`;
    return;
  }

  admins = data || [];
  renderAdminsTable();
}

function renderAdminsTable() {
  const adminsBody = document.getElementById('adminsBody');
  if (!adminsBody) return;

  if (admins.length === 0) {
    adminsBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:48px 20px;">
          <div style="font-size:2rem; margin-bottom:10px; color:#64748B;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style="font-weight:700; font-size:1.05rem; color:#334155; margin-bottom:6px;">No Admin Accounts Configured</div>
          <div style="font-size:0.88rem; color:#64748B;">Add an administrator using the form above.</div>
        </td>
      </tr>
    `;
    return;
  }

  adminsBody.innerHTML = admins.map((a) => {
    const formattedDate = a.created_at
      ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return `
      <tr data-id="${a.id || a.email}">
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-chip" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
              ${esc(getInitials(a.email))}
            </div>
            <strong style="color:#0F172A; font-size:0.9rem;">${esc(a.email)}</strong>
          </div>
        </td>
        <td>
          <span class="pill-tag" style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; display:inline-flex; align-items:center; gap:4px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            ${esc(a.role || 'admin')}
          </span>
        </td>
        <td>
          <span style="font-size:0.82rem; color:#64748B; font-weight:500;">
            ${esc(formattedDate)}
          </span>
        </td>
        <td style="text-align:right;">
          <button class="btn-action-danger btn-remove-admin" data-email="${esc(a.email)}" style="display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Remove Admin
          </button>
        </td>
      </tr>
    `;
  }).join('');

  adminsBody.querySelectorAll('.btn-remove-admin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = (btn.dataset.email || '').trim().toLowerCase();
      if (!email) return;

      const currentAdminEmail = (sessionStorage.getItem('tn_admin_verified_email') || '').trim().toLowerCase();
      const isSelf = currentAdminEmail && currentAdminEmail === email;

      const confirmMsg = isSelf
        ? `Warning: You are revoking your own administrator access for ${email}. You will lose access to the Admin Portal upon reload. Proceed?`
        : `Revoke administrator access for ${email}? This will restore the account to a regular user.`;

      if (!(await confirmDialog(confirmMsg))) return;
      
      btn.disabled = true;
      btn.textContent = 'Removing…';

      const { error } = await supabase.from('admins').delete().ilike('email', email);
      if (error) {
        showToast('Failed to remove admin: ' + error.message, true);
        btn.disabled = false;
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Remove Admin`;
        return;
      }
      showToast(`Admin access revoked for ${email}`);
      admins = admins.filter((a) => a.email.toLowerCase() !== email);
      renderAdminsTable();

      if (isSelf) {
        sessionStorage.removeItem('tn_admin_verified_email');
        window.location.reload();
      }
    });
  });
}

function wireRoles() {
  const addAdminForm = document.getElementById('addAdminForm');
  const newAdminEmail = document.getElementById('newAdminEmail');
  const addAdminBtn = document.getElementById('addAdminBtn');

  // Same double-insert class of bug as the Directory CMS's Add Listing form —
  // this flag stops a double-click or slow response from firing two inserts
  // for one submit, on top of the form itself now only ever being wired once.
  let isAddingAdmin = false;

  addAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isAddingAdmin) return;
    const email = newAdminEmail.value.trim().toLowerCase();
    if (!email) return;

    isAddingAdmin = true;
    if (addAdminBtn) {
      addAdminBtn.disabled = true;
      addAdminBtn.textContent = 'Adding…';
    }

    const { error } = await supabase.from('admins').insert({ email });

    isAddingAdmin = false;
    if (addAdminBtn) {
      addAdminBtn.disabled = false;
      addAdminBtn.textContent = '+ Add Admin';
    }

    if (error) {
      if (error.code === '23505') {
        showToast(`${email} is already an administrator.`, true);
      } else {
        showToast('Failed to add admin: ' + error.message, true);
      }
      return;
    }

    showToast(`Added ${email} as administrator`);
    newAdminEmail.value = '';
    await loadAdmins();
  });
}

bootAdminPage('adminsBody', { wire: wireRoles, load: loadAdmins });
