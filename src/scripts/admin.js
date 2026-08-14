import { supabase } from '../lib/supabase.js';
import { signIn } from '../lib/auth.js';
import { showToast, confirmDialog } from './ui-feedback.js';

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const requestsBody = document.getElementById('requestsBody');
const filterNeighborhood = document.getElementById('filterNeighborhood');
const filterCategory = document.getElementById('filterCategory');
const filterStatus = document.getElementById('filterStatus');

const STATUSES = ['new', 'contacted', 'completed', 'closed'];

async function isAdmin(email) {
  if (!email) return false;
  const { data } = await supabase.from('admins').select('email').eq('email', email).maybeSingle();
  return !!data;
}

let requests = [];
let sortKey = 'date_needed';
let sortDir = 'asc';

// Edit Request Modal Elements
const editRequestModal = document.getElementById('editRequestModal');
const editRequestForm = document.getElementById('editRequestForm');
const closeEditRequestModalBtn = document.getElementById('closeEditRequestModalBtn');

const closeEditModal = () => {
  if (editRequestModal) editRequestModal.style.display = 'none';
};

closeEditRequestModalBtn?.addEventListener('click', closeEditModal);
editRequestModal?.addEventListener('click', (e) => {
  if (e.target === editRequestModal) closeEditModal();
});

editRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editReqId').value;
  const saveBtn = document.getElementById('saveEditRequestBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
  }

  const updates = {
    neighborhood: document.getElementById('editReqNeighborhood').value,
    category: document.getElementById('editReqCategory').value.trim(),
    date_needed: document.getElementById('editReqDate').value,
    status: document.getElementById('editReqStatus').value,
    name: document.getElementById('editReqName').value.trim(),
    phone: document.getElementById('editReqPhone').value.trim(),
    email: document.getElementById('editReqEmail').value.trim(),
    notes: document.getElementById('editReqNotes').value.trim()
  };

  const { error } = await supabase.from('service_requests').update(updates).eq('id', id);

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }

  if (error) {
    showToast('Failed to save changes: ' + error.message, true);
    return;
  }

  showToast('Service request updated successfully.');
  closeEditModal();
  await loadRequests();
});

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showApp() {
  loginView.style.display = 'none';
  appView.style.display = 'block';
  loadRequests();
}

function showLogin() {
  loginView.style.display = 'block';
  appView.style.display = 'none';
}

async function loadRequests() {
  requestsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#64748B;">Loading service requests…</td></tr>`;
  const { data, error } = await supabase.from('service_requests').select('*');

  if (error) {
    requestsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#DC2626;">Failed to load service requests.</td></tr>`;
    return;
  }

  requests = data || [];
  const reqCountEl = document.getElementById('requestsCount');
  if (reqCountEl) reqCountEl.textContent = requests.length;

  populateFilterOptions();
  renderTable();
}

