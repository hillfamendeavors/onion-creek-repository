import { supabase } from '../lib/supabase.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { bootAdminPage } from './admin-boot.js';
import { markPublishPending } from './admin-publish.js';

let referrals = [];
let categories = [];
let groups = [];
let activeStatusTab = 'new'; // 'new' | 'approved' | 'rejected' | 'all'

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

function formatNeighborhood(slug) {
  if (!slug) return 'Onion Creek';
  const map = {
    'onion-creek': 'Onion Creek',
    'circle-c': 'Circle C',
    'avery-ranch': 'Avery Ranch',
    'sunfield': 'Sunfield'
  };
  return map[slug] || slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function updateKPIs() {
  const total = referrals.length;
  const pending = referrals.filter((r) => (r.status || 'new') === 'new').length;
  const approved = referrals.filter((r) => r.status === 'approved').length;
  const rejected = referrals.filter((r) => r.status === 'rejected').length;

  const kpiTotalReferrals = document.getElementById('kpiTotalReferrals');
  const kpiPendingReferrals = document.getElementById('kpiPendingReferrals');
  const kpiApprovedReferrals = document.getElementById('kpiApprovedReferrals');
  const kpiRejectedReferrals = document.getElementById('kpiRejectedReferrals');

  if (kpiTotalReferrals) kpiTotalReferrals.textContent = total;
  if (kpiPendingReferrals) kpiPendingReferrals.textContent = pending;
  if (kpiApprovedReferrals) kpiApprovedReferrals.textContent = approved;
  if (kpiRejectedReferrals) kpiRejectedReferrals.textContent = rejected;

  // Status Tab Badges
  const badgePending = document.getElementById('badgePendingCount');
  const badgeApproved = document.getElementById('badgeApprovedCount');
  const badgeRejected = document.getElementById('badgeRejectedCount');
  const badgeAll = document.getElementById('badgeAllCount');

  if (badgePending) badgePending.textContent = pending;
  if (badgeApproved) badgeApproved.textContent = approved;
  if (badgeRejected) badgeRejected.textContent = rejected;
  if (badgeAll) badgeAll.textContent = total;
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
  const pubSubcat = document.getElementById('pubSubcat');
  if (!pubSubcat) return;

  const groupedHtml = groups.map((g) => {
    const subs = categories.filter((s) => s.group_id === g.id);
    if (!subs.length) return '';
    return `<optgroup label="${esc(g.label)}">${subs.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`;
  }).join('');

  pubSubcat.innerHTML = groupedHtml;
}

async function loadReferrals() {
  const container = document.getElementById('referralsContainer');
  if (!container) return;

  const { data, error } = await supabase
    .from('referral_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referrals:', error);
    container.innerHTML = `
      <div style="grid-column:1 / -1; text-align:center; padding:48px 20px; color:#EF4444;">
        Failed to load referral suggestions. (${esc(error.message)})
      </div>
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
  const container = document.getElementById('referralsContainer');
  const refSearchInput = document.getElementById('refSearchInput');
  const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');

  if (!container) return;

  const searchQ = (refSearchInput?.value || '').trim().toLowerCase();
  const neighborhoodFilter = filterRefNeighborhood?.value || '';

  const filtered = referrals.filter((r) => {
    const status = r.status || 'new';
    if (activeStatusTab !== 'all' && status !== activeStatusTab) return false;
    if (neighborhoodFilter && r.neighborhood !== neighborhoodFilter) return false;
    if (searchQ) {
      const matchStr = `${r.name || ''} ${r.phone || ''} ${r.category || ''} ${r.referrer || ''} ${r.referrer_email || ''} ${r.note || ''}`.toLowerCase();
      if (!matchStr.includes(searchQ)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    const statusLabels = {
      new: 'No pending referral suggestions awaiting review.',
      approved: 'No approved referrals yet.',
      rejected: 'No rejected referrals.',
      all: 'No referral suggestions match your search criteria.'
    };
    container.innerHTML = `
      <div style="grid-column:1 / -1; text-align:center; padding:60px 20px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px;">
        <div style="font-size:2.5rem; margin-bottom:12px;">🎉</div>
        <div style="font-weight:700; font-size:1.15rem; color:#1E293B; margin-bottom:6px;">
          ${statusLabels[activeStatusTab] || 'No suggestions found.'}
        </div>
        <div style="font-size:0.88rem; color:#64748B;">
          ${activeStatusTab === 'new' ? 'You are all caught up! New neighbor recommendations will show up here.' : 'Try changing status tabs or search keywords.'}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((r) => {
    const status = r.status || 'new';
    const formattedDate = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const referrerInitials = getInitials(r.referrer);

    let statusPillClass = 'status-new';
    let statusPillText = 'Pending Review';
    if (status === 'approved') {
      statusPillClass = 'status-approved';
      statusPillText = 'Approved & Published';
    } else if (status === 'rejected') {
      statusPillClass = 'status-rejected';
      statusPillText = 'Rejected';
    }

    return `
      <div class="ref-card status-${esc(status)}" data-id="${esc(r.id)}">
        <div class="ref-card-header">
          <div class="ref-card-pills">
            <span class="pill-tag neighborhood">${esc(formatNeighborhood(r.neighborhood))}</span>
            <span class="pill-tag category">${esc(r.category || 'General Service')}</span>
            <span class="pill-tag ${statusPillClass}">${statusPillText}</span>
          </div>
          <span class="ref-card-date">Submitted ${esc(formattedDate)}</span>
        </div>

        <div class="ref-card-body">
          <h4 class="ref-business-title">${esc(r.name || 'Unnamed Business')}</h4>

          <div class="ref-contact-row">
            ${r.phone ? `
              <a href="tel:${esc(r.phone)}" class="ref-contact-link" title="Call ${esc(r.phone)}">
                📞 ${esc(r.phone)}
              </a>
              <button type="button" class="btn-copy-phone" data-phone="${esc(r.phone)}" title="Copy phone number" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:0.75rem; color:#475569;">
                📋 Copy
              </button>
            ` : '<span style="color:#94A3B8; font-size:0.85rem;">No phone provided</span>'}
          </div>

          <div class="ref-quote-box">
            “${esc(r.note || 'Recommended by a local neighbor.')}”
            <div class="ref-referrer-tag">
              <div class="avatar-chip" style="background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; width:22px; height:22px; font-size:0.7rem;">${esc(referrerInitials)}</div>
              <span>Referred by <strong>${esc(r.referrer || 'Neighbor')}</strong></span>
              ${r.referrer_email ? `<span style="color:#64748B; font-weight:400; font-size:0.75rem;">(${esc(r.referrer_email)})</span>` : ''}
            </div>
          </div>
        </div>

        <div class="ref-card-actions">
          ${status === 'new' ? `
            <button type="button" class="btn-ref-approve btn-action-publish" data-id="${esc(r.id)}">
              ✓ Approve &amp; Publish
            </button>
            <button type="button" class="btn-ref-edit btn-action-edit-ref" data-id="${esc(r.id)}" title="Edit before publishing">
              ✏️ Edit
            </button>
            <button type="button" class="btn-ref-reject btn-action-reject" data-id="${esc(r.id)}" title="Reject suggestion">
              ✕ Reject
            </button>
            <button type="button" class="btn-ref-delete btn-action-delete" data-id="${esc(r.id)}" title="Delete suggestion">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : status === 'approved' ? `
            <span style="font-size:0.82rem; font-weight:700; color:#059669; display:inline-flex; align-items:center; gap:5px; flex:1;">
              ✅ Live on Directory
            </span>
            <button type="button" class="btn-ref-restore btn-action-restore" data-id="${esc(r.id)}" title="Move back to pending review">
              ↺ Revert
            </button>
            <button type="button" class="btn-ref-edit btn-action-edit-ref" data-id="${esc(r.id)}" title="Edit details">
              ✏️ Edit
            </button>
            <button type="button" class="btn-ref-delete btn-action-delete" data-id="${esc(r.id)}" title="Delete suggestion">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : `
            <button type="button" class="btn-ref-restore btn-action-restore" data-id="${esc(r.id)}" style="flex:1; justify-content:center;">
              ↺ Restore to Pending
            </button>
            <button type="button" class="btn-ref-edit btn-action-edit-ref" data-id="${esc(r.id)}" title="Edit details">
              ✏️ Edit
            </button>
            <button type="button" class="btn-ref-delete btn-action-delete" data-id="${esc(r.id)}" title="Delete permanently">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Wire Card Actions
  container.querySelectorAll('.btn-action-publish').forEach((btn) => {
    btn.addEventListener('click', () => openPublishModal(btn.dataset.id));
  });

  container.querySelectorAll('.btn-action-edit-ref').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  container.querySelectorAll('.btn-action-reject').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const { error } = await supabase.from('referral_suggestions').update({ status: 'rejected' }).eq('id', id);
      if (error) {
        showToast('Failed to reject referral: ' + error.message, true);
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(id));
      if (ref) ref.status = 'rejected';
      updateKPIs();
      renderReferrals();
      showToast('Referral moved to Rejected tab.');
    });
  });

  container.querySelectorAll('.btn-action-restore').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const { error } = await supabase.from('referral_suggestions').update({ status: 'new' }).eq('id', id);
      if (error) {
        showToast('Failed to restore referral: ' + error.message, true);
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(id));
      if (ref) ref.status = 'new';
      updateKPIs();
      renderReferrals();
      showToast('Referral restored to Pending Review.');
    });
  });

  container.querySelectorAll('.btn-action-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!(await confirmDialog('Are you sure you want to permanently delete this suggestion?'))) {
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
      showToast('Referral permanently deleted.');
    });
  });

  container.querySelectorAll('.btn-copy-phone').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phone = btn.dataset.phone;
      if (phone) {
        try {
          await navigator.clipboard.writeText(phone);
          showToast(`Copied ${phone} to clipboard!`);
        } catch (e) {
          showToast(`Phone: ${phone}`);
        }
      }
    });
  });
}

