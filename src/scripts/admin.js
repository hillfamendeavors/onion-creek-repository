import { supabase } from '../lib/supabase.js';

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

const STATUSES = ['new', 'contacted', 'closed'];

async function isAdmin(email) {
  if (!email) return false;
  const { data } = await supabase.from('admins').select('email').eq('email', email).maybeSingle();
  return !!data;
}

let requests = [];
let sortKey = 'date_needed';
let sortDir = 'asc';

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
  requestsBody.innerHTML = `<tr><td colspan="10">Loading…</td></tr>`;
  const { data, error } = await supabase.from('service_requests').select('*');

  if (error) {
    requestsBody.innerHTML = `<tr><td colspan="10">Failed to load requests.</td></tr>`;
    return;
  }

  requests = data;
  populateFilterOptions();
  renderTable();
}

function populateFilterOptions() {
  const neighborhoods = [...new Set(requests.map((r) => r.neighborhood))].sort();
  const categories = [...new Set(requests.map((r) => r.category))].sort();

  filterNeighborhood.innerHTML = '<option value="">All neighborhoods</option>' +
    neighborhoods.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  filterCategory.innerHTML = '<option value="">All categories</option>' +
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

  if (filtered.length === 0) {
    requestsBody.innerHTML = `<tr><td colspan="10">${requests.length === 0 ? 'No requests yet.' : 'No requests match the current filters.'}</td></tr>`;
    return;
  }

  requestsBody.innerHTML = filtered.map((r) => `
    <tr data-id="${r.id}">
      <td>${esc(new Date(r.created_at).toLocaleDateString())}</td>
      <td>${esc(r.neighborhood)}</td>
      <td>${esc(r.category)}</td>
      <td>${esc(r.date_needed)}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.email)}</td>
      <td>${esc(r.notes)}</td>
      <td>
        <select class="status" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
          ${STATUSES.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn-danger" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  requestsBody.querySelectorAll('select.status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const previousValue = requests.find((r) => r.id === sel.dataset.id)?.status;
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('service_requests').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        alert('Failed to update status. Please try again.');
        sel.value = previousValue;
        sel.dataset.value = previousValue;
        return;
      }
      const req = requests.find((r) => r.id === sel.dataset.id);
      if (req) req.status = sel.value;
    });
  });

  requestsBody.querySelectorAll('.btn-danger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this request permanently? This cannot be undone.')) return;
      const { error } = await supabase.from('service_requests').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Failed to delete request.');
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value,
    });
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

const tabRequestsBtn = document.getElementById('tabRequestsBtn');
const tabReferralsBtn = document.getElementById('tabReferralsBtn');
const tabDirectoryBtn = document.getElementById('tabDirectoryBtn');

function switchTab(activeBtn, targetId) {
  [tabRequestsBtn, tabReferralsBtn, tabDirectoryBtn].forEach((btn) => btn?.classList.remove('active'));
  ['tab-requests', 'tab-referrals', 'tab-directory'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === targetId ? 'block' : 'none';
  });
  activeBtn?.classList.add('active');
}

tabRequestsBtn?.addEventListener('click', () => switchTab(tabRequestsBtn, 'tab-requests'));
tabReferralsBtn?.addEventListener('click', () => {
  switchTab(tabReferralsBtn, 'tab-referrals');
  loadReferrals();
});
tabDirectoryBtn?.addEventListener('click', () => {
  switchTab(tabDirectoryBtn, 'tab-directory');
  window.dispatchEvent(new Event('directory-tab-shown'));
});

// ── Referral Suggestions Admin Logic ──
let referrals = [];
const referralsBody = document.getElementById('referralsBody');
const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
const filterRefStatus = document.getElementById('filterRefStatus');
const REFERRAL_STATUSES = ['new', 'approved', 'rejected'];

async function loadReferrals() {
  if (!referralsBody) return;
  referralsBody.innerHTML = `<tr><td colspan="10">Loading referrals…</td></tr>`;
  const { data, error } = await supabase.from('referral_suggestions').select('*').order('created_at', { ascending: false });

  if (error) {
    referralsBody.innerHTML = `<tr><td colspan="10">No referrals found or failed to load.</td></tr>`;
    return;
  }

  referrals = data || [];
  populateReferralFilters();
  renderReferralsTable();
}

function populateReferralFilters() {
  if (!filterRefNeighborhood) return;
  const neighborhoods = [...new Set(referrals.map((r) => r.neighborhood).filter(Boolean))].sort();
  filterRefNeighborhood.innerHTML = '<option value="">All neighborhoods</option>' +
    neighborhoods.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
}

function renderReferralsTable() {
  if (!referralsBody) return;
  const filtered = referrals.filter((r) =>
    (!filterRefNeighborhood?.value || r.neighborhood === filterRefNeighborhood.value) &&
    (!filterRefStatus?.value || r.status === filterRefStatus.value)
  );

  if (filtered.length === 0) {
    referralsBody.innerHTML = `<tr><td colspan="10">${referrals.length === 0 ? 'No referral suggestions yet.' : 'No referrals match current filters.'}</td></tr>`;
    return;
  }

  referralsBody.innerHTML = filtered.map((r) => `
    <tr data-id="${r.id}">
      <td>${esc(new Date(r.created_at).toLocaleDateString())}</td>
      <td>${esc(r.neighborhood || 'N/A')}</td>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${esc(r.category || 'General')}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.referrer)}</td>
      <td>${esc(r.referrer_email || '—')}</td>
      <td>${esc(r.note)}</td>
      <td>
        <select class="ref-status" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
          ${REFERRAL_STATUSES.map((s) => `<option value="${s}" ${s === (r.status || 'new') ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn-danger btn-delete-ref" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  referralsBody.querySelectorAll('select.ref-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('referral_suggestions').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        alert('Failed to update status.');
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(sel.dataset.id));
      if (ref) ref.status = sel.value;
    });
  });

  referralsBody.querySelectorAll('.btn-delete-ref').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this referral suggestion?')) return;
      const { error } = await supabase.from('referral_suggestions').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Failed to delete referral.');
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
