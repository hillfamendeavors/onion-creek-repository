# Admin & Scheduler Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete, filter/sort, and email notifications to the existing "Need a Service?" request admin page (`/admin/`).

**Architecture:** All changes are client-side additions to the existing static Astro + Supabase setup, except notifications, which add one Netlify serverless function (`netlify/functions/notify-request.js`) that Supabase calls via a `pg_net`-backed database trigger whenever a new `service_requests` row is inserted. The function calls Resend's HTTP API server-side, so the Resend API key never reaches the browser (mirrors why the Supabase key is safe client-side vs. why Resend's isn't: RLS protects the DB key, but nothing protects a raw Resend key shipped to every visitor).

**Tech Stack:** Astro 5 (static), vanilla client-side JS, Supabase (Postgres + `pg_net` extension + Supabase Auth), Netlify Functions (Node, ESM), Resend API (plain `fetch`, no SDK — one POST call doesn't justify a dependency).

This codebase has no test framework (no Jest/Vitest/pytest anywhere in `package.json`). Per "follow established patterns," these tasks use manual browser + `npm run build` verification instead of automated test steps — consistent with how every existing feature in this repo (referral modal, request modal, admin page) was verified.

## Global Constraints

- No new frontend dependencies beyond what's already installed (`astro`, `@supabase/supabase-js`). Use plain `fetch` for Resend, not the `resend` npm package.
- All Supabase access from the browser continues to go through `src/lib/supabase.js`'s existing `supabase` client — don't create a second client.
- Escape all user-submitted fields (`name`, `notes`, `category`, `neighborhood`, etc.) before interpolating into HTML — these come from public, unauthenticated form submissions (see the existing `esc()` helper in `src/scripts/admin.js` for the established pattern).
- Notification recipients: `hillfamendeavors@gmail.com` and `hillfamilyautofair.marconi@gmail.com`.
- The Netlify Function and Supabase trigger cannot be fully tested end-to-end until Netlify access and a verified Resend sending domain are in place (pending from Sir Seth). Tasks 3 and 4 note this explicitly — write and deploy the code now, verify live once access lands.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/admin.astro` | Modify | Add filter `<select>` controls, sortable `<th>` headers, and a Delete column to the existing table markup. |
| `src/scripts/admin.js` | Modify (full rewrite) | Add client-side filter/sort state and rendering, plus per-row delete. |
| `netlify/functions/notify-request.js` | Create | Netlify serverless function: receives the inserted row from Supabase, sends a notification email via Resend. |
| Supabase SQL (via SQL Editor or `execute_sql`) | Apply | RLS delete policy + `pg_net` trigger that calls the Netlify function on insert. |

---

## Task 1: Delete a request from the admin page

**Files:**
- Modify: `src/scripts/admin.js:60-64` (inside `loadRequests`, after the status-select wiring)
- Apply SQL: Supabase project `Trusted Neighbor` (ref `dktjutawxktwhuhuwbit`)

**Interfaces:**
- Consumes: existing `supabase` client from `src/lib/supabase.js`; existing `esc()` helper; existing `requestsBody` table body element.
- Produces: nothing new consumed by later tasks — this is a self-contained UI addition.

- [ ] **Step 1: Add the DELETE row-level-security policy**

Run this in the Supabase SQL Editor for the `Trusted Neighbor` project (or apply it via the connected Supabase MCP tool):

```sql
create policy "admin can delete requests"
  on service_requests for delete
  to authenticated
  using (true);
```

- [ ] **Step 2: Verify the policy exists**

In Supabase Dashboard → Authentication → Policies (or `select * from pg_policies where tablename = 'service_requests';` in the SQL Editor), confirm a `DELETE` policy named "admin can delete requests" is listed for `service_requests`.

- [ ] **Step 3: Add a Delete column header**

In `src/pages/admin.astro`, in the `<thead><tr>` block, add a final header cell after `<th>Status</th>`:

```astro
            <th>Status</th>
            <th></th>
```

- [ ] **Step 4: Add the delete button to each row and wire its handler**

In `src/scripts/admin.js`, add a `<td>` with a delete button to the row template (inside the template literal in `loadRequests`, right after the `status` `<td>` block, before the closing `` </tr> ``):

```js
      <td>
        <button class="delete-btn" data-id="${r.id}">Delete</button>
      </td>
```

Then, right after the existing `requestsBody.querySelectorAll('select.status').forEach(...)` block (currently ending at line 64), add:

```js
  requestsBody.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this request permanently? This cannot be undone.')) return;
      const { error } = await supabase.from('service_requests').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Failed to delete request.');
        return;
      }
      btn.closest('tr').remove();
    });
  });
