import { supabase } from '../lib/supabase.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';
import { showToast, confirmDialog } from './ui-feedback.js';

let referrals = [];
let categories = [];
let groups = [];
let currentViewingRef = null;

const REFERRAL_STATUSES = ['new', 'approved', 'rejected'];

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function updateKPIs() {
  const kpiTotalReferrals = document.getElementById('kpiTotalReferrals');
  const kpiPendingReferrals = document.getElementById('kpiPendingReferrals');
  const kpiApprovedReferrals = document.getElementById('kpiApprovedReferrals');
  const kpiRejectedReferrals = document.getElementById('kpiRejectedReferrals');

  if (kpiTotalReferrals) kpiTotalReferrals.textContent = referrals.length;
  if (kpiPendingReferrals) kpiPendingReferrals.textContent = referrals.filter((r) => r.status === 'new').length;
  if (kpiApprovedReferrals) kpiApprovedReferrals.textContent = referrals.filter((r) => r.status === 'approved').length;
  if (kpiRejectedReferrals) kpiRejectedReferrals.textContent = referrals.filter((r) => r.status === 'rejected').length;
}

async function loadTaxonomy() {
  if (groups.length && categories.length) {
    populateTaxonomySelects();
    return;
  }
  const [g, s] = await Promise.all([
    supabase.from('groups').select('*').order('sort_order'),
    supabase.from('subcategories').select('*').order('sort_order'),
  ]);
  groups = g.data || [];
  categories = s.data || [];
  populateTaxonomySelects();
}

function populateTaxonomySelects() {
  const convSubcat = document.getElementById('convSubcat');
  if (!convSubcat) return;

  const groupedHtml = groups.map((g) => {
    const subs = categories.filter((s) => s.group_id === g.id);
    if (!subs.length) return '';
    return `<optgroup label="${esc(g.label)}">${subs.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`;
  }).join('');

  convSubcat.innerHTML = groupedHtml;
}

