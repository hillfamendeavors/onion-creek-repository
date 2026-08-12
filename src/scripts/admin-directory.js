import { supabase } from '../lib/supabase.js';

const NEIGHBORHOODS = [
  { slug: 'avery-ranch', name: 'Avery Ranch' },
  { slug: 'circle-c', name: 'Circle C' },
  { slug: 'onion-creek', name: 'Onion Creek' },
  { slug: 'sunfield', name: 'Sunfield, Buda' },
];

let groups = [];
let subcategories = [];
let neighborhoodSubcats = [];
let loaded = false;

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function triggerRebuild() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  try {
    await fetch('/.netlify/functions/trigger-rebuild', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch (e) {
    // Save already succeeded in the database; a failed rebuild ping just means
    // the live site is stale until the next save or a manual Netlify redeploy.
  }
}

async function loadDirectoryData() {
  const [g, s, ns] = await Promise.all([
    supabase.from('groups').select('*').order('sort_order'),
    supabase.from('subcategories').select('*').order('sort_order'),
    supabase.from('neighborhood_subcategories').select('*'),
  ]);
  groups = g.data || [];
  subcategories = s.data || [];
  neighborhoodSubcats = ns.data || [];
}

window.addEventListener('directory-tab-shown', async () => {
  if (loaded) return;
  loaded = true;
  await loadDirectoryData();
  renderGroups();
  populateNeighborhoodSelect();
});

function renderGroups() {
  const el = document.getElementById('groupsList');
  el.innerHTML = groups.map((g) => `
    <div class="dir-group" data-id="${g.id}">
      <h3>
        <span>${esc(g.icon)} ${esc(g.label)} <small>(${esc(g.slug)})</small></span>
        <span>
          <button class="icon-btn edit-group" data-id="${g.id}">Edit</button>
          <button class="icon-btn danger delete-group" data-id="${g.id}">Delete</button>
        </span>
      </h3>
      ${subcategories.filter((s) => s.group_id === g.id).map((s) => renderSubcatRow(s)).join('')}
      <div class="dir-row">
        <input type="text" class="input new-subcat-name" placeholder="New subcategory name" data-group-id="${g.id}" />
        <button class="icon-btn add-subcat" data-group-id="${g.id}">+ Add Subcategory</button>
      </div>
    </div>
  `).join('') + `
    <div class="dir-row" style="margin-top:16px;">
      <input type="text" class="input" id="newGroupSlug" placeholder="slug (e.g. home)" />
      <input type="text" class="input" id="newGroupLabel" placeholder="Label (e.g. Home & Repair)" />
      <input type="text" class="input" id="newGroupIcon" placeholder="Icon" style="width:60px;" />
    </div>
  `;
  wireGroupHandlers();
}

function renderSubcatRow(s) {
  const enabled = new Set(neighborhoodSubcats.filter((ns) => ns.subcategory_id === s.id).map((ns) => ns.neighborhood_slug));
  return `
    <div class="dir-subcat" data-id="${s.id}">
      <h4>
        <span>${esc(s.name)}</span>
        <button class="icon-btn danger delete-subcat" data-id="${s.id}">Delete</button>
      </h4>
      <div class="nb-checks">
        ${NEIGHBORHOODS.map((n) => `
          <label>
            <input type="checkbox" class="nb-toggle" data-subcat-id="${s.id}" data-neighborhood="${n.slug}" ${enabled.has(n.slug) ? 'checked' : ''} />
            <span>${esc(n.name)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function wireGroupHandlers() {
  document.getElementById('groupsList').querySelectorAll('.edit-group').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const g = groups.find((x) => x.id === Number(btn.dataset.id));
      const label = prompt('Group label:', g.label);
      if (label === null) return;
      const icon = prompt('Group icon:', g.icon) ?? g.icon;
      const { error } = await supabase.from('groups').update({ label, icon }).eq('id', g.id);
      if (error) { alert('Failed to update group.'); return; }
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.delete-group').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this group and every subcategory/listing under it? This cannot be undone.')) return;
      const { error } = await supabase.from('groups').delete().eq('id', Number(btn.dataset.id));
      if (error) { alert('Failed to delete group.'); return; }
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.add-subcat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const input = document.querySelector(`.new-subcat-name[data-group-id="${btn.dataset.groupId}"]`);
      const name = input.value.trim();
      if (!name) return;
      const { error } = await supabase.from('subcategories').insert({ group_id: Number(btn.dataset.groupId), name });
      if (error) { alert('Failed to add subcategory.'); return; }
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.delete-subcat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this subcategory and every listing under it? This cannot be undone.')) return;
      const { error } = await supabase.from('subcategories').delete().eq('id', Number(btn.dataset.id));
      if (error) { alert('Failed to delete subcategory.'); return; }
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.nb-toggle').forEach((box) => {
    box.addEventListener('change', async () => {
      const subcategory_id = Number(box.dataset.subcatId);
      const neighborhood_slug = box.dataset.neighborhood;
      const { error } = box.checked
        ? await supabase.from('neighborhood_subcategories').insert({ subcategory_id, neighborhood_slug })
        : await supabase.from('neighborhood_subcategories').delete().eq('subcategory_id', subcategory_id).eq('neighborhood_slug', neighborhood_slug);
      if (error) { alert('Failed to update.'); box.checked = !box.checked; return; }
      await loadDirectoryData();
      triggerRebuild();
    });
  });
}