```

- [ ] **Step 5: Add minimal styling for the delete button**

In `src/pages/admin.astro`, in the `<style>` block, after the existing `select.status { padding: 4px; }` line, add:

```css
      .delete-btn { padding: 4px 10px; border: 1px solid #b00020; background: #fff; color: #b00020; border-radius: 4px; cursor: pointer; }
      .delete-btn:hover { background: #b00020; color: #fff; }
```

- [ ] **Step 6: Manually verify**

Run `npm run build` (confirm it still succeeds), then `npm run dev`, open `http://localhost:4321/admin/`, log in, click Delete on a test row, confirm the browser `confirm()` prompt appears, accept it, and confirm the row disappears from the table. Refresh the page and confirm the row does not reappear (it's actually gone from Supabase, not just hidden). Check Supabase Table Editor to confirm the row is gone from `service_requests`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin.astro src/scripts/admin.js
git commit -m "feat: add delete button to admin requests table"
```

---

## Task 2: Filter and sort the admin table

**Files:**
- Modify: `src/pages/admin.astro`
- Modify: `src/scripts/admin.js` (full rewrite of the file)

**Interfaces:**
- Consumes: same `supabase` client and `esc()` helper as Task 1. If Task 1 was completed first, this task's full-file rewrite of `admin.js` must preserve the delete button `<td>` and its click handler from Task 1, Step 4.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Add filter controls and sortable headers to the markup**

In `src/pages/admin.astro`, replace the `<div class="topbar">...</div>` block and the `<table>` opening/`<thead>` with:

```astro
      <div class="topbar">
        <h1>Service Requests</h1>
        <button id="logoutBtn">Log Out</button>
      </div>
      <div class="filters">
        <select id="filterNeighborhood"><option value="">All neighborhoods</option></select>
        <select id="filterCategory"><option value="">All categories</option></select>
        <select id="filterStatus">
          <option value="">All statuses</option>
          <option value="new">new</option>
          <option value="contacted">contacted</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th class="sortable" data-sort="created_at">Submitted <span class="arrow"></span></th>
            <th>Neighborhood</th>
            <th>Category</th>
            <th class="sortable" data-sort="date_needed">Date Needed <span class="arrow"></span></th>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Notes</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
```

(This already includes the Delete `<th>` from Task 1, Step 3 — if doing both tasks, only add it once.)

- [ ] **Step 2: Add filter/sort styling**

In the same file's `<style>` block, after `.topbar { ... }`, add:

```css
      .filters { display: flex; gap: 10px; margin-bottom: 12px; }
      .filters select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
      th.sortable { cursor: pointer; user-select: none; }
      th.sortable .arrow { font-size: 0.7em; }
```

- [ ] **Step 3: Rewrite `src/scripts/admin.js` with filter/sort state**

Replace the entire contents of `src/scripts/admin.js` with:

```js
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
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  });
  if (error) {
    loginError.textContent = 'Invalid email or password.';
    return;
  }
  showApp();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) showApp();
});
```

- [ ] **Step 4: Manually verify**

Run `npm run build` to confirm it succeeds. Then `npm run dev`, open `/admin/`, log in, and confirm: the neighborhood/category dropdowns are populated from real data (not hardcoded); selecting a filter narrows the table; clicking "Submitted" or "Date Needed" column headers toggles ascending/descending sort with an arrow indicator; changing a status or deleting a row still works and respects the current filter/sort.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin.astro src/scripts/admin.js
git commit -m "feat: add filtering and sorting to admin requests table"
```

---

## Task 3: Netlify Function to send the notification email via Resend

**Files:**
- Create: `netlify/functions/notify-request.js`