async function loadReferrals() {
  const referralsBody = document.getElementById('referralsBody');
  if (!referralsBody) return;

  const { data, error } = await supabase
    .from('referral_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referrals:', error);
    referralsBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:36px; color:#EF4444;">
          Failed to load referral suggestions. (${esc(error.message)})
        </td>
      </tr>
    `;
    return;
  }

  referrals = data || [];
  updateKPIs();
  populateNeighborhoodFilter();
  renderReferrals();
}

function populateNeighborhoodFilter() {
  const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
  if (!filterRefNeighborhood) return;
  const currentVal = filterRefNeighborhood.value;
  const set = new Set();
  referrals.forEach((r) => { if (r.neighborhood) set.add(r.neighborhood); });

  const opts = ['<option value="">All Neighborhoods</option>'];
  Array.from(set).sort().forEach((slug) => {
    opts.push(`<option value="${esc(slug)}">${esc(formatNeighborhood(slug))}</option>`);
  });
  filterRefNeighborhood.innerHTML = opts.join('');
  filterRefNeighborhood.value = currentVal;
}

function renderReferrals() {
  const referralsBody = document.getElementById('referralsBody');
  const refSearchInput = document.getElementById('refSearchInput');
  const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
  const filterRefStatus = document.getElementById('filterRefStatus');

  if (!referralsBody) return;

  const searchQ = (refSearchInput?.value || '').trim().toLowerCase();
  const neighborhoodFilter = filterRefNeighborhood?.value || '';
  const statusFilter = filterRefStatus?.value || '';

  const filtered = referrals.filter((r) => {
    if (neighborhoodFilter && r.neighborhood !== neighborhoodFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (searchQ) {
      const matchStr = `${r.name || ''} ${r.phone || ''} ${r.category || ''} ${r.referrer || ''} ${r.referrer_email || ''} ${r.note || ''}`.toLowerCase();
      if (!matchStr.includes(searchQ)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    referralsBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:48px 20px;">
          <div style="font-size:2rem; margin-bottom:10px; color:#64748B;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          </div>
          <div style="font-weight:700; font-size:1.05rem; color:#1E293B; margin-bottom:6px;">No Referral Suggestions Found</div>
          <div style="font-size:0.88rem; color:#64748B;">Try adjusting your search query or filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  referralsBody.innerHTML = filtered.map((r) => {
    const formattedDate = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    const referrerInitials = getInitials(r.referrer);

    return `
      <tr data-id="${r.id}">
        <td>
          <span style="font-weight:600; font-size:0.82rem; color:#64748B; white-space:nowrap;">${esc(formattedDate)}</span>
        </td>
        <td>
          <div style="font-weight:700; color:#0F172A; font-size:0.92rem;">${esc(r.name)}</div>
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="pill-tag neighborhood">${esc(formatNeighborhood(r.neighborhood))}</span>
            <span class="pill-tag category">${esc(r.category || 'General')}</span>
          </div>
        </td>
        <td>
          <a href="tel:${esc(r.phone)}" style="font-size:0.85rem; color:#0F172A; font-weight:600; text-decoration:none; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${esc(r.phone || '—')}
          </a>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="avatar-chip" style="background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE;">${esc(referrerInitials)}</div>
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
              <span style="font-weight:600; color:#1E293B; font-size:0.88rem;">${esc(r.referrer || 'Neighbor')}</span>
              ${r.referrer_email ? `<a href="mailto:${esc(r.referrer_email)}" style="font-size:0.78rem; color:#047857; text-decoration:none; display:inline-flex; align-items:center; gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${esc(r.referrer_email)}</a>` : '<span style="color:#94A3B8; font-size:0.75rem;">—</span>'}
            </div>
          </div>
        </td>
        <td>
          <div class="btn-open-detail" data-id="${r.id}" style="cursor:pointer; padding:4px 6px; border-radius:6px; transition:background 120ms ease;" title="Click to view full recommendation note popup">
            <div style="max-width:240px; font-size:0.82rem; color:#334155; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              "${esc(r.note || 'No notes provided.')}"
            </div>
            <span style="font-size:0.75rem; color:#2563EB; font-weight:600; display:inline-flex; align-items:center; gap:3px; margin-top:2px;">
              Read full note ↗
            </span>
          </div>
        </td>
        <td>
          <select class="admin-status-select" data-id="${r.id}" data-value="${esc(r.status || 'new')}">
            ${REFERRAL_STATUSES.map((s) => `<option value="${s}" ${s === (r.status || 'new') ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-secondary btn-open-detail" data-id="${r.id}" title="View full details" style="padding:5px 9px; font-size:0.78rem; display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
            <button class="btn-action-edit btn-convert-ref" data-id="${r.id}" title="Add this referral to directory" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0; display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Add to Directory
            </button>
            <button class="btn-action-danger btn-delete-ref" data-id="${r.id}" title="Delete referral">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire Status Change
  referralsBody.querySelectorAll('select.admin-status-select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const prevVal = referrals.find((r) => String(r.id) === String(sel.dataset.id))?.status || 'new';
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('referral_suggestions').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        showToast('Failed to update referral status: ' + error.message, true);
        sel.value = prevVal;
        sel.dataset.value = prevVal;
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(sel.dataset.id));
      if (ref) ref.status = sel.value;
      updateKPIs();
      showToast('Referral marked as ' + sel.value);
    });
  });

  // Wire View Details Popup
  referralsBody.querySelectorAll('.btn-open-detail').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openViewReferralModal(id);
    });
  });

  // Wire Convert / Add to Directory Button
  referralsBody.querySelectorAll('.btn-convert-ref').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openConvertModal(id);
    });
  });

  // Wire Delete Button
  referralsBody.querySelectorAll('.btn-delete-ref').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!(await confirmDialog('Are you sure you want to delete this referral suggestion permanently?'))) {
        return;
      }
      const { error } = await supabase.from('referral_suggestions').delete().eq('id', id);
      if (error) {
        showToast('Failed to delete referral: ' + error.message, true);
        return;
      }
      referrals = referrals.filter((r) => String(r.id) !== String(id));
      updateKPIs();
      renderReferrals();
      showToast('Referral deleted successfully.');
    });
  });
}

// ── View Full Referral Details Modal Logic ──
function openViewReferralModal(id) {
  const r = referrals.find((x) => String(x.id) === String(id));
  const viewReferralModal = document.getElementById('viewReferralModal');
  if (!r || !viewReferralModal) return;

  currentViewingRef = r;

  const viewRefNote = document.getElementById('viewRefNote');
  const viewRefName = document.getElementById('viewRefName');
  const viewRefPhone = document.getElementById('viewRefPhone');
  const viewRefPhoneText = document.getElementById('viewRefPhoneText');
  const viewRefNeighborhood = document.getElementById('viewRefNeighborhood');
  const viewRefCategory = document.getElementById('viewRefCategory');
  const viewRefReferrer = document.getElementById('viewRefReferrer');
  const viewRefAvatar = document.getElementById('viewRefAvatar');
  const viewRefEmail = document.getElementById('viewRefEmail');
  const viewRefEmailText = document.getElementById('viewRefEmailText');
  const viewRefDate = document.getElementById('viewRefDate');
  const viewRefStatusBadge = document.getElementById('viewRefStatusBadge');
  const viewRefStatusSelect = document.getElementById('viewRefStatusSelect');

  if (viewRefNote) viewRefNote.textContent = r.note || 'No notes provided with this recommendation.';
  if (viewRefName) viewRefName.textContent = r.name || 'Unnamed Business';
  
  if (viewRefPhone && viewRefPhoneText) {
    viewRefPhone.href = r.phone ? `tel:${r.phone}` : '#';
    viewRefPhoneText.textContent = r.phone || 'No phone provided';
  }

  if (viewRefNeighborhood) viewRefNeighborhood.textContent = formatNeighborhood(r.neighborhood);
  if (viewRefCategory) viewRefCategory.textContent = r.category || 'General';

  if (viewRefReferrer) viewRefReferrer.textContent = r.referrer || 'Neighbor';
  if (viewRefAvatar) viewRefAvatar.textContent = getInitials(r.referrer);

  if (viewRefEmail && viewRefEmailText) {
    if (r.referrer_email) {
      viewRefEmail.href = `mailto:${r.referrer_email}`;
      viewRefEmailText.textContent = r.referrer_email;
      viewRefEmail.style.display = 'inline-flex';
    } else {
      viewRefEmailText.textContent = 'No email provided';
      viewRefEmail.removeAttribute('href');
    }
  }

  if (viewRefDate) {
    viewRefDate.textContent = r.created_at
      ? `Submitted on ${new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
      : 'Submitted date unknown';
  }

  if (viewRefStatusBadge) {
    viewRefStatusBadge.className = `pill-tag status-${r.status || 'new'}`;
    viewRefStatusBadge.textContent = (r.status || 'new').toUpperCase();
  }

  if (viewRefStatusSelect) {
    viewRefStatusSelect.value = r.status || 'new';
  }

  viewReferralModal.style.display = 'flex';
  trapFocus(viewReferralModal, closeViewReferralModal);
}

function closeViewReferralModal() {
  const viewReferralModal = document.getElementById('viewReferralModal');
  if (viewReferralModal) viewReferralModal.style.display = 'none';
  releaseFocus();
}

// ── Convert Referral into Directory Listing Modal ──
function closeConvertModal() {
  const convertReferralModal = document.getElementById('convertReferralModal');
  if (convertReferralModal) convertReferralModal.style.display = 'none';
  releaseFocus();
}

function openConvertModal(id) {
  const r = referrals.find((x) => String(x.id) === String(id));
  const convertReferralModal = document.getElementById('convertReferralModal');
  if (!r || !convertReferralModal) return;

  document.getElementById('convReferralId').value = r.id;
  document.getElementById('convNeighborhood').value = r.neighborhood || 'onion-creek';
  document.getElementById('convName').value = r.name || '';
  document.getElementById('convPhone').value = r.phone || '';
  document.getElementById('convEmail').value = '';
  document.getElementById('convWebsite').value = '';
  document.getElementById('convNote').value = r.note || '';
  document.getElementById('convFeatured').checked = false;

  const convSubcat = document.getElementById('convSubcat');
  if (convSubcat && r.category) {
    const match = categories.find((c) => c.name.toLowerCase() === r.category.toLowerCase());
    if (match) convSubcat.value = match.id;
  }

  convertReferralModal.style.display = 'flex';
  trapFocus(convertReferralModal, closeConvertModal);
}

// Wire Event Listeners in Page Scope
function initReferrals() {
  const referralsBody = document.getElementById('referralsBody');
  if (!referralsBody) return;

  const refSearchInput = document.getElementById('refSearchInput');
  const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
  const filterRefStatus = document.getElementById('filterRefStatus');
  const refreshRefBtn = document.getElementById('refreshRefBtn');

  const viewReferralModal = document.getElementById('viewReferralModal');
  const closeViewReferralModalBtn = document.getElementById('closeViewReferralModalBtn');
  const viewRefStatusSelect = document.getElementById('viewRefStatusSelect');
  const viewRefDeleteBtn = document.getElementById('viewRefDeleteBtn');
  const viewRefConvertBtn = document.getElementById('viewRefConvertBtn');

  const convertReferralModal = document.getElementById('convertReferralModal');
  const closeConvertModalBtn = document.getElementById('closeConvertModalBtn');
  const convertReferralForm = document.getElementById('convertReferralForm');

  refSearchInput?.addEventListener('input', renderReferrals);
  filterRefNeighborhood?.addEventListener('change', renderReferrals);
  filterRefStatus?.addEventListener('change', renderReferrals);
  refreshRefBtn?.addEventListener('click', loadReferrals);

  closeViewReferralModalBtn?.addEventListener('click', closeViewReferralModal);
  viewReferralModal?.addEventListener('click', (e) => {
    if (e.target === viewReferralModal) closeViewReferralModal();
  });

  // Update Status from Modal
  viewRefStatusSelect?.addEventListener('change', async () => {
    if (!currentViewingRef) return;
    const newStatus = viewRefStatusSelect.value;
    const { error } = await supabase.from('referral_suggestions').update({ status: newStatus }).eq('id', currentViewingRef.id);
    if (error) {
      showToast('Failed to update status: ' + error.message, true);
      return;
    }
    currentViewingRef.status = newStatus;
    const viewRefStatusBadge = document.getElementById('viewRefStatusBadge');
    if (viewRefStatusBadge) {
      viewRefStatusBadge.className = `pill-tag status-${newStatus}`;
      viewRefStatusBadge.textContent = newStatus.toUpperCase();
    }
    updateKPIs();
    renderReferrals();
    showToast(`Referral status updated to ${newStatus}`);
  });

  // Delete from Modal
  viewRefDeleteBtn?.addEventListener('click', async () => {
    if (!currentViewingRef) return;
    if (!(await confirmDialog('Are you sure you want to delete this referral suggestion permanently?'))) {
      return;
    }
    const id = currentViewingRef.id;
    const { error } = await supabase.from('referral_suggestions').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete referral: ' + error.message, true);
      return;
    }
    referrals = referrals.filter((r) => r.id !== id);
    closeViewReferralModal();
    updateKPIs();
    renderReferrals();
    showToast('Referral suggestion deleted.');
  });

  // Convert from View Modal
  viewRefConvertBtn?.addEventListener('click', () => {
    if (!currentViewingRef) return;
    const id = currentViewingRef.id;
    closeViewReferralModal();
    openConvertModal(id);
  });

  closeConvertModalBtn?.addEventListener('click', closeConvertModal);
  convertReferralModal?.addEventListener('click', (e) => {
    if (e.target === convertReferralModal) closeConvertModal();
  });

  convertReferralForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const refId = Number(document.getElementById('convReferralId').value);
    const neighborhood_slug = document.getElementById('convNeighborhood').value;
    const subcategory_id = Number(document.getElementById('convSubcat').value);
    const name = document.getElementById('convName').value.trim();
    const phone = document.getElementById('convPhone').value.trim();
    const email = document.getElementById('convEmail').value.trim() || null;
    const website = document.getElementById('convWebsite').value.trim() || null;
    const note = document.getElementById('convNote').value.trim() || '';
    const featured = document.getElementById('convFeatured').checked;
    const position = document.getElementById('convPosition').value;

    const saveBtn = document.getElementById('saveConvertBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Publishing…';
    }

    let sort_order = 0;
    const { data: existingListings } = await supabase
      .from('listings')
      .select('sort_order')
      .eq('neighborhood_slug', neighborhood_slug)
      .eq('subcategory_id', subcategory_id);

    if (existingListings && existingListings.length > 0) {
      const orders = existingListings.map((x) => x.sort_order ?? 0);
      if (position === 'bottom') {
        sort_order = Math.max(...orders, 0) + 1;
      } else {
        sort_order = Math.min(...orders, 0) - 1;
      }
    }

    const { error: insertErr } = await supabase.from('listings').insert({
      neighborhood_slug,
      subcategory_id,
      name,
      phone,
      email,
      website,
      note,
      featured,
      sort_order
    });

    if (insertErr) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Publish to Directory';
      }
      showToast('Failed to create directory listing: ' + insertErr.message, true);
      return;
    }

    await supabase.from('referral_suggestions').update({ status: 'approved' }).eq('id', refId);
    const refItem = referrals.find((x) => x.id === refId);
    if (refItem) refItem.status = 'approved';

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '✓ Publish to Directory';
    }

    closeConvertModal();
    updateKPIs();
    renderReferrals();
    showToast(`Successfully published "${name}" to ${formatNeighborhood(neighborhood_slug)} directory!`);
  });

  Promise.all([loadTaxonomy(), loadReferrals()]);
}

document.addEventListener('astro:page-load', initReferrals);
window.addEventListener('admin-auth-verified', () => {
  if (document.getElementById('referralsBody')) {
    Promise.all([loadTaxonomy(), loadReferrals()]);
  }
});
initReferrals();