document.getElementById('addGroupBtn')?.addEventListener('click', async () => {
  const slug = document.getElementById('newGroupSlug')?.value?.trim();
  const label = document.getElementById('newGroupLabel')?.value?.trim();
  const icon = document.getElementById('newGroupIcon')?.value?.trim();
  if (!slug || !label) { alert('Slug and label are required.'); return; }
  const { error } = await supabase.from('groups').insert({ slug, label, icon, sort_order: groups.length });
  if (error) { alert('Failed to add group. Slug may already be in use.'); return; }
  await loadDirectoryData();
  renderGroups();
  triggerRebuild();
});

document.getElementById('subTabCategoriesBtn')?.addEventListener('click', () => {
  document.getElementById('subTabCategoriesBtn')?.classList.add('active');
  document.getElementById('subTabListingsBtn')?.classList.remove('active');
  document.getElementById('dir-categories').style.display = 'block';
  document.getElementById('dir-listings').style.display = 'none';
});

document.getElementById('subTabListingsBtn')?.addEventListener('click', () => {
  document.getElementById('subTabListingsBtn')?.classList.add('active');
  document.getElementById('subTabCategoriesBtn')?.classList.remove('active');
  document.getElementById('dir-listings').style.display = 'block';
  document.getElementById('dir-categories').style.display = 'none';
});

function populateNeighborhoodSelect() {
  const sel = document.getElementById('dirNeighborhood');
  sel.innerHTML = NEIGHBORHOODS.map((n) => `<option value="${n.slug}">${esc(n.name)}</option>`).join('');
  sel.addEventListener('change', renderListings);
  renderListings();
}

let listings = [];

let allListings = [];

async function loadAllListings() {
  const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (!error && data) {
    allListings = data;
  }
}

window.addEventListener('directory-tab-shown', async () => {
  if (loaded) return;
  loaded = true;
  await loadDirectoryData();
  await loadAllListings();
  renderGroups();
  populateNeighborhoodSelects();
  populateCategorySelects();
  renderListingsTable();
});

// Subtab switching
const subTabListingsBtn = document.getElementById('subTabListingsBtn');
const subTabCategoriesBtn = document.getElementById('subTabCategoriesBtn');
const dirListingsView = document.getElementById('dir-listings');
const dirCategoriesView = document.getElementById('dir-categories');

subTabListingsBtn?.addEventListener('click', () => {
  subTabListingsBtn.classList.add('active');
  subTabListingsBtn.style.background = 'var(--color-border)';
  subTabCategoriesBtn.classList.remove('active');
  subTabCategoriesBtn.style.background = 'transparent';
  if (dirListingsView) dirListingsView.style.display = 'block';
  if (dirCategoriesView) dirCategoriesView.style.display = 'none';
});

subTabCategoriesBtn?.addEventListener('click', () => {
  subTabCategoriesBtn.classList.add('active');
  subTabCategoriesBtn.style.background = 'var(--color-border)';
  subTabListingsBtn.classList.remove('active');
  subTabListingsBtn.style.background = 'transparent';
  if (dirCategoriesView) dirCategoriesView.style.display = 'block';
  if (dirListingsView) dirListingsView.style.display = 'none';
});

function populateNeighborhoodSelects() {
  const dirNeighborhood = document.getElementById('dirNeighborhood');
  const addListNeighborhood = document.getElementById('addListNeighborhood');
  
  const optionsHtml = '<option value="">All Neighborhoods</option>' +
    NEIGHBORHOODS.map((n) => `<option value="${esc(n.slug)}">${esc(n.name)}</option>`).join('');

  if (dirNeighborhood) dirNeighborhood.innerHTML = optionsHtml;
  if (addListNeighborhood) addListNeighborhood.innerHTML = NEIGHBORHOODS.map((n) => `<option value="${esc(n.slug)}">${esc(n.name)}</option>`).join('');
}