**Interfaces:**
- Consumes: nothing from earlier tasks (independent file). Expects `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as Netlify environment variables (set once Sir Seth grants Netlify access — see Global Constraints).
- Produces: an HTTPS POST endpoint at `/.netlify/functions/notify-request` that Task 4's database trigger calls with the inserted row as its JSON body (matching `service_requests` columns: `id`, `created_at`, `neighborhood`, `category`, `name`, `phone`, `email`, `date_needed`, `notes`, `status`).

- [ ] **Step 1: Write the function**

Create `netlify/functions/notify-request.js`:

```js
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let r;
  try {
    r = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const html = `
    <p><strong>${esc(r.category)}</strong> needed in <strong>${esc(r.neighborhood)}</strong> on ${esc(r.date_needed)}</p>
    <p>${esc(r.name)} — ${esc(r.phone)}${r.email ? ` — ${esc(r.email)}` : ''}</p>
    <p>${esc(r.notes)}</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: ['hillfamendeavors@gmail.com', 'hillfamilyautofair.marconi@gmail.com'],
      subject: `New service request: ${r.category} in ${r.neighborhood}`,
      html,
    }),
  });

  if (!res.ok) {
    return { statusCode: 502, body: `Resend request failed: ${await res.text()}` };
  }

  return { statusCode: 200, body: 'ok' };
};
```

- [ ] **Step 2: Manually verify once Netlify access is available**

This function cannot run under plain `astro dev` (Netlify Functions need Netlify's runtime). Once Netlify access is granted:

1. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Netlify → Site configuration → Environment variables.
2. Run `npx netlify-cli dev` (no need to add it as a project dependency — `npx` fetches it on demand) to run the site with functions locally.
3. In a second terminal, test the function directly:

```bash
curl -X POST http://localhost:8888/.netlify/functions/notify-request \
  -H "Content-Type: application/json" \
  -d '{"category":"Plumbers","neighborhood":"onion-creek","date_needed":"2026-08-20","name":"Test User","phone":"(512) 555-0000","email":"test@example.com","notes":"Test notification"}'
```

4. Confirm it returns `200 ok` and that an email arrives at both recipient addresses.

Until Netlify access lands, skip this verification step and move to Task 4 — the code is still correct to write and commit now.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/notify-request.js
git commit -m "feat: add Netlify function to email new service requests via Resend"
```

---

## Task 4: Trigger the notification on every new request

**Files:**
- Apply SQL: Supabase project `Trusted Neighbor` (ref `dktjutawxktwhuhuwbit`)

**Interfaces:**
- Consumes: the deployed URL of Task 3's function (`https://<your-site>.netlify.app/.netlify/functions/notify-request`) — not known until the site has a live Netlify URL or custom domain.
- Produces: nothing consumed by later tasks (this is the final wiring step).

- [ ] **Step 1: Enable `pg_net` and create the trigger**

Once you know the live site URL, run this in the Supabase SQL Editor (replace `REPLACE_WITH_YOUR_SITE_URL` with the real one, e.g. `https://trustedneighbors.net` or the `*.netlify.app` URL):

```sql
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_service_request()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'REPLACE_WITH_YOUR_SITE_URL/.netlify/functions/notify-request',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := to_jsonb(new)
  );
  return new;
end;
$$;

create trigger on_service_request_insert
after insert on public.service_requests
for each row execute function public.notify_new_service_request();
```

- [ ] **Step 2: Manually verify end-to-end**

Submit a real "Need a Service?" request on the live site. Confirm: the row appears in `service_requests`, and within a few seconds an email arrives at both `hillfamendeavors@gmail.com` and `hillfamilyautofair.marconi@gmail.com` with the request's category, neighborhood, date, name, phone, and notes.

If no email arrives, check `net._http_response` in the Supabase SQL Editor (`select * from net._http_response order by created desc limit 5;`) to see the HTTP status and body returned by the Netlify function call — this tells you whether the trigger fired and what the function responded with.

- [ ] **Step 3: Commit**

No file changes in this repo for this task (it's pure Supabase-side SQL) — nothing to commit. If you want a record of it, note the applied SQL in a comment in a future migration file, but don't block on this.

---

## Self-Review Notes

- **Spec coverage:** Filter/sort → Task 2. Delete → Task 1. Notify on new request → Tasks 3 and 4. All three requested features are covered.
- **Placeholder scan:** The only literal placeholder is `REPLACE_WITH_YOUR_SITE_URL` in Task 4, which is intentional and clearly marked (the real value doesn't exist yet, same pattern used earlier for `SUPABASE_URL` in `src/lib/supabase.js`) — not a vague TODO.
- **Type/name consistency:** `esc()` is defined identically in both `admin.js` (browser, uses `document`) and `notify-request.js` (Node, no DOM — uses a regex-based version) since they run in different environments; both produce the same HTML-escaping behavior. `requests`, `sortKey`, `sortDir`, `filterNeighborhood`/`filterCategory`/`filterStatus` are the only new state, all defined in Task 2 Step 3 and used consistently within that same file.
