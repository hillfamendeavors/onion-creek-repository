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
        <input type="text" class="new-subcat-name" placeholder="New subcategory name" data-group-id="${g.id}" />
        <button class="icon-btn add-subcat" data-group-id="${g.id}">+ Add Subcategory</button>
      </div>
    </div>
  `).join('') + `
    <div class="dir-row" style="margin-top:16px;">
      <input type="text" id="newGroupSlug" placeholder="slug (e.g. home)" />
      <input type="text" id="newGroupLabel" placeholder="Label (e.g. Home & Repair)" />
      <input type="text" id="newGroupIcon" placeholder="Icon" style="width:60px;" />
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
            ${esc(n.name)}
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

document.getElementById('addGroupBtn').addEventListener('click', async () => {
  const slug = document.getElementById('newGroupSlug').value.trim();
  const label = document.getElementById('newGroupLabel').value.trim();
  const icon = document.getElementById('newGroupIcon').value.trim();
  if (!slug || !label) { alert('Slug and label are required.'); return; }
  const { error } = await supabase.from('groups').insert({ slug, label, icon, sort_order: groups.length });
  if (error) { alert('Failed to add group. Slug may already be in use.'); return; }
  await loadDirectoryData();
  renderGroups();
  triggerRebuild();
});

document.getElementById('subTabCategoriesBtn').addEventListener('click', () => {
  document.getElementById('subTabCategoriesBtn').classList.add('active');
  document.getElementById('subTabListingsBtn').classList.remove('active');
  document.getElementById('dir-categories').style.display = 'block';
  document.getElementById('dir-listings').style.display = 'none';
});

document.getElementById('subTabListingsBtn').addEventListener('click', () => {
  document.getElementById('subTabListingsBtn').classList.add('active');
  document.getElementById('subTabCategoriesBtn').classList.remove('active');
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

async function loadListingsFor(neighborhoodSlug) {
  const { data } = await supabase.from('listings').select('*').eq('neighborhood_slug', neighborhoodSlug).order('sort_order');
  listings = data || [];
}

async function renderListings() {
  const slug = document.getElementById('dirNeighborhood').value;
  await loadListingsFor(slug);

  const enabledSubIds = new Set(
    neighborhoodSubcats.filter((ns) => ns.neighborhood_slug === slug).map((ns) => ns.subcategory_id)
  );

  const el = document.getElementById('listingsBySubcat');
  el.innerHTML = groups.map((g) => {
    const subs = subcategories.filter((s) => s.group_id === g.id && enabledSubIds.has(s.id));
    if (subs.length === 0) return '';
    return `
      <div class="dir-group">
        <h3><span>${esc(g.icon)} ${esc(g.label)}</span></h3>
        ${subs.map((s) => renderListingSubcat(s, slug)).join('')}
      </div>
    `;
  }).join('');

  wireListingHandlers(slug);
}

function renderListingSubcat(s, slug) {
  const rows = listings.filter((l) => l.subcategory_id === s.id);
  return `
    <div class="dir-subcat">
      <h4><span>${esc(s.name)} (${rows.length})</span></h4>
      ${rows.map((l) => `
        <div class="dir-row" data-id="${l.id}">
          <input type="text" class="name" value="${esc(l.name)}" data-field="name" />
          <input type="tel" value="${esc(l.phone)}" data-field="phone" style="width:130px;" />
          <input type="text" class="note" value="${esc(l.note)}" data-field="note" />
          <input type="email" value="${esc(l.email || '')}" data-field="email" placeholder="email" style="width:140px;" />
          <input type="url" value="${esc(l.website || '')}" data-field="website" placeholder="website" style="width:140px;" />
          <label><input type="checkbox" data-field="featured" ${l.featured ? 'checked' : ''} /> Featured</label>
          <button class="icon-btn save-listing" data-id="${l.id}">Save</button>
          <button class="icon-btn danger delete-listing" data-id="${l.id}">Delete</button>
        </div>
      `).join('')}
      <div class="dir-row new-listing" data-subcat-id="${s.id}">
        <input type="text" class="name" placeholder="Business name" data-field="name" />
        <input type="tel" placeholder="Phone" data-field="phone" style="width:130px;" />
        <input type="text" class="note" placeholder="Note / recommendation" data-field="note" />
        <button class="icon-btn add-listing" data-subcat-id="${s.id}" data-neighborhood="${slug}">+ Add</button>
      </div>
    </div>
  `;
}

function wireListingHandlers(slug) {
  document.getElementById('listingsBySubcat').querySelectorAll('.save-listing').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.dir-row');
      const fields = {};
      row.querySelectorAll('[data-field]').forEach((input) => {
        const key = input.dataset.field;
        fields[key] = input.type === 'checkbox' ? input.checked : input.value.trim() || null;
      });
      if (!fields.name || !fields.phone) { alert('Name and phone are required.'); return; }
      const { error } = await supabase.from('listings').update(fields).eq('id', Number(btn.dataset.id));
      if (error) { alert('Failed to save listing.'); return; }
      triggerRebuild();
      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.textContent = 'Save'; }, 1500);
    });
  });

  document.getElementById('listingsBySubcat').querySelectorAll('.delete-listing').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this listing? This cannot be undone.')) return;
      const { error } = await supabase.from('listings').delete().eq('id', Number(btn.dataset.id));
      if (error) { alert('Failed to delete listing.'); return; }
      await renderListings();
      triggerRebuild();
    });
  });

  document.getElementById('listingsBySubcat').querySelectorAll('.add-listing').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.new-listing');
      const fields = {};
      row.querySelectorAll('[data-field]').forEach((input) => { fields[input.dataset.field] = input.value.trim() || null; });
      if (!fields.name || !fields.phone) { alert('Name and phone are required.'); return; }
      const { error } = await supabase.from('listings').insert({
        ...fields,
        subcategory_id: Number(btn.dataset.subcatId),
        neighborhood_slug: btn.dataset.neighborhood,
      });
      if (error) { alert('Failed to add listing.'); return; }
      await renderListings();
      triggerRebuild();
    });
  });
}
