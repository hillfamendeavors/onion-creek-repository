import { supabase } from '../lib/supabase.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { bootAdminPage } from './admin-boot.js';
import { markPublishPending } from './admin-publish.js';

const NEIGHBORHOODS = [
  { slug: 'onion-creek', name: 'Onion Creek' },
  { slug: 'circle-c', name: 'Circle C' },
  { slug: 'avery-ranch', name: 'Avery Ranch' },
  { slug: 'sunfield', name: 'Sunfield' },
];

let groups = [];
let subcategories = [];
let neighborhoodSubcats = [];
let allListings = [];
let currentNeighborhood = 'onion-creek';
let allCollapsed = false;

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

function updateKPIs() {
  const kpiTotalListings = document.getElementById('kpiTotalListings');
  const kpiFeaturedListings = document.getElementById('kpiFeaturedListings');
  const kpiSubcategoriesCount = document.getElementById('kpiSubcategoriesCount');
  const kpiNeighborhoodsCount = document.getElementById('kpiNeighborhoodsCount');

  if (kpiTotalListings) kpiTotalListings.textContent = allListings.length;
  if (kpiFeaturedListings) kpiFeaturedListings.textContent = allListings.filter((l) => l.featured).length;
  if (kpiSubcategoriesCount) kpiSubcategoriesCount.textContent = subcategories.length;
  if (kpiNeighborhoodsCount) kpiNeighborhoodsCount.textContent = NEIGHBORHOODS.length;

  const countAll = allListings.length;
  const badgeAll = document.getElementById('countBadge-all');
  if (badgeAll) badgeAll.textContent = countAll;

  NEIGHBORHOODS.forEach((n) => {
    const count = allListings.filter((l) => l.neighborhood_slug === n.slug).length;
    const badge = document.getElementById(`countBadge-${n.slug}`);
    if (badge) badge.textContent = count;
  });
}

async function loadDirectoryData() {
  if (groups.length && subcategories.length && neighborhoodSubcats.length) {
    return;
  }
  const [g, s, ns] = await Promise.all([
    supabase.from('groups').select('*').order('sort_order'),
    supabase.from('subcategories').select('*').order('sort_order'),
    supabase.from('neighborhood_subcategories').select('*'),
  ]);
  groups = g.data || [];
  subcategories = s.data || [];
  neighborhoodSubcats = ns.data || [];
}

async function loadAllListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!error && data) {
    allListings = data;
  }
  updateKPIs();
}

