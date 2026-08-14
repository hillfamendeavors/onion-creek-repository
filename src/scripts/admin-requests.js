import { supabase } from '../lib/supabase.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';

const STATUSES = ['new', 'contacted', 'completed', 'closed'];

let requests = [];
let sortKey = 'date_needed';
let sortDir = 'asc';

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
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

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateKPIs() {
  const kpiTotalRequests = document.getElementById('kpiTotalRequests');
  const kpiActiveRequests = document.getElementById('kpiActiveRequests');
  const kpiCompletedRequests = document.getElementById('kpiCompletedRequests');
  const kpiNeighborhoodCount = document.getElementById('kpiNeighborhoodCount');

  const total = requests.length;
  const active = requests.filter((r) => r.status === 'new' || !r.status).length;
  const completed = requests.filter((r) => r.status === 'completed').length;
  const neighborhoods = new Set(requests.map((r) => r.neighborhood).filter(Boolean)).size;

  if (kpiTotalRequests) kpiTotalRequests.textContent = total;
  if (kpiActiveRequests) kpiActiveRequests.textContent = active;
  if (kpiCompletedRequests) kpiCompletedRequests.textContent = completed;
  if (kpiNeighborhoodCount) kpiNeighborhoodCount.textContent = neighborhoods;
}

function populateFilterOptions() {
  const filterNeighborhood = document.getElementById('filterNeighborhood');
  const filterCategory = document.getElementById('filterCategory');

  const neighborhoods = [...new Set(requests.map((r) => r.neighborhood).filter(Boolean))].sort();
  const categories = [...new Set(requests.map((r) => r.category).filter(Boolean))].sort();

  if (filterNeighborhood) {
    const currentVal = filterNeighborhood.value;
    filterNeighborhood.innerHTML = '<option value="">All Neighborhoods</option>' +
      neighborhoods.map((n) => `<option value="${esc(n)}" ${n === currentVal ? 'selected' : ''}>${esc(formatNeighborhood(n))}</option>`).join('');
  }

  if (filterCategory) {
    const currentVal = filterCategory.value;
    filterCategory.innerHTML = '<option value="">All Categories</option>' +
      categories.map((c) => `<option value="${esc(c)}" ${c === currentVal ? 'selected' : ''}>${esc(c)}</option>`).join('');
  }
}

async function loadRequests() {
  const requestsTableBody = document.getElementById('requestsTableBody');
  if (!requestsTableBody) return;
  requestsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px; color:#64748B;">Loading service requests…</td></tr>`;

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    requestsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px; color:#DC2626;">Failed to load service requests: ${esc(error.message)}</td></tr>`;
    return;
  }

  requests = data || [];
  updateKPIs();
  populateFilterOptions();
  renderTable();
}