// ── Publish to Directory Modal ──
function openPublishModal(id) {
  const r = referrals.find((x) => String(x.id) === String(id));
  const modal = document.getElementById('publishReferralModal');
  if (!r || !modal) return;

  document.getElementById('pubReferralId').value = r.id; // Store string UUID
  document.getElementById('pubNeighborhood').value = r.neighborhood || 'onion-creek';
  document.getElementById('pubName').value = r.name || '';
  document.getElementById('pubPhone').value = r.phone || '';
  document.getElementById('pubEmail').value = '';
  document.getElementById('pubWebsite').value = '';
  document.getElementById('pubNote').value = r.note || '';
  document.getElementById('pubFeatured').checked = false;

  // Smart Category Matching
  const pubSubcat = document.getElementById('pubSubcat');
  if (pubSubcat && r.category) {
    const rawCat = r.category.trim().toLowerCase();
    const match = categories.find((c) => {
      const cName = c.name.toLowerCase();
      return cName === rawCat || cName.startsWith(rawCat) || rawCat.startsWith(cName) || cName.includes(rawCat);
    });
    if (match) {
      pubSubcat.value = match.id;
    } else if (categories.length > 0) {
      pubSubcat.value = categories[0].id;
    }
  }

  modal.style.display = 'flex';
  trapFocus(modal, closePublishModal);
}