function populateNeighborhoodSelects() {
  const selects = [
    document.getElementById('addListNeighborhood'),
    document.getElementById('editListNeighborhood'),
  ];
  selects.forEach((sel) => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = NEIGHBORHOODS.map((n) => `<option value="${n.slug}">${n.name}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

function populateCategorySelects() {
  const selects = [
    document.getElementById('addListSubcat'),
    document.getElementById('editListSubcat'),
  ];

  const groupedHtml = groups.map((g) => {
    const subs = subcategories.filter((s) => s.group_id === g.id);
    if (!subs.length) return '';
    return `<optgroup label="${esc(g.label)}">${subs.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`;
  }).join('');

  selects.forEach((sel) => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = groupedHtml;
    if (cur) sel.value = cur;
  });

  const filterSel = document.getElementById('dirCategoryFilter');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = '<option value="">All Categories</option>' + groupedHtml;
    if (cur) filterSel.value = cur;
  }
}

function renderGroupedListings() {
  const container = document.getElementById('groupedDirectoryContainer');
  if (!container) return;

  const searchKeyword = (document.getElementById('dirSearch')?.value || '').trim().toLowerCase();
  const categoryFilterId = document.getElementById('dirCategoryFilter')?.value || '';

  const activeNeighborhoodName = currentNeighborhood === 'all' 
    ? 'All Neighborhoods' 
    : (NEIGHBORHOODS.find((n) => n.slug === currentNeighborhood)?.name || currentNeighborhood);

  const bannerTitle = document.getElementById('currentNeighborhoodTitle');
  if (bannerTitle) {
    bannerTitle.textContent = activeNeighborhoodName;
  }

  let filteredListings = allListings.filter((l) => {
    if (currentNeighborhood !== 'all' && l.neighborhood_slug !== currentNeighborhood) return false;
    if (categoryFilterId && String(l.subcategory_id) !== String(categoryFilterId)) return false;
    if (searchKeyword) {
      const matchStr = `${l.name || ''} ${l.phone || ''} ${l.email || ''} ${l.website || ''} ${l.note || ''}`.toLowerCase();
      if (!matchStr.includes(searchKeyword)) return false;
    }
    return true;
  });

  const bannerCount = document.getElementById('currentNeighborhoodListingCount');
  if (bannerCount) {
    bannerCount.textContent = `${filteredListings.length} listing${filteredListings.length !== 1 ? 's' : ''} published`;
  }

  if (filteredListings.length === 0) {
    container.innerHTML = `
      <div class="admin-card" style="text-align:center; padding:60px 20px;">
        <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.8;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <h3 style="margin:0 0 6px 0; color:#1E293B; font-size:1.15rem; font-weight:700;">No Directory Listings Found</h3>
        <p style="margin:0 auto 20px auto; color:#64748B; font-size:0.9rem; max-width:420px;">
          ${searchKeyword ? 'No businesses match your keyword search. Try clearing the search filter.' : `No verified businesses currently listed in ${activeNeighborhoodName}.`}
        </p>
        <button class="btn-primary" id="emptyStateAddBtn" style="font-size:0.88rem;">
          + Add First Business Listing
        </button>
      </div>
    `;
    document.getElementById('emptyStateAddBtn')?.addEventListener('click', () => {
      document.getElementById('openAddListingModalBtn')?.click();
    });
    return;
  }

  let renderedGroupsHtml = '';
  let totalMatchingGroups = 0;

  groups.forEach((g) => {
    const groupSubs = subcategories.filter((s) => s.group_id === g.id);
    let groupSubsHtml = '';
    let groupListingsCount = 0;

    groupSubs.forEach((s) => {
      if (categoryFilterId && String(s.id) !== String(categoryFilterId)) return;

      const subListings = filteredListings.filter((l) => l.subcategory_id === s.id);
      if (subListings.length === 0 && searchKeyword) return;

      groupListingsCount += subListings.length;

      subListings.sort((a, b) => {
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        const sa = a.sort_order ?? 0;
        const sb = b.sort_order ?? 0;
        if (sa !== sb) return sa - sb;
        return (a.name || '').localeCompare(b.name || '');
      });

      const tableRowsHtml = subListings.length === 0
        ? `<tr><td colspan="${currentNeighborhood === 'all' ? 7 : 6}" style="text-align:center; padding:20px; color:#94A3B8; font-size:0.85rem; font-style:italic;">No listings published in this subcategory yet.</td></tr>`
        : subListings.map((l, index) => {
          const isFirst = index === 0;
          const isLast = index === subListings.length - 1;

          return `
          <tr data-id="${l.id}" data-subcat-id="${s.id}" data-neighborhood="${l.neighborhood_slug}">
            <td style="text-align:center; width:65px;">
              <div style="display:inline-flex; flex-direction:column; gap:2px; align-items:center;">
                <button class="reorder-btn btn-move-up" data-id="${l.id}" ${isFirst ? 'disabled' : ''} title="Move up in ${esc(s.name)}">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <span style="font-size:0.75rem; font-weight:700; color:#64748B; font-variant-numeric:tabular-nums;">${index + 1}</span>
                <button class="reorder-btn btn-move-down" data-id="${l.id}" ${isLast ? 'disabled' : ''} title="Move down in ${esc(s.name)}">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
            </td>
            <td>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="font-weight:700; color:#0F172A; font-size:0.92rem; display:flex; align-items:center; gap:6px;">
                  <span>${esc(l.name)}</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:2px;">
                  ${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:#2563EB; text-decoration:none; display:inline-flex; align-items:center; gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Website ↗</a>` : ''}
                  ${l.email ? `<a href="mailto:${esc(l.email)}" style="font-size:0.78rem; color:#047857; text-decoration:none; display:inline-flex; align-items:center; gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email</a>` : ''}
                </div>
              </div>
            </td>
            ${currentNeighborhood === 'all' ? `
              <td>
                <span class="pill-tag neighborhood">${esc(formatNeighborhood(l.neighborhood_slug))}</span>
              </td>
            ` : ''}
            <td>
              <a href="tel:${esc(l.phone)}" style="font-size:0.85rem; color:#0F172A; font-weight:600; text-decoration:none; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                ${esc(l.phone || '—')}
              </a>
            </td>
            <td>
              <div style="max-width:260px; font-size:0.82rem; color:#475569; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${esc(l.note || '')}">
                ${esc(l.note || '—')}
              </div>
            </td>
            <td style="text-align:center; width:120px;">
              <button class="btn-toggle-featured" data-id="${l.id}" data-featured="${l.featured ? 'true' : 'false'}" style="background:none; border:none; cursor:pointer; padding:0;" title="Click to toggle featured status">
                ${l.featured 
                  ? '<span class="pill-tag featured" style="font-weight:700; background:#FEF3C7; color:#92400E; border:1px solid #FDE68A; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Featured</span>' 
                  : '<span class="pill-tag" style="background:#F8FAFC; color:#64748B; border:1px solid #CBD5E1; padding:3px 8px; border-radius:6px; font-weight:500;">Standard</span>'}
              </button>
            </td>
            <td style="text-align:right; width:150px;">
              <div style="display:inline-flex; gap:6px; justify-content:flex-end; align-items:center;">
                <button class="btn-action-edit btn-edit-listing" data-id="${l.id}" title="Edit listing">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  Edit
                </button>
                <button class="btn-action-danger btn-delete-listing" data-id="${l.id}" title="Delete listing">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      groupSubsHtml += `
        <div class="subcat-block">
          <div class="subcat-header-bar">
            <div class="subcat-title">
              <span>${esc(s.name)}</span>
              <span class="pill-tag category" style="font-weight:600;">${subListings.length} listing${subListings.length !== 1 ? 's' : ''}</span>
            </div>
            <button class="btn-secondary btn-add-to-subcat" data-subcat-id="${s.id}" data-subcat-name="${esc(s.name)}" style="padding:4px 12px; font-size:0.8rem; font-weight:600;">
              + Add Listing
            </button>
          </div>
          <div class="admin-table-container" style="border:1px solid #E2E8F0; border-radius:10px;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th style="width:65px; text-align:center;">Order</th>
                  <th style="width:230px;">Business / Pro Name</th>
                  ${currentNeighborhood === 'all' ? '<th style="width:130px;">Neighborhood</th>' : ''}
                  <th style="width:150px;">Contact Phone</th>
                  <th style="min-width:180px;">Description / Notes</th>
                  <th style="width:120px; text-align:center;">Featured</th>
                  <th style="width:150px; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    if (searchKeyword && groupListingsCount === 0) return;

    totalMatchingGroups++;
    renderedGroupsHtml += `
      <div class="group-card" data-group-id="${g.id}">
        <div class="group-card-header group-toggle-header" data-group-id="${g.id}" style="cursor:pointer;">
          <h3>
            <span class="group-collapse-arrow" style="font-size:0.8rem; color:#64748B; transition:transform 150ms ease;">▼</span>
            <span>${esc(g.label)}</span>
            <span class="pill-tag" style="background:#FFFFFF; border:1px solid #CBD5E1; color:#475569; font-size:0.75rem; font-weight:700;">${groupListingsCount} listings</span>
          </h3>
          <span style="font-size:0.8rem; color:#64748B; font-weight:500;">Click to expand/collapse</span>
        </div>
        <div class="group-card-content" id="group-content-${g.id}">
          ${groupSubsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = renderedGroupsHtml || `
    <div class="admin-card" style="text-align:center; padding:40px 20px; color:#64748B;">
      No matching groups or listings found.
    </div>
  `;

  wireListingInteractions();
}

function wireListingInteractions() {
  const container = document.getElementById('groupedDirectoryContainer');
  if (!container) return;

  container.querySelectorAll('.group-toggle-header').forEach((header) => {
    header.addEventListener('click', () => {
      const groupId = header.dataset.groupId;
      const content = document.getElementById(`group-content-${groupId}`);
      const arrow = header.querySelector('.group-collapse-arrow');
      if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
      }
    });
  });

  container.querySelectorAll('.btn-add-to-subcat').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subcatId = btn.dataset.subcatId;
      const addModal = document.getElementById('addListingModal');
      if (addModal) {
        const addListSubcat = document.getElementById('addListSubcat');
        const addListNeighborhood = document.getElementById('addListNeighborhood');
        if (addListSubcat) addListSubcat.value = subcatId;
        if (addListNeighborhood && currentNeighborhood !== 'all') {
          addListNeighborhood.value = currentNeighborhood;
        }
        addModal.style.display = 'flex';
        trapFocus(addModal, closeAddListingModal);
      }
    });
  });

  container.querySelectorAll('.btn-toggle-featured').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const isCurFeatured = btn.dataset.featured === 'true';
      const newFeatured = !isCurFeatured;

      const { error } = await supabase.from('listings').update({ featured: newFeatured }).eq('id', id);
      if (error) {
        showToast('Failed to update featured status: ' + error.message, true);
        return;
      }
      const item = allListings.find((x) => x.id === id);
      if (item) item.featured = newFeatured;
      updateKPIs();
      renderGroupedListings();
      markPublishPending();
      showToast(`Listing marked as ${newFeatured ? 'Featured (Always on Top)' : 'Standard'}`);
    });
  });

  container.querySelectorAll('.btn-move-up').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const cur = allListings.find((x) => x.id === id);
      if (!cur) return;

      const siblings = allListings.filter((x) => 
        x.subcategory_id === cur.subcategory_id && 
        x.neighborhood_slug === cur.neighborhood_slug && 
        x.featured === cur.featured
      );
      siblings.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const idx = siblings.findIndex((x) => x.id === id);
      if (idx <= 0) return;

      const prev = siblings[idx - 1];
      const curOrder = cur.sort_order ?? 0;
      const prevOrder = prev.sort_order ?? 0;
      const newCurOrder = prevOrder > curOrder ? prevOrder : prevOrder - 1;
      const newPrevOrder = curOrder < prevOrder ? curOrder : prevOrder + 1;

      await Promise.all([
        supabase.from('listings').update({ sort_order: newCurOrder }).eq('id', cur.id),
        supabase.from('listings').update({ sort_order: newPrevOrder }).eq('id', prev.id),
      ]);

      cur.sort_order = newCurOrder;
      prev.sort_order = newPrevOrder;

      renderGroupedListings();
      markPublishPending();
      showToast(`Updated order for "${cur.name}"`);
    });
  });

  container.querySelectorAll('.btn-move-down').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const cur = allListings.find((x) => x.id === id);
      if (!cur) return;

      const siblings = allListings.filter((x) => 
        x.subcategory_id === cur.subcategory_id && 
        x.neighborhood_slug === cur.neighborhood_slug && 
        x.featured === cur.featured
      );
      siblings.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const idx = siblings.findIndex((x) => x.id === id);
      if (idx === -1 || idx >= siblings.length - 1) return;

      const next = siblings[idx + 1];
      const curOrder = cur.sort_order ?? 0;
      const nextOrder = next.sort_order ?? 0;
      const newCurOrder = nextOrder < curOrder ? nextOrder : nextOrder + 1;
      const newNextOrder = curOrder > nextOrder ? curOrder : nextOrder - 1;

      await Promise.all([
        supabase.from('listings').update({ sort_order: newCurOrder }).eq('id', cur.id),
        supabase.from('listings').update({ sort_order: newNextOrder }).eq('id', next.id),
      ]);

      cur.sort_order = newCurOrder;
      next.sort_order = newNextOrder;

      renderGroupedListings();
      markPublishPending();
      showToast(`Updated order for "${cur.name}"`);
    });
  });

  container.querySelectorAll('.btn-edit-listing').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const l = allListings.find((x) => x.id === id);
      if (!l) return;

      document.getElementById('editListId').value = l.id;
      document.getElementById('editListNeighborhood').value = l.neighborhood_slug || 'onion-creek';
      document.getElementById('editListSubcat').value = l.subcategory_id;
      document.getElementById('editListName').value = l.name || '';
      document.getElementById('editListPhone').value = l.phone || '';
      document.getElementById('editListEmail').value = l.email || '';
      document.getElementById('editListWebsite').value = l.website || '';
      document.getElementById('editListNote').value = l.note || '';
      document.getElementById('editListSortOrder').value = l.sort_order ?? 0;
      document.getElementById('editListFeatured').checked = l.featured || false;

      const editModal = document.getElementById('editListingModal');
      if (editModal) {
        editModal.style.display = 'flex';
        trapFocus(editModal, closeEditListingModal);
      }
    });
  });

  container.querySelectorAll('.btn-delete-listing').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      if (!(await confirmDialog('Delete this business listing permanently?'))) return;
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) {
        showToast('Failed to delete listing: ' + error.message, true);
        return;
      }
      allListings = allListings.filter((l) => l.id !== id);
      updateKPIs();
      renderGroupedListings();
      markPublishPending();
      showToast('Listing deleted successfully.');
    });
  });
}