function renderTable() {
  const requestsTableBody = document.getElementById('requestsTableBody');
  const reqSearchInput = document.getElementById('reqSearchInput');
  const filterNeighborhood = document.getElementById('filterNeighborhood');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');

  if (!requestsTableBody) return;

  const searchQ = (reqSearchInput?.value || '').trim().toLowerCase();

  const filtered = requests.filter((r) => {
    const matchNb = !filterNeighborhood?.value || r.neighborhood === filterNeighborhood.value;
    const matchCat = !filterCategory?.value || r.category === filterCategory.value;
    const matchStat = !filterStatus?.value || (r.status || 'new') === filterStatus.value;
    
    let matchSearch = true;
    if (searchQ) {
      const searchStr = `${r.name || ''} ${r.email || ''} ${r.phone || ''} ${r.notes || ''} ${r.category || ''} ${r.neighborhood || ''}`.toLowerCase();
      matchSearch = searchStr.includes(searchQ);
    }

    return matchNb && matchCat && matchStat && matchSearch;
  });

  filtered.sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  document.querySelectorAll('th.sortable').forEach((th) => {
    const active = th.dataset.sort === sortKey;
    const arrow = th.querySelector('.arrow');
    if (arrow) arrow.textContent = active ? (sortDir === 'asc' ? '▲' : '▼') : '';
  });

  if (filtered.length === 0) {
    requestsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:48px 20px;">
          <div style="font-size:2rem; margin-bottom:10px; color:#64748B;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
          </div>
          <div style="font-weight:700; font-size:1.05rem; color:#334155; margin-bottom:6px;">No Service Requests Found</div>
          <div style="font-size:0.88rem; color:#64748B; max-width:380px; margin:0 auto 16px auto;">
            ${requests.length === 0 ? 'No service requests have been submitted yet.' : 'Try adjusting your search query, neighborhood, or status filters.'}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-CA');

  requestsTableBody.innerHTML = filtered.map((r) => {
    const formattedCreated = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    const isPast = r.date_needed && r.date_needed < todayStr && r.status !== 'completed';
    const initials = getInitials(r.name);

    return `
      <tr data-id="${r.id}">
        <td>
          <span style="font-weight:600; font-size:0.82rem; color:#64748B; white-space:nowrap;">${esc(formattedCreated)}</span>
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="pill-tag neighborhood">${esc(formatNeighborhood(r.neighborhood))}</span>
            <span class="pill-tag category">${esc(r.category)}</span>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-chip">${esc(initials)}</div>
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
              <span style="font-weight:700; color:#0F172A; font-size:0.88rem; line-height:1.2;">${esc(r.name || 'Neighbor')}</span>
              ${r.email ? `<a href="mailto:${esc(r.email)}" style="font-size:0.78rem; color:#047857; text-decoration:none; display:inline-flex; align-items:center; gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${esc(r.email)}</a>` : '<span style="color:#94A3B8; font-size:0.75rem;">No email</span>'}
            </div>
          </div>
        </td>
        <td>
          <a href="tel:${esc(r.phone)}" style="font-size:0.85rem; color:#0F172A; font-weight:600; text-decoration:none; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${esc(r.phone || '—')}
          </a>
        </td>
        <td>
          <span class="date-chip ${isPast ? 'past' : ''}" style="display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${esc(r.date_needed || '—')}
          </span>
        </td>
        <td>
          <div style="max-width:240px; font-size:0.82rem; color:#475569; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${esc(r.notes || '')}">
            ${esc(r.notes || '—')}
          </div>
        </td>
        <td>
          <select class="admin-status-select" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
            ${STATUSES.map((s) => `<option value="${s}" ${s === (r.status || 'new') ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-action-edit btn-edit-request" data-id="${r.id}" title="Edit request">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
            <button class="btn-action-danger btn-delete-request" data-id="${r.id}" title="Delete request">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire Status Change
  requestsTableBody.querySelectorAll('select.admin-status-select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const prevVal = requests.find((r) => String(r.id) === String(sel.dataset.id))?.status || 'new';
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('service_requests').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        showToast('Failed to update status: ' + error.message, true);
        sel.value = prevVal;
        sel.dataset.value = prevVal;
        return;
      }
      const req = requests.find((r) => String(r.id) === String(sel.dataset.id));
      if (req) req.status = sel.value;
      updateKPIs();
      showToast('Status updated to ' + sel.value);
    });
  });

  // Wire Edit Button
  requestsTableBody.querySelectorAll('.btn-edit-request').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openEditModal(id);
    });
  });

  // Wire Delete Button
  requestsTableBody.querySelectorAll('.btn-delete-request').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!(await confirmDialog('Are you sure you want to permanently delete this service request?'))) {
        return;
      }
      const { error } = await supabase.from('service_requests').delete().eq('id', id);
      if (error) {
        showToast('Failed to delete request: ' + error.message, true);
        return;
      }
      requests = requests.filter((r) => String(r.id) !== String(id));
      updateKPIs();
      renderTable();
      showToast('Service request deleted.');
    });
  });
}

function openEditModal(id) {
  const req = requests.find((r) => String(r.id) === String(id));
  const editRequestModal = document.getElementById('editRequestModal');
  if (!req || !editRequestModal) return;

  document.getElementById('editReqId').value = req.id;
  document.getElementById('editReqStatus').value = req.status || 'new';
  document.getElementById('editReqDateNeeded').value = req.date_needed || '';
  document.getElementById('editReqName').value = req.name || '';
  document.getElementById('editReqPhone').value = req.phone || '';
  document.getElementById('editReqEmail').value = req.email || '';
  document.getElementById('editReqNotes').value = req.notes || '';

  editRequestModal.style.display = 'flex';
  trapFocus(editRequestModal, closeEditModal);
}

function closeEditModal() {
  const editRequestModal = document.getElementById('editRequestModal');
  if (editRequestModal) editRequestModal.style.display = 'none';
  releaseFocus();
}

function initRequests() {
  const requestsTableBody = document.getElementById('requestsTableBody');
  if (!requestsTableBody) return;

  const filterNeighborhood = document.getElementById('filterNeighborhood');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const reqSearchInput = document.getElementById('reqSearchInput');
  const refreshReqBtn = document.getElementById('refreshReqBtn');
  const editRequestForm = document.getElementById('editRequestForm');
  const closeEditRequestModalBtn = document.getElementById('closeEditRequestModalBtn');
  const editRequestModal = document.getElementById('editRequestModal');

  // Event Listeners for Filters & Search
  [filterNeighborhood, filterCategory, filterStatus].forEach((el) => {
    el?.addEventListener('change', renderTable);
  });

  reqSearchInput?.addEventListener('input', renderTable);
  refreshReqBtn?.addEventListener('click', loadRequests);

  closeEditRequestModalBtn?.addEventListener('click', closeEditModal);
  editRequestModal?.addEventListener('click', (e) => {
    if (e.target === editRequestModal) closeEditModal();
  });

  editRequestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editReqId').value;
    const saveBtn = document.getElementById('saveEditReqBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    const updates = {
      status: document.getElementById('editReqStatus').value,
      date_needed: document.getElementById('editReqDateNeeded').value || null,
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

  // Sortable Headers
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

  loadRequests();
}

document.addEventListener('astro:page-load', initRequests);
window.addEventListener('admin-auth-verified', () => {
  if (document.getElementById('requestsTableBody')) loadRequests();
});
initRequests();