function formatNeighborhood(slug) {
  if (!slug) return '—';
  const map = {
    'onion-creek': 'Onion Creek',
    'circle-c': 'Circle C',
    'avery-ranch': 'Avery Ranch',
    'sunfield': 'Sunfield'
  };
  return map[slug] || slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function populateFilterOptions() {
  const neighborhoods = [...new Set(requests.map((r) => r.neighborhood).filter(Boolean))].sort();
  const categories = [...new Set(requests.map((r) => r.category).filter(Boolean))].sort();

  filterNeighborhood.innerHTML = '<option value="">All Neighborhoods</option>' +
    neighborhoods.map((n) => `<option value="${esc(n)}">${esc(formatNeighborhood(n))}</option>`).join('');
  filterCategory.innerHTML = '<option value="">All Categories</option>' +
    categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function renderTable() {
  const filtered = requests.filter((r) =>
    (!filterNeighborhood.value || r.neighborhood === filterNeighborhood.value) &&
    (!filterCategory.value || r.category === filterCategory.value) &&
    (!filterStatus.value || r.status === filterStatus.value)
  );

  filtered.sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  document.querySelectorAll('th.sortable').forEach((th) => {
    const active = th.dataset.sort === sortKey;
    th.querySelector('.arrow').textContent = active ? (sortDir === 'asc' ? '▲' : '▼') : '';
  });

  const reqCountEl = document.getElementById('requestsCount');
  if (reqCountEl) reqCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    requestsBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="table-empty-state">
            <div class="table-empty-icon">📋</div>
            <div class="table-empty-title">No service requests found</div>
            <div class="table-empty-desc">${requests.length === 0 ? 'No service requests have been submitted yet.' : 'Try adjusting your neighborhood, category, or status filters.'}</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  requestsBody.innerHTML = filtered.map((r) => {
    const formattedDate = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return `
      <tr data-id="${r.id}">
        <td><span style="font-weight:500; font-size:0.82rem; color:#64748B; white-space:nowrap;">${esc(formattedDate)}</span></td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="pill-tag neighborhood">${esc(formatNeighborhood(r.neighborhood))}</span>
            <span class="pill-tag category">${esc(r.category)}</span>
          </div>
        </td>
        <td>
          <div class="contact-cell">
            <span class="contact-name">${esc(r.name || 'Neighbor')}</span>
            ${r.email ? `<a href="mailto:${esc(r.email)}" class="contact-email">✉️ ${esc(r.email)}</a>` : '<span style="color:#94A3B8; font-size:0.78rem;">No email</span>'}
          </div>
        </td>
        <td>
          <a href="tel:${esc(r.phone)}" class="contact-phone-link">📞 ${esc(r.phone)}</a>
        </td>
        <td>
          <span class="date-badge">📅 ${esc(r.date_needed)}</span>
        </td>
        <td>
          <div class="notes-cell" title="${esc(r.notes || '')}">
            ${esc(r.notes || '—')}
          </div>
        </td>
        <td>
          <select class="status" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
            ${STATUSES.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:right;">
          <div class="actions-cell">
            <button class="btn-action-edit btn-edit-request" data-id="${r.id}" title="Edit request">✏️ Edit</button>
            <button class="btn-action-danger btn-delete-request" data-id="${r.id}" title="Delete request">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  requestsBody.querySelectorAll('.btn-edit-request').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const req = requests.find((r) => String(r.id) === String(id));
      if (!req) return;

      document.getElementById('editReqId').value = req.id;
      document.getElementById('editReqNeighborhood').value = req.neighborhood || 'onion-creek';
      document.getElementById('editReqCategory').value = req.category || '';
      document.getElementById('editReqDate').value = req.date_needed || '';
      document.getElementById('editReqStatus').value = req.status || 'new';
      document.getElementById('editReqName').value = req.name || '';
      document.getElementById('editReqPhone').value = req.phone || '';
      document.getElementById('editReqEmail').value = req.email || '';
      document.getElementById('editReqNotes').value = req.notes || '';

      if (editRequestModal) editRequestModal.style.display = 'flex';
    });
  });

  requestsBody.querySelectorAll('select.status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const previousValue = requests.find((r) => r.id === sel.dataset.id)?.status;
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('service_requests').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        showToast('Failed to update status. Please try again.', true);
        sel.value = previousValue;
        sel.dataset.value = previousValue;
        return;
      }
      const req = requests.find((r) => r.id === sel.dataset.id);
      if (req) req.status = sel.value;
    });
  });

  requestsBody.querySelectorAll('.btn-delete-request').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this request permanently? This cannot be undone.'))) return;
      const { error } = await supabase.from('service_requests').delete().eq('id', btn.dataset.id);
      if (error) {
        showToast('Failed to delete request.', true);
        return;
      }
      requests = requests.filter((r) => r.id !== btn.dataset.id);
      renderTable();
    });
  });
}

document.querySelectorAll('th.sortable').forEach((th) => {
  th.addEventListener('click', () => {
    if (sortKey === th.dataset.sort) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = th.dataset.sort;
      sortDir = 'asc';
    }
    renderTable();
  });
});

if (filterNeighborhood && filterCategory && filterStatus) {
  [filterNeighborhood, filterCategory, filterStatus].forEach((el) => el?.addEventListener('change', renderTable));
}

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const { data, error } = await signIn(loginEmail.value.trim(), loginPassword.value);
    if (error) {
      loginError.textContent = 'Invalid email or password.';
      return;
    }
    if (!(await isAdmin(data.user?.email))) {
      await supabase.auth.signOut();
      loginError.textContent = 'This account does not have admin access.';
      return;
    }
    window.location.reload();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
}

if (appView) {
  loadRequests();
  loadReferrals();
}

const tabOverviewBtn = document.getElementById('tabOverviewBtn');
const tabRequestsBtn = document.getElementById('tabRequestsBtn');
const tabReferralsBtn = document.getElementById('tabReferralsBtn');
const tabUsersBtn = document.getElementById('tabUsersBtn');
const tabRolesBtn = document.getElementById('tabRolesBtn');
const tabDirectoryBtn = document.getElementById('tabDirectoryBtn');

const ALL_TABS = [tabOverviewBtn, tabRequestsBtn, tabReferralsBtn, tabUsersBtn, tabRolesBtn, tabDirectoryBtn];

function switchTab(activeBtn, targetId) {
  ALL_TABS.forEach((btn) => btn?.classList.remove('active'));
  ['tab-overview', 'tab-requests', 'tab-referrals', 'tab-users', 'tab-roles', 'tab-directory'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === targetId ? 'block' : 'none';
  });
  activeBtn?.classList.add('active');
}

tabOverviewBtn?.addEventListener('click', () => {
  switchTab(tabOverviewBtn, 'tab-overview');
  window.dispatchEvent(new Event('overview-tab-shown'));
});
tabRequestsBtn?.addEventListener('click', () => switchTab(tabRequestsBtn, 'tab-requests'));
tabReferralsBtn?.addEventListener('click', () => {
  switchTab(tabReferralsBtn, 'tab-referrals');
  loadReferrals();
});
tabUsersBtn?.addEventListener('click', () => {
  switchTab(tabUsersBtn, 'tab-users');
  window.dispatchEvent(new Event('users-tab-shown'));
});
tabRolesBtn?.addEventListener('click', () => {
  switchTab(tabRolesBtn, 'tab-roles');
  loadAdminRoles();
});
tabDirectoryBtn?.addEventListener('click', () => {
  switchTab(tabDirectoryBtn, 'tab-directory');
  window.dispatchEvent(new Event('directory-tab-shown'));
});

// ── Admin Roles & Accounts Management ──
let adminUsers = [];
const adminsBody = document.getElementById('adminsBody');
const grantAdminEmail = document.getElementById('grantAdminEmail');
const grantAdminBtn = document.getElementById('grantAdminBtn');
const grantAdminNotice = document.getElementById('grantAdminNotice');

const SUPER_ADMINS = ['marconidominyx@gmail.com', 'hillfamendeavors@gmail.com'];

async function loadAdminRoles() {
  if (!adminsBody) return;
  adminsBody.innerHTML = `<tr><td colspan="4">Loading admin accounts…</td></tr>`;
  const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });

  if (error) {
    adminsBody.innerHTML = `<tr><td colspan="4">Failed to load admin accounts: ${esc(error.message)}</td></tr>`;
    return;
  }

  adminUsers = data || [];
  renderAdminsTable();
}

function renderAdminsTable() {
  if (!adminsBody) return;

  if (adminUsers.length === 0) {
    adminsBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="table-empty-state">
            <div class="table-empty-icon">🛡️</div>
            <div class="table-empty-title">No admin accounts configured</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  adminsBody.innerHTML = adminUsers.map((a) => {
    const isSuper = SUPER_ADMINS.includes(a.email.toLowerCase());
    const roleBadge = isSuper
      ? '<span class="pill-tag" style="background:#FEF3C7; color:#92400E; border-color:#FDE68A;">Super Admin</span>'
      : '<span class="pill-tag" style="background:#D1FAE5; color:#065F46; border-color:#A7F3D0;">Admin</span>';
    const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString() : 'System';

    return `
      <tr data-email="${esc(a.email)}">
        <td>
          <div class="contact-cell">
            <span class="contact-name">${esc(a.email)}</span>
          </div>
        </td>
        <td>${roleBadge}</td>
        <td><span style="font-size:0.85rem; color:#64748B;">${esc(dateStr)}</span></td>
        <td style="text-align:right;">
          ${isSuper ? '<span style="color:#94A3B8; font-size:0.8rem; font-weight:600;">Protected</span>' : `<button class="btn-action-danger btn-revoke-admin" data-email="${esc(a.email)}">Revoke Access</button>`}
        </td>
      </tr>
    `;
  }).join('');

  adminsBody.querySelectorAll('.btn-revoke-admin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      if (!email) return;
      if (!(await confirmDialog(`Revoke admin access for ${email}?`))) return;

      const { error } = await supabase.from('admins').delete().eq('email', email);
      if (error) {
        showToast('Failed to revoke admin role: ' + error.message, true);
        return;
      }

      adminUsers = adminUsers.filter((a) => a.email !== email);
      renderAdminsTable();
    });
  });
}

grantAdminBtn?.addEventListener('click', async () => {
  if (!grantAdminEmail) return;
  const email = grantAdminEmail.value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    if (grantAdminNotice) grantAdminNotice.innerHTML = '<span style="color:red;">Please enter a valid email address.</span>';
    return;
  }

  grantAdminBtn.disabled = true;
  grantAdminBtn.textContent = 'Granting…';

  const { error } = await supabase.from('admins').insert({ email });

  grantAdminBtn.disabled = false;
  grantAdminBtn.textContent = 'Grant Admin Role';

  if (error) {
    if (grantAdminNotice) grantAdminNotice.innerHTML = `<span style="color:red;">Error: ${esc(error.message)}</span>`;
    return;
  }

  grantAdminEmail.value = '';
  if (grantAdminNotice) grantAdminNotice.innerHTML = `<span style="color:green;">✓ Admin role granted to <strong>${esc(email)}</strong>.</span>`;
  loadAdminRoles();
});

// ── Referral Suggestions Admin Logic ──
let referrals = [];
const referralsBody = document.getElementById('referralsBody');
const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
const filterRefStatus = document.getElementById('filterRefStatus');
const REFERRAL_STATUSES = ['new', 'approved', 'rejected'];

async function loadReferrals() {
  if (!referralsBody) return;
  referralsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#64748B;">Loading referrals…</td></tr>`;
  const { data, error } = await supabase.from('referral_suggestions').select('*').order('created_at', { ascending: false });

  if (error) {
    referralsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#DC2626;">Failed to load referrals: ${esc(error.message)}</td></tr>`;
    return;
  }

  referrals = data || [];
  const refCountEl = document.getElementById('referralsCount');
  if (refCountEl) refCountEl.textContent = referrals.length;

  populateReferralFilters();
  renderReferralsTable();
}

function populateReferralFilters() {
  if (!filterRefNeighborhood) return;
  const neighborhoods = [...new Set(referrals.map((r) => r.neighborhood).filter(Boolean))].sort();
  filterRefNeighborhood.innerHTML = '<option value="">All Neighborhoods</option>' +
    neighborhoods.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
}

function renderReferralsTable() {
  if (!referralsBody) return;
  const filtered = referrals.filter((r) =>
    (!filterRefNeighborhood?.value || r.neighborhood === filterRefNeighborhood.value) &&
    (!filterRefStatus?.value || r.status === filterRefStatus.value)
  );

  const refCountEl = document.getElementById('referralsCount');
  if (refCountEl) refCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    referralsBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="table-empty-state">
            <div class="table-empty-icon">💡</div>
            <div class="table-empty-title">No referral suggestions found</div>
            <div class="table-empty-desc">${referrals.length === 0 ? 'No referral suggestions have been submitted yet.' : 'Try adjusting your filters.'}</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  referralsBody.innerHTML = filtered.map((r) => `
    <tr data-id="${r.id}">
      <td><span style="font-weight:500; font-size:0.82rem; color:#64748B; white-space:nowrap;">${esc(new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</span></td>
      <td><span class="contact-name">${esc(r.name)}</span></td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <span class="pill-tag neighborhood">${esc(formatNeighborhood(r.neighborhood))}</span>
          <span class="pill-tag category">${esc(r.category || 'General')}</span>
        </div>
      </td>
      <td><a href="tel:${esc(r.phone)}" class="contact-phone-link">📞 ${esc(r.phone)}</a></td>
      <td>
        <div class="contact-cell">
          <span class="contact-name">${esc(r.referrer)}</span>
          ${r.referrer_email ? `<a href="mailto:${esc(r.referrer_email)}" class="contact-email">✉️ ${esc(r.referrer_email)}</a>` : '<span class="contact-email">—</span>'}
        </div>
      </td>
      <td><div class="notes-cell" title="${esc(r.note)}">${esc(r.note || '—')}</div></td>
      <td>
        <select class="ref-status" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
          ${REFERRAL_STATUSES.map((s) => `<option value="${s}" ${s === (r.status || 'new') ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="text-align:right;">
        <button class="btn-action-danger btn-delete-ref" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  referralsBody.querySelectorAll('select.ref-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('referral_suggestions').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        showToast('Failed to update status.', true);
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(sel.dataset.id));
      if (ref) ref.status = sel.value;
    });
  });

  referralsBody.querySelectorAll('.btn-delete-ref').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this referral suggestion?'))) return;
      const { error } = await supabase.from('referral_suggestions').delete().eq('id', btn.dataset.id);
      if (error) {
        showToast('Failed to delete referral.', true);
        return;
      }
      referrals = referrals.filter((r) => String(r.id) !== String(btn.dataset.id));
      renderReferralsTable();
    });
  });
}

if (filterRefNeighborhood && filterRefStatus) {
  [filterRefNeighborhood, filterRefStatus].forEach((el) => el?.addEventListener('change', renderReferralsTable));
}