function closeEditListingModal() {
  const editListingModal = document.getElementById('editListingModal');
  if (editListingModal) editListingModal.style.display = 'none';
  releaseFocus();
}

function closeAddListingModal() {
  const addListingModal = document.getElementById('addListingModal');
  if (addListingModal) addListingModal.style.display = 'none';
  releaseFocus();
}

function renderGroups() {
  const el = document.getElementById('groupsList');
  if (!el) return;

  el.innerHTML = groups.map((g) => `
    <div class="dir-group" data-id="${g.id}" style="margin-bottom:16px; padding:16px; background:#F8FAFC; border-radius:8px; border:1px solid #E4E4E7;">
      <h3 style="display:flex; justify-content:space-between; align-items:center; margin:0 0 12px 0; font-size:1.05rem;">
        <span style="font-weight:700; color:#18181B;">${esc(g.label)} <small style="color:#71717A; font-size:0.8rem; font-weight:400;">(${esc(g.slug)})</small></span>
      </h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${subcategories.filter((s) => s.group_id === g.id).map((s) => renderSubcatRow(s)).join('')}
      </div>
      <div class="dir-row" style="margin-top:12px; display:flex; gap:8px;">
        <input type="text" class="admin-input new-subcat-name" placeholder="New subcategory name" data-group-id="${g.id}" style="margin-bottom:0;" />
        <button class="btn-secondary add-subcat" data-group-id="${g.id}">+ Add Subcategory</button>
      </div>
    </div>
  `).join('');

  wireGroupListeners();
}