function closePublishModal() {
  const modal = document.getElementById('publishReferralModal');
  if (modal) modal.style.display = 'none';
  releaseFocus();
}

// ── Edit Suggestion Modal ──
function openEditModal(id) {
  const r = referrals.find((x) => String(x.id) === String(id));
  const modal = document.getElementById('editReferralModal');
  if (!r || !modal) return;

  document.getElementById('editReferralId').value = r.id;
  document.getElementById('editName').value = r.name || '';
  document.getElementById('editPhone').value = r.phone || '';
  document.getElementById('editNeighborhood').value = r.neighborhood || 'onion-creek';
  document.getElementById('editCategory').value = r.category || '';
  document.getElementById('editReferrer').value = r.referrer || '';
  document.getElementById('editReferrerEmail').value = r.referrer_email || '';
  document.getElementById('editNote').value = r.note || '';

  modal.style.display = 'flex';
  trapFocus(modal, closeEditModal);
}

function closeEditModal() {
  const modal = document.getElementById('editReferralModal');
  if (modal) modal.style.display = 'none';
  releaseFocus();
}

function wireReferrals() {
  const refSearchInput = document.getElementById('refSearchInput');
  const filterRefNeighborhood = document.getElementById('filterRefNeighborhood');
  const refreshRefBtn = document.getElementById('refreshRefBtn');
  const refStatusTabs = document.getElementById('refStatusTabs');

  const publishModal = document.getElementById('publishReferralModal');
  const closePublishModalBtn = document.getElementById('closePublishModalBtn');
  const closePublishModalTop = document.getElementById('closePublishModalTop');
  const publishForm = document.getElementById('publishReferralForm');

  const editModal = document.getElementById('editReferralModal');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const closeEditModalTop = document.getElementById('closeEditModalTop');
  const editForm = document.getElementById('editReferralForm');

  // Status Tabs
  refStatusTabs?.querySelectorAll('.ref-status-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      refStatusTabs.querySelectorAll('.ref-status-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeStatusTab = tab.dataset.tab;
      renderReferrals();
    });
  });

  refSearchInput?.addEventListener('input', renderReferrals);
  filterRefNeighborhood?.addEventListener('change', renderReferrals);
  refreshRefBtn?.addEventListener('click', loadReferrals);

  // Close Publish Modal
  closePublishModalBtn?.addEventListener('click', closePublishModal);
  closePublishModalTop?.addEventListener('click', closePublishModal);
  publishModal?.addEventListener('click', (e) => {
    if (e.target === publishModal) closePublishModal();
  });

  // Close Edit Modal
  closeEditModalBtn?.addEventListener('click', closeEditModal);
  closeEditModalTop?.addEventListener('click', closeEditModal);
  editModal?.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  // Submit Publish Form
  //
  // Guards against the same double-insert bug the Directory CMS's Add
  // Listing form had: the form's own listener is now bound at most once
  // (see bootAdminPage), but this flag also stops a double-click or a slow
  // network response from publishing one referral twice, and the unique
  // index on `listings` is the final backstop if both somehow still race.
  let isPublishingReferral = false;

  publishForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isPublishingReferral) return;
    isPublishingReferral = true;

    const refId = document.getElementById('pubReferralId').value.trim(); // Preserved as string UUID
    const neighborhood_slug = document.getElementById('pubNeighborhood').value;
    const subcategory_id = Number(document.getElementById('pubSubcat').value);
    const name = document.getElementById('pubName').value.trim();
    const phone = document.getElementById('pubPhone').value.trim();
    const email = document.getElementById('pubEmail').value.trim() || null;
    const website = document.getElementById('pubWebsite').value.trim() || null;
    const note = document.getElementById('pubNote').value.trim() || '';
    const featured = document.getElementById('pubFeatured').checked;

    const saveBtn = document.getElementById('savePublishBtn');
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
      sort_order = Math.min(...orders, 0) - 1;
    }

    // 1. Insert into listings table
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

    isPublishingReferral = false;

    if (insertErr) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Confirm & Publish';
      }
      if (insertErr.code === '23505') {
        showToast('That listing already exists in this category for this neighborhood.', true);
      } else {
        showToast('Failed to create directory listing: ' + insertErr.message, true);
      }
      return;
    }

    // 2. Update referral status to approved using string UUID
    await supabase.from('referral_suggestions').update({ status: 'approved' }).eq('id', refId);
    const refItem = referrals.find((x) => String(x.id) === String(refId));
    if (refItem) refItem.status = 'approved';

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '✓ Confirm & Publish';
    }

    closePublishModal();
    updateKPIs();
    renderReferrals();
    markPublishPending();
    showToast(`✓ Successfully published "${name}" to ${formatNeighborhood(neighborhood_slug)} directory!`);
  });

  // Submit Edit Form
  let isSavingReferralEdit = false;

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSavingReferralEdit) return;
    isSavingReferralEdit = true;

    const refId = document.getElementById('editReferralId').value.trim();
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const neighborhood = document.getElementById('editNeighborhood').value;
    const category = document.getElementById('editCategory').value.trim();
    const referrer = document.getElementById('editReferrer').value.trim();
    const referrer_email = document.getElementById('editReferrerEmail').value.trim() || null;
    const note = document.getElementById('editNote').value.trim();

    const saveBtn = document.getElementById('saveEditBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    const { error } = await supabase.from('referral_suggestions').update({
      name,
      phone,
      neighborhood,
      category,
      referrer,
      referrer_email,
      note
    }).eq('id', refId);

    isSavingReferralEdit = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }

    if (error) {
      showToast('Failed to update suggestion: ' + error.message, true);
      return;
    }

    const ref = referrals.find((r) => String(r.id) === String(refId));
    if (ref) {
      ref.name = name;
      ref.phone = phone;
      ref.neighborhood = neighborhood;
      ref.category = category;
      ref.referrer = referrer;
      ref.referrer_email = referrer_email;
      ref.note = note;
    }

    closeEditModal();
    renderReferrals();
    showToast('Referral suggestion updated successfully.');
  });
}

function loadReferralsPage() {
  return Promise.all([loadTaxonomy(), loadReferrals()]);
}

bootAdminPage('referralsContainer', { wire: wireReferrals, load: loadReferralsPage });