function populateCategorySelects() {
  const dirCategoryFilter = document.getElementById('dirCategoryFilter');
  const addListSubcat = document.getElementById('addListSubcat');

  if (dirCategoryFilter) {
    dirCategoryFilter.innerHTML = '<option value="">All Categories</option>' +
      subcategories.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  }

  if (addListSubcat) {
    addListSubcat.innerHTML = subcategories.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  }
}

function renderListingsTable() {
  const listingsBody = document.getElementById('listingsBody');
  if (!listingsBody) return;

  const selectedNeighborhood = document.getElementById('dirNeighborhood')?.value || '';
  const selectedCategory = document.getElementById('dirCategoryFilter')?.value || '';
  const searchKeyword = (document.getElementById('dirSearch')?.value || '').toLowerCase().trim();

  const filtered = allListings.filter((l) => {
    const matchNeighborhood = !selectedNeighborhood || l.neighborhood_slug === selectedNeighborhood;
    const matchCategory = !selectedCategory || String(l.subcategory_id) === String(selectedCategory);
    const matchSearch = !searchKeyword ||
      (l.name && l.name.toLowerCase().includes(searchKeyword)) ||
      (l.phone && l.phone.includes(searchKeyword)) ||
      (l.note && l.note.toLowerCase().includes(searchKeyword));
    return matchNeighborhood && matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    listingsBody.innerHTML = `<tr><td colspan="7">No listings found matching criteria.</td></tr>`;
    return;
  }

  const subcatMap = new Map(subcategories.map((s) => [s.id, s.name]));
  const neighMap = new Map(NEIGHBORHOODS.map((n) => [n.slug, n.name]));

  listingsBody.innerHTML = filtered.map((l) => `
    <tr data-id="${l.id}">
      <td>${esc(neighMap.get(l.neighborhood_slug) || l.neighborhood_slug)}</td>
      <td>${esc(subcatMap.get(l.subcategory_id) || 'General')}</td>
      <td><strong>${esc(l.name)}</strong></td>
      <td>${esc(l.phone)}</td>
      <td>${esc(l.note || '—')}</td>
      <td>${l.featured ? '<span style="background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:12px; font-weight:600; font-size:0.8rem;">Featured ⭐</span>' : '—'}</td>
      <td>
        <button class="btn-danger btn-delete-listing" data-id="${l.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  listingsBody.querySelectorAll('.btn-delete-listing').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      if (!confirm('Delete this business listing permanently?')) return;
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) {
        alert('Failed to delete listing: ' + error.message);
        return;
      }
      allListings = allListings.filter((l) => l.id !== id);
      renderListingsTable();
      triggerRebuild();
    });
  });
}

// Listing Search & Filters
['dirNeighborhood', 'dirCategoryFilter'].forEach((id) => {
  document.getElementById(id)?.addEventListener('change', renderListingsTable);
});
document.getElementById('dirSearch')?.addEventListener('input', renderListingsTable);

// Modal Controls for Add Listing
const openAddListingModalBtn = document.getElementById('openAddListingModalBtn');
const closeAddListingModalBtn = document.getElementById('closeAddListingModalBtn');
const addListingModal = document.getElementById('addListingModal');
const addListingForm = document.getElementById('addListingForm');

openAddListingModalBtn?.addEventListener('click', () => {
  if (addListingModal) addListingModal.style.display = 'flex';
});

closeAddListingModalBtn?.addEventListener('click', () => {
  if (addListingModal) addListingModal.style.display = 'none';
});

addListingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const neighborhood_slug = document.getElementById('addListNeighborhood')?.value;
  const subcategory_id = Number(document.getElementById('addListSubcat')?.value);
  const name = document.getElementById('addListName')?.value.trim();
  const phone = document.getElementById('addListPhone')?.value.trim();
  const email = document.getElementById('addListEmail')?.value.trim() || null;
  const website = document.getElementById('addListWebsite')?.value.trim() || null;
  const note = document.getElementById('addListNote')?.value.trim() || null;
  const featured = document.getElementById('addListFeatured')?.checked || false;

  if (!name || !phone || !subcategory_id || !neighborhood_slug) {
    alert('Please complete all required fields.');
    return;
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
  }).select('*').single();

  if (error) {
    alert('Failed to add business listing: ' + error.message);
    return;
  }

  if (data) {
    allListings.unshift(data);
  }
  if (addListingModal) addListingModal.style.display = 'none';
  addListingForm.reset();
  renderListingsTable();
  triggerRebuild();
});