function renderSubcatRow(s) {
  return `
    <div class="subcat-admin-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:white; border-radius:6px; border:1px solid #E4E4E7;" data-id="${s.id}">
      <span style="font-weight:600; font-size:0.88rem; color:#18181B;">
        ${esc(s.name)}
      </span>
      <div style="display:flex; gap:12px; align-items:center;">
        ${NEIGHBORHOODS.map((n) => {
          const checked = neighborhoodSubcats.some((ns) => ns.neighborhood_slug === n.slug && ns.subcategory_id === s.id);
          return `
            <label style="font-size:0.75rem; color:#71717A; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" class="toggle-subcat-neighborhood" data-subcat-id="${s.id}" data-neighborhood="${n.slug}" ${checked ? 'checked' : ''} />
              ${esc(n.name.split(' ')[0])}
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function wireGroupListeners() {
  document.querySelectorAll('.toggle-subcat-neighborhood').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const subcatId = Number(cb.dataset.subcatId);
      const neighborhood = cb.dataset.neighborhood;
      if (cb.checked) {
        const { error } = await supabase.from('neighborhood_subcategories').insert({ neighborhood_slug: neighborhood, subcategory_id: subcatId });
        if (!error) neighborhoodSubcats.push({ neighborhood_slug: neighborhood, subcategory_id: subcatId });
      } else {
        const { error } = await supabase.from('neighborhood_subcategories').delete().eq('neighborhood_slug', neighborhood).eq('subcategory_id', subcatId);
        if (!error) neighborhoodSubcats = neighborhoodSubcats.filter((ns) => !(ns.neighborhood_slug === neighborhood && ns.subcategory_id === subcatId));
      }
      showToast('Neighborhood category settings updated');
    });
  });

  document.querySelectorAll('.add-subcat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const groupId = Number(btn.dataset.groupId);
      const input = document.querySelector(`.new-subcat-name[data-group-id="${groupId}"]`);
      const name = input?.value.trim();
      if (!name) return;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data, error } = await supabase.from('subcategories').insert({
        group_id: groupId,
        name,
        slug,
        icon: '',
        sort_order: subcategories.length
      }).select('*').single();

      if (error) {
        showToast('Failed to add subcategory: ' + error.message, true);
        return;
      }

      subcategories.push(data);
      input.value = '';
      populateCategorySelects();
      renderGroups();
      showToast(`Added subcategory "${name}"`);
    });
  });
}

