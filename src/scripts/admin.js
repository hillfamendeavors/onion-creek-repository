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
const ADMIN_EMAIL = 'hillfamendeavors@gmail.com';

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
        <select class="status" data-id="${r.id}">
          ${STATUSES.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="delete-btn" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  requestsBody.querySelectorAll('select.status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await supabase.from('service_requests').update({ status: sel.value }).eq('id', sel.dataset.id);
      const req = requests.find((r) => r.id === sel.dataset.id);
      if (req) req.status = sel.value;
    });
  });

  requestsBody.querySelectorAll('.delete-btn').forEach((btn) => {
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

[filterNeighborhood, filterCategory, filterStatus].forEach((el) => el.addEventListener('change', renderTable));

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
  if (data.user?.email !== ADMIN_EMAIL) {
    await supabase.auth.signOut();
    loginError.textContent = 'This account does not have admin access.';
    return;
  }
  showApp();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user?.email === ADMIN_EMAIL) showApp();
});
