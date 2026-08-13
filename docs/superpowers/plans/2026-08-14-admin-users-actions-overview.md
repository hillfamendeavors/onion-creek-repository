# Admin Users-Tab Actions + Overview Tab Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in order — Tasks 2-4 depend on each other (Task 3 wires the sidebar button Task 2 adds; Task 4's script targets the DOM elements Task 2 adds). Steps use checkbox (`- [ ]`) syntax for tracking. This repo has no test framework (see `HANDOFF.md`); verification is `npm run build` + manual click-through in a real browser, per this repo's established convention.

**Goal:** Add three per-row actions to the admin Users tab (send password reset, quick-grant admin, mailto email link) and a new Overview tab showing three live stat counts, as the sidebar's new default landing view.

**Architecture:** Pure client-side additions to the existing static Astro + Supabase setup. No new tables, no new secrets — password reset reuses the existing public `resetPasswordForEmail` wrapper, grant-admin reuses the existing `admins` insert pattern, and the Overview stats use Supabase's `count: 'exact', head: true` query option against tables that already exist.

**Tech Stack:** Astro 5 (static + one SSR route for `/admin/`), vanilla client-side ES modules, Supabase JS client.

## Global Constraints

- No new frontend dependencies, no new database migration, no new Netlify Function or secret.
- Every script file defines its own `esc()` HTML-escaping helper rather than importing a shared one — established, deliberately-duplicated pattern (see `HANDOFF.md`). `admin-overview.js` doesn't render any user-supplied text, so it doesn't need one.
- Destructive actions get a `confirmDialog()` from `src/scripts/ui-feedback.js`; non-destructive ones (sending an email, granting a role) don't, matching the existing `grantAdminBtn` precedent in `admin.js`.
- Verify every task with `npm run build` (must succeed) then a real browser click-through of the changed flow.

---

## File Structure

| File | Change |
|---|---|
| `src/pages/admin.astro` | Modify — Users table gets an Actions column; sidebar gets a new "Overview" link as the first item (now `.active` by default instead of "Service Requests"); new `tab-overview` stat-card panel as the first tab, visible by default; `tab-requests` becomes hidden by default; new `.stat-grid`/`.stat-card` CSS |
| `src/scripts/admin-users.js` | Modify — fetch `admins` alongside existing queries; add Send Reset / Grant Admin buttons and a mailto link to each row |
| `src/scripts/admin.js` | Modify — wire the new Overview sidebar button into the existing tab-switching logic |
| `src/scripts/admin-overview.js` | Create — loads and renders the three stat counts |

---

## Task 1: Users tab row actions (password reset, grant admin, mailto)

**Files:**
- Modify: `src/pages/admin.astro` (Users table `<thead>`)
- Modify: `src/scripts/admin-users.js` (full rewrite)

**Interfaces:**
- Consumes: `requestPasswordReset(email)` from `src/lib/auth.js` (already exists — returns `{ data, error }`, same call the public "Forgot Password" flow uses); `showToast(message, isError = false)` from `src/scripts/ui-feedback.js` (already exists); `supabase` from `src/lib/supabase.js`.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Add an Actions column to the Users table header**

In `src/pages/admin.astro`, find:

```astro
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Registered</th>
                      <th>Service Requests</th>
                    </tr>
                  </thead>
                  <tbody id="usersBody"></tbody>
```

Replace with:

```astro
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Registered</th>
                      <th>Service Requests</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="usersBody"></tbody>
```

- [ ] **Step 2: Rewrite `admin-users.js` to fetch admin status and render the row actions**

Replace the entire contents of `src/scripts/admin-users.js` with:

```js
import { supabase } from '../lib/supabase.js';
import { requestPasswordReset } from '../lib/auth.js';
import { showToast } from './ui-feedback.js';

const usersBody = document.getElementById('usersBody');
let loaded = false;

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

window.addEventListener('users-tab-shown', async () => {
  if (loaded) return;
  loaded = true;
  await loadUsers();
});

async function loadUsers() {
  if (!usersBody) return;
  usersBody.innerHTML = `<tr><td colspan="6">Loading users…</td></tr>`;

  const [profilesRes, requestsRes, adminsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('email, category, date_needed'),
    supabase.from('admins').select('email'),
  ]);

  if (profilesRes.error) {
    usersBody.innerHTML = `<tr><td colspan="6">Failed to load users: ${esc(profilesRes.error.message)}</td></tr>`;
    return;
  }

  const profiles = profilesRes.data || [];
  const requests = requestsRes.data || [];
  const adminEmails = new Set((adminsRes.data || []).map((a) => a.email.toLowerCase()));

  if (profiles.length === 0) {
    usersBody.innerHTML = `<tr><td colspan="6">No registered users yet.</td></tr>`;
    return;
  }

  usersBody.innerHTML = profiles.map((p) => {
    const theirRequests = requests.filter((r) => r.email === p.email);
    const requestsHtml = theirRequests.length === 0
      ? '<span style="color:#9CA3AF;">None yet</span>'
      : theirRequests.map((r) => `
          <span style="display:inline-block; background:#F3F4F6; border-radius:12px; padding:3px 10px; font-size:0.78rem; font-weight:600; color:#374151; margin:2px 4px 2px 0;">
            ${esc(r.category)} <span style="color:#9CA3AF;">(${esc(r.date_needed)})</span>
          </span>
        `).join('');

    const isAdmin = adminEmails.has(p.email.toLowerCase());
    const adminAction = isAdmin
      ? '<span style="color:#9CA3AF; font-size:0.85rem;">Already Admin</span>'
      : `<button class="icon-btn grant-admin-btn" data-email="${esc(p.email)}">Grant Admin</button>`;

    return `
      <tr>
        <td>${esc(p.full_name) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></td>
        <td>${esc(p.phone) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td>${esc(new Date(p.created_at).toLocaleDateString())}</td>
        <td>${requestsHtml}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="icon-btn send-reset-btn" data-email="${esc(p.email)}">Send Reset</button>
          ${adminAction}
        </td>
      </tr>
    `;
  }).join('');

  usersBody.querySelectorAll('.send-reset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const { error } = await requestPasswordReset(btn.dataset.email);
      btn.disabled = false;
      btn.textContent = 'Send Reset';
      if (error) {
        showToast('Failed to send reset email: ' + error.message, true);
        return;
      }
      showToast(`Password reset email sent to ${btn.dataset.email}.`);
    });
  });

  usersBody.querySelectorAll('.grant-admin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Granting…';
      const { error } = await supabase.from('admins').insert({ email: btn.dataset.email });
      if (error) {
        btn.disabled = false;
        btn.textContent = 'Grant Admin';
        showToast('Failed to grant admin role: ' + error.message, true);
        return;
      }
      showToast(`Admin role granted to ${btn.dataset.email}.`);
      await loadUsers();
    });
  });
}
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

`npm run dev`, log into `/admin/`, open the Users tab. Confirm: each row's email is a clickable `mailto:` link; clicking "Send Reset" shows a "Sending…" state then a success toast, and the target user actually receives a password-reset email (check the inbox for the test account you use); a non-admin row shows a "Grant Admin" button, clicking it shows a "Granting…" state then a success toast and the row switches to "Already Admin" without a page reload; confirm that email now appears in the Admin Roles tab's Authorized Administrators list.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin.astro src/scripts/admin-users.js
git commit -m "feat: add password-reset, grant-admin, and mailto actions to Users tab"
```

---

## Task 2: Overview tab markup + sidebar default

**Files:**
- Modify: `src/pages/admin.astro`

**Interfaces:**
- Produces: `#statUsers`, `#statOpenRequests`, `#statPendingReferrals` DOM elements — consumed by Task 4's `admin-overview.js`. `tabOverviewBtn` id — consumed by Task 3's `admin.js` changes.

- [ ] **Step 1: Add stat-card CSS**

In `src/pages/admin.astro`, in the `<style>` block, right after the `.sidebar-logout { margin-top: var(--space-md); }` rule, add:

```css
      .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); }
      @media (max-width: 640px) { .stat-grid { grid-template-columns: 1fr; } }
      .stat-card { padding: var(--space-xl); text-align: center; }
      .stat-value { font-family: 'EB Garamond', serif; font-size: 2.75rem; font-weight: 600; color: var(--color-primary); line-height: 1; }
      .stat-label { margin-top: var(--space-sm); font-size: 0.85rem; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
```

- [ ] **Step 2: Add "Overview" as the first, active sidebar link**

Find:

```astro
          <nav class="sidebar-nav">
            <button class="sidebar-link active" id="tabRequestsBtn">Service Requests</button>
            <button class="sidebar-link" id="tabReferralsBtn">Referral Suggestions</button>
            <button class="sidebar-link" id="tabUsersBtn">Users</button>
            <button class="sidebar-link" id="tabRolesBtn">Admin Roles</button>
            <button class="sidebar-link" id="tabDirectoryBtn">Directory CMS</button>
          </nav>
```

Replace with:

```astro
          <nav class="sidebar-nav">
            <button class="sidebar-link active" id="tabOverviewBtn">Overview</button>
            <button class="sidebar-link" id="tabRequestsBtn">Service Requests</button>
            <button class="sidebar-link" id="tabReferralsBtn">Referral Suggestions</button>
            <button class="sidebar-link" id="tabUsersBtn">Users</button>
            <button class="sidebar-link" id="tabRolesBtn">Admin Roles</button>
            <button class="sidebar-link" id="tabDirectoryBtn">Directory CMS</button>
          </nav>
```

- [ ] **Step 3: Add the Overview tab panel, and hide Service Requests by default**

Find:

```astro
          <div id="tab-requests">
            <div class="filters">
```

Replace with:

```astro
          <div id="tab-overview">
            <div class="stat-grid">
              <div class="card stat-card">
                <div class="stat-value" id="statUsers">—</div>
                <div class="stat-label">Registered Users</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value" id="statOpenRequests">—</div>
                <div class="stat-label">Open Service Requests</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value" id="statPendingReferrals">—</div>
                <div class="stat-label">Pending Referral Suggestions</div>
              </div>
            </div>
          </div>

          <div id="tab-requests" style="display:none;">
            <div class="filters">
```

- [ ] **Step 4: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin.astro
git commit -m "feat: add Overview tab markup as the new admin default landing view"
```

---

## Task 3: Wire the Overview tab into admin.js's tab switching

**Files:**
- Modify: `src/scripts/admin.js`

**Interfaces:**
- Consumes: `#tabOverviewBtn` and `#tab-overview` from Task 2.
- Produces: dispatches an `overview-tab-shown` `window` event — consumed by Task 4's `admin-overview.js`.

- [ ] **Step 1: Add the Overview tab button and update the tab list**

Find:

```js
const tabRequestsBtn = document.getElementById('tabRequestsBtn');
const tabReferralsBtn = document.getElementById('tabReferralsBtn');
const tabUsersBtn = document.getElementById('tabUsersBtn');
const tabRolesBtn = document.getElementById('tabRolesBtn');
const tabDirectoryBtn = document.getElementById('tabDirectoryBtn');

const ALL_TABS = [tabRequestsBtn, tabReferralsBtn, tabUsersBtn, tabRolesBtn, tabDirectoryBtn];

function switchTab(activeBtn, targetId) {
  ALL_TABS.forEach((btn) => btn?.classList.remove('active'));
  ['tab-requests', 'tab-referrals', 'tab-users', 'tab-roles', 'tab-directory'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === targetId ? 'block' : 'none';
  });
  activeBtn?.classList.add('active');
}

tabRequestsBtn?.addEventListener('click', () => switchTab(tabRequestsBtn, 'tab-requests'));
```

Replace with:

```js
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
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/admin.js
git commit -m "feat: wire Overview tab into admin sidebar tab switching"
```

---

## Task 4: Overview stat-loading script

**Files:**
- Create: `src/scripts/admin-overview.js`
- Modify: `src/pages/admin.astro` (add the script tag)

**Interfaces:**
- Consumes: `#statUsers`, `#statOpenRequests`, `#statPendingReferrals` (Task 2), the `overview-tab-shown` event (Task 3), `supabase` from `src/lib/supabase.js`.
- Produces: nothing consumed elsewhere — this is the final task.

- [ ] **Step 1: Write the script**

Create `src/scripts/admin-overview.js`:

```js
import { supabase } from '../lib/supabase.js';

async function loadOverview() {
  const statUsers = document.getElementById('statUsers');
  const statOpenRequests = document.getElementById('statOpenRequests');
  const statPendingReferrals = document.getElementById('statPendingReferrals');
  if (!statUsers || !statOpenRequests || !statPendingReferrals) return;

  const [usersRes, requestsRes, referralsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).neq('status', 'closed'),
    supabase.from('referral_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  statUsers.textContent = usersRes.count ?? '—';
  statOpenRequests.textContent = requestsRes.count ?? '—';
  statPendingReferrals.textContent = referralsRes.count ?? '—';
}

window.addEventListener('overview-tab-shown', loadOverview);

if (document.getElementById('appView')) {
  loadOverview();
}
```

This mirrors `admin.js`'s own pattern exactly: `select('*', { count: 'exact', head: true })` asks PostgREST for a row count without transferring any rows (`head: true` — the response body is empty, `count` comes back on the response metadata), and the `if (document.getElementById('appView')) { loadOverview(); }` line at the bottom eagerly loads on script load, the same way `admin.js` already does for `loadRequests()`/`loadReferrals()` — necessary here because Overview is now the tab visible on first render, not one the user has to click into first.

- [ ] **Step 2: Add the script tag**

In `src/pages/admin.astro`, find:

```astro
    <script src="../scripts/admin.js"></script>
    <script src="../scripts/admin-directory.js"></script>
    <script src="../scripts/admin-users.js"></script>
```

Replace with:

```astro
    <script src="../scripts/admin.js"></script>
    <script src="../scripts/admin-directory.js"></script>
    <script src="../scripts/admin-users.js"></script>
    <script src="../scripts/admin-overview.js"></script>
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

`npm run dev`, log into `/admin/`. Confirm: Overview is the tab shown immediately on login, with three stat cards showing real numbers (not stuck on "—"): registered user count, open service request count, pending referral count. Cross-check the numbers against the Users/Service Requests/Referral Suggestions tabs directly. Click away to another tab and back to Overview — confirm the numbers still show correctly (re-fetches, doesn't go blank).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/admin-overview.js src/pages/admin.astro
git commit -m "feat: add Overview tab stat loading (users, open requests, pending referrals)"
```

---

## Self-Review Notes

- **Spec coverage:** Feature 1 (password reset) → Task 1. Feature 2 (grant admin) → Task 1. Feature 3 (mailto) → Task 1. Feature 4 (Overview tab) → Tasks 2-4. All four spec items covered.
- **Placeholder scan:** No TBDs; every step has literal code.
- **Type/interface consistency:** `requestPasswordReset(email)` and `showToast(message, isError)` are called in Task 1 with the same signatures they're already defined with in `src/lib/auth.js` and `src/scripts/ui-feedback.js` (unmodified by this plan). `#statUsers`/`#statOpenRequests`/`#statPendingReferrals` (Task 2) and `#tabOverviewBtn`/`overview-tab-shown` (Task 2/3) are used with matching ids/names in Task 4. The Users table's `colspan` values were bumped from 5 to 6 in Task 1 to match the new Actions column — checked all three (loading/error/empty) rows in the rewritten `admin-users.js`.