function wireDirectory() {
  const neighborhoodSegmentedBar = document.getElementById('neighborhoodSegmentedBar');
  const subTabListingsBtn = document.getElementById('subTabListingsBtn');
  const subTabCategoriesBtn = document.getElementById('subTabCategoriesBtn');
  const dirListingsView = document.getElementById('dir-listings');
  const dirCategoriesView = document.getElementById('dir-categories');
  const dirListingActions = document.getElementById('dirListingActions');
  const dirCategoryActions = document.getElementById('dirCategoryActions');

  const collapseAllBtn = document.getElementById('toggleExpandAllBtn');
  const dirCategoryFilter = document.getElementById('dirCategoryFilter');
  const dirSearch = document.getElementById('dirSearch');
  const refreshListingsBtn = document.getElementById('refreshListingsBtn');

  const openAddListingModalBtn = document.getElementById('openAddListingModalBtn');
  const closeAddListingModalBtn = document.getElementById('closeAddListingModalBtn');
  const addListingModal = document.getElementById('addListingModal');
  const addListingForm = document.getElementById('addListingForm');

  const editListingModal = document.getElementById('editListingModal');
  const closeEditListingModalBtn = document.getElementById('closeEditListingModalBtn');
  const editListingForm = document.getElementById('editListingForm');

  neighborhoodSegmentedBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('button.segmented-item');
    if (!btn) return;
    neighborhoodSegmentedBar.querySelectorAll('button.segmented-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentNeighborhood = btn.dataset.neighborhood || 'all';
    populateCategorySelects();
    renderGroupedListings();
  });

  subTabListingsBtn?.addEventListener('click', () => {
    subTabListingsBtn.classList.add('active');
    subTabCategoriesBtn.classList.remove('active');
    if (dirListingsView) dirListingsView.style.display = 'block';
    if (dirCategoriesView) dirCategoriesView.style.display = 'none';
    if (dirListingActions) dirListingActions.style.display = 'block';
    if (dirCategoryActions) dirCategoryActions.style.display = 'none';
  });

  subTabCategoriesBtn?.addEventListener('click', () => {
    subTabCategoriesBtn.classList.add('active');
    subTabListingsBtn.classList.remove('active');
    if (dirCategoriesView) dirCategoriesView.style.display = 'block';
    if (dirListingsView) dirListingsView.style.display = 'none';
    if (dirCategoryActions) dirCategoryActions.style.display = 'block';
    if (dirListingActions) dirListingActions.style.display = 'none';
  });

  collapseAllBtn?.addEventListener('click', () => {
    allCollapsed = !allCollapsed;
    collapseAllBtn.textContent = allCollapsed ? 'Expand All Groups' : 'Collapse All Groups';
    document.querySelectorAll('.group-card-content').forEach((el) => {
      el.style.display = allCollapsed ? 'none' : 'block';
    });
    document.querySelectorAll('.group-collapse-arrow').forEach((arrow) => {
      arrow.style.transform = allCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    });
  });

  dirCategoryFilter?.addEventListener('change', renderGroupedListings);
  dirSearch?.addEventListener('input', renderGroupedListings);
  refreshListingsBtn?.addEventListener('click', async () => {
    await loadAllListings();
    renderGroupedListings();
  });

  openAddListingModalBtn?.addEventListener('click', () => {
    if (addListingModal) {
      const addListNeighborhood = document.getElementById('addListNeighborhood');
      if (addListNeighborhood && currentNeighborhood !== 'all') {
        addListNeighborhood.value = currentNeighborhood;
      }
      addListingModal.style.display = 'flex';
      trapFocus(addListingModal, closeAddListingModal);
    }
  });

  closeAddListingModalBtn?.addEventListener('click', closeAddListingModal);
  addListingModal?.addEventListener('click', (e) => {
    if (e.target === addListingModal) closeAddListingModal();
  });

  // Guards against the double-insert bug this file used to have: the form's
  // own listener is now bound at most once (see bootAdminPage), but this flag
  // also stops a double-click or a slow network response from firing two
  // inserts for one submit, and the unique index on `listings` is the final
  // backstop if both of those somehow still race.
  let isAddingListing = false;

  addListingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isAddingListing) return;
    isAddingListing = true;

    const submitBtn = addListingForm.querySelector('button[type="submit"]');
    const originalLabel = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
    }

    const resetSubmitState = () => {
      isAddingListing = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    };

    const neighborhood_slug = document.getElementById('addListNeighborhood')?.value;
    const subcategory_id = Number(document.getElementById('addListSubcat')?.value);
    const name = document.getElementById('addListName')?.value.trim();
    const phone = document.getElementById('addListPhone')?.value.trim();
    const email = document.getElementById('addListEmail')?.value.trim() || null;
    const website = document.getElementById('addListWebsite')?.value.trim() || null;
    const note = document.getElementById('addListNote')?.value.trim() || '';
    const featured = document.getElementById('addListFeatured')?.checked || false;
    const position = document.getElementById('addListPosition')?.value || 'top';

    if (!name || !phone || !subcategory_id || !neighborhood_slug) {
      showToast('Please complete all required fields.', true);
      resetSubmitState();
      return;
    }

    let sort_order = 0;
    const sameGroup = allListings.filter((x) => x.neighborhood_slug === neighborhood_slug && x.subcategory_id === subcategory_id);
    if (sameGroup.length > 0) {
      const orders = sameGroup.map((x) => x.sort_order ?? 0);
      if (position === 'bottom') {
        sort_order = Math.max(...orders, 0) + 1;
      } else {
        sort_order = Math.min(...orders, 0) - 1;
      }
    }

    const { data, error } = await supabase.from('listings').insert({
      neighborhood_slug,
      subcategory_id,
      name,
      phone,
      email,
      website,
      note,
      featured,
      sort_order
    }).select('*').single();

    resetSubmitState();

    if (error) {
      if (error.code === '23505') {
        showToast('That listing already exists in this category for this neighborhood.', true);
      } else {
        showToast('Failed to add business listing: ' + error.message, true);
      }
      return;
    }

    if (data) {
      allListings.unshift(data);
    }
    closeAddListingModal();
    addListingForm.reset();
    updateKPIs();
    renderGroupedListings();
    markPublishPending();
    showToast(`Added "${name}" to directory`);
  });

  closeEditListingModalBtn?.addEventListener('click', closeEditListingModal);
  editListingModal?.addEventListener('click', (e) => {
    if (e.target === editListingModal) closeEditListingModal();
  });

  let isEditingListing = false;

  editListingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isEditingListing) return;
    isEditingListing = true;

    const id = Number(document.getElementById('editListId').value);
    const saveBtn = document.getElementById('saveEditListingBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    const updates = {
      neighborhood_slug: document.getElementById('editListNeighborhood').value,
      subcategory_id: Number(document.getElementById('editListSubcat').value),
      name: document.getElementById('editListName').value.trim(),
      phone: document.getElementById('editListPhone').value.trim(),
      email: document.getElementById('editListEmail').value.trim() || null,
      website: document.getElementById('editListWebsite').value.trim() || null,
      note: document.getElementById('editListNote').value.trim(),
      sort_order: Number(document.getElementById('editListSortOrder').value) || 0,
      featured: document.getElementById('editListFeatured').checked,
    };

    const { data, error } = await supabase.from('listings').update(updates).eq('id', id).select('*').single();

    isEditingListing = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }

    if (error) {
      if (error.code === '23505') {
        showToast('Another listing already matches that name, phone, category, and neighborhood.', true);
      } else {
        showToast('Failed to update listing: ' + error.message, true);
      }
      return;
    }

    const idx = allListings.findIndex((x) => x.id === id);
    if (idx !== -1 && data) {
      allListings[idx] = data;
    }
    closeEditListingModal();
    updateKPIs();
    renderGroupedListings();
    markPublishPending();
    showToast('Listing updated successfully.');
  });
}

// Fetches taxonomy + listings and re-renders. Safe to call more than once
// (e.g. once at initial load, again after admin-auth-verified) — loadDirectoryData()
// already skips its own refetch once populated, and bootAdminPage coalesces
// any calls that land while a previous one is still in flight.
async function loadDirectory() {
  await Promise.all([loadDirectoryData(), loadAllListings()]);

  const neighborhoodSegmentedBar = document.getElementById('neighborhoodSegmentedBar');
  if (neighborhoodSegmentedBar) {
    neighborhoodSegmentedBar.querySelectorAll('button.segmented-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.neighborhood === currentNeighborhood);
    });
  }
  renderGroups();
  populateNeighborhoodSelects();
  populateCategorySelects();
  renderGroupedListings();
}

bootAdminPage('groupedDirectoryContainer', { wire: wireDirectory, load: loadDirectory });
