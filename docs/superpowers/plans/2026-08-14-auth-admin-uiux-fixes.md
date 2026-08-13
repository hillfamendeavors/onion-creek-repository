# Auth, Requests, and Admin UI/UX Fixes Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in order — later tasks depend on earlier ones (Task 9's focus-trap helper is wired into markup added by Task 2 and code from Task 3/8). Steps use checkbox (`- [ ]`) syntax for tracking. This repo has no test framework (see `HANDOFF.md`); verification is `npm run build` + manual click-through in a real browser, per this repo's established convention — not automated tests.

**Goal:** Fix the 9 UI/UX findings recorded in `docs/superpowers/specs/2026-08-14-auth-admin-uiux-fixes-design.md`, most severe first: the admin login cookie bug, then the `alert()`/`confirm()`/`prompt()` inconsistency, then auth-page parity/branding, then accessibility, then polish.

**Architecture:** All changes are edits to existing vanilla-JS `src/scripts/*.js` files and their corresponding `src/pages/*.astro` markup/styles, plus two new small shared modules (`src/scripts/ui-feedback.js` for toast/confirm-dialog, `src/scripts/modal-a11y.js` for focus trapping) that multiple existing scripts import — matching this codebase's existing pattern of small shared helpers rather than one big utility file.

**Tech Stack:** Astro 5 (static + one SSR route), vanilla client-side JS (ES modules via Astro's Vite pipeline — `<script>` tags with `import` already work, no bundler config needed), Supabase JS client.

## Global Constraints

- No new frontend dependencies beyond what's already installed (`astro`, `@supabase/supabase-js`).
- No JS framework — hand-written vanilla JS only, consistent with every existing script in `src/scripts/`.
- Every script file defines its own `esc()` HTML-escaping helper rather than importing a shared one — this is the established, deliberately-duplicated pattern (see `HANDOFF.md`). Don't consolidate it as part of this work.
- `/admin/`'s styling stays "deliberately plain/utilitarian" (per `HANDOFF.md`) — new admin UI (toast, confirm dialog) reuses admin.astro's existing inline-style modal-overlay pattern and `.card`/`.btn-secondary`/`.btn-danger`/`.input` classes, not a new design system.
- No automated tests exist in this repo (accepted gap, see `HANDOFF.md`). Verify every task with `npm run build` (must succeed) then `npm run dev` + a real browser click-through of the specific flow changed.
- Escape all user-submitted/DB-sourced text before interpolating into HTML template strings, using each file's own `esc()`.

---

## File Structure

| File | Change |
|---|---|
| `src/scripts/admin.js` | Modify — fix login (Task 1), replace `alert`/`confirm` (Task 2) |
| `src/scripts/ui-feedback.js` | Create (Task 2) — shared `showToast()` / `confirmDialog()` |
| `src/pages/admin.astro` | Modify — toast/confirm-dialog markup + CSS (Task 2), tab overflow fix (Task 10) |
| `src/scripts/admin-directory.js` | Modify — replace `alert`/`confirm`/`prompt` (Task 3) |
| `src/scripts/login-page.js` | Modify — replace `alert` (Task 4), confirm-password (Task 5), fix stuck notice (Task 7) |
| `src/pages/login.astro` | Modify — confirm-password field (Task 5), password helper text (Task 11) |
| `src/pages/reset-password.astro` | Modify — full restyle to match `login.astro` (Task 6), helper text (Task 11) |
| `src/scripts/reset-password.js` | Modify — wire up new markup IDs from Task 6 |
| `src/scripts/requests-page.js` | Modify — keyboard-accessible calendar cells (Task 8), focus trap (Task 9) |
| `src/pages/[neighborhood]/requests.astro` | Modify — CSS for focusable calendar cells (Task 8) |
| `src/scripts/modal-a11y.js` | Create (Task 9) — shared `trapFocus()` / `releaseFocus()` |
| `src/scripts/admin-directory.js` | Modify — wire focus trap into Add Listing modal (Task 9) |

---

## Task 1: Fix admin login (cookie never set, causes login-then-bounce-back)

**Files:**
- Modify: `src/scripts/admin.js:1`, `src/scripts/admin.js:160-178`

**Interfaces:**
- Consumes: `signIn(email, password)` from `src/lib/auth.js` (already exists, returns `{ data, error }` — same shape `supabase.auth.signInWithPassword` returns, since it's a thin wrapper).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Import `signIn` from the shared auth module**

In `src/scripts/admin.js`, change line 1 from:

```js
import { supabase } from '../lib/supabase.js';
```

to:

```js
import { supabase } from '../lib/supabase.js';
import { signIn } from '../lib/auth.js';
```

This is the actual fix: `../lib/auth.js` has module-level code that registers a `supabase.auth.onAuthStateChange` listener which sets the `sb-access-token`/`sb-refresh-token` cookies that `src/pages/admin.astro`'s server-side check reads. That module-level code runs the moment the module is imported — before the user even clicks the login button — so the listener is guaranteed to be registered before `signIn()` triggers the `SIGNED_IN` event.

- [ ] **Step 2: Use `signIn()` instead of calling `supabase.auth.signInWithPassword` directly**

In `src/scripts/admin.js`, find (around line 160-178):

```js
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
```

Replace with:

```js
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const { data, error } = await signIn(loginEmail.value.trim(), loginPassword.value);
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
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

Run `npm run dev`, open `http://localhost:4321/admin/`, open DevTools → Application → Cookies, log in with a real admin account (one of the rows in the `admins` table). Confirm:
- Before login: no `sb-access-token` cookie (unless left over from a previous `/login/` visit in this browser — clear cookies for `localhost` first if so).
- After clicking the login button: the page reloads and shows the admin console (`#appView`), not the login form.
- The `sb-access-token` cookie is now present.
- Click "Log Out" — confirm it returns to the login form and the cookie is cleared.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/admin.js
git commit -m "fix: register cookie-sync listener on admin login so SSR gate sees the session"
```

---

## Task 2: Shared toast + confirm-dialog, and clean up admin.js

**Files:**
- Create: `src/scripts/ui-feedback.js`
- Modify: `src/pages/admin.astro` (add markup + CSS)
- Modify: `src/scripts/admin.js` (replace `alert`/`confirm` call sites)

**Interfaces:**
- Produces: `showToast(message, isError = false)` and `confirmDialog(message)` (returns `Promise<boolean>`) from `src/scripts/ui-feedback.js` — consumed by this task's `admin.js` changes, Task 3's `admin-directory.js` changes, and Task 9's focus-trap wiring.

- [ ] **Step 1: Create the shared feedback module**

Create `src/scripts/ui-feedback.js`:

```js
let activeToastTimer = null;

export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(activeToastTimer);
  toast.textContent = message;
  toast.className = isError ? 'toast toast-error' : 'toast toast-success';
  toast.style.display = 'block';
  activeToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    const messageEl = document.getElementById('confirmDialogMessage');
    const yesBtn = document.getElementById('confirmDialogYes');
    const noBtn = document.getElementById('confirmDialogNo');
    if (!dialog || !messageEl || !yesBtn || !noBtn) {
      resolve(window.confirm(message));
      return;
    }

    messageEl.textContent = message;
    dialog.style.display = 'flex';

    function cleanup(result) {
      dialog.style.display = 'none';
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}
```

- [ ] **Step 2: Add toast + confirm-dialog markup to admin.astro**

In `src/pages/admin.astro`, right before the closing `</body>` tag (after the existing `addListingModal` div, before the `<script>` tags), add:

```astro
    <!-- Toast Notification -->
    <div id="toast" class="toast" style="display:none; position:fixed; bottom:24px; right:24px; z-index:1100; padding:14px 20px; border-radius:8px; font-size:0.9rem; font-weight:600; box-shadow:var(--shadow-lg); color:#fff; max-width:360px;"></div>

    <!-- Confirm Dialog -->
    <div id="confirmDialog" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1100; justify-content:center; align-items:center;">
      <div class="card" style="max-width:420px; width:90%; padding:var(--space-xl); background:white;">
        <p id="confirmDialogMessage" style="margin:0 0 var(--space-lg); font-size:0.95rem; color:var(--color-foreground);"></p>
        <div style="display:flex; justify-content:flex-end; gap:var(--space-md);">
          <button type="button" class="btn-secondary" id="confirmDialogNo" style="width:auto;">Cancel</button>
          <button type="button" class="btn-danger" id="confirmDialogYes" style="width:auto; padding:8px 20px;">Confirm</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Add toast color variants to admin.astro's `<style>` block**

In `src/pages/admin.astro`, in the `<style>` block, right after the `.btn-danger:hover { ... }` rule, add:

```css
      .toast-error { background: var(--color-destructive); }
      .toast-success { background: var(--color-primary); }
```

- [ ] **Step 4: Replace `alert`/`confirm` call sites in admin.js**

In `src/scripts/admin.js`, add the import at the top (after the `signIn` import from Task 1):

```js
import { showToast, confirmDialog } from './ui-feedback.js';
```

Find the status-update failure handler (inside `renderTable()`'s `select.status` change listener):

```js
      if (error) {
        alert('Failed to update status. Please try again.');
        sel.value = previousValue;
        sel.dataset.value = previousValue;
        return;
      }
```

Replace with:

```js
      if (error) {
        showToast('Failed to update status. Please try again.', true);
        sel.value = previousValue;
        sel.dataset.value = previousValue;
        return;
      }
```

Find the delete-request handler (inside `renderTable()`'s `.btn-danger` click listener):

```js
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
```

Replace with:

```js
  requestsBody.querySelectorAll('.btn-danger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this request permanently? This cannot be undone.'))) return;
      const { error } = await supabase.from('service_requests').delete().eq('id', btn.dataset.id);
      if (error) {
        showToast('Failed to delete request.', true);
        return;
      }
      requests = requests.filter((r) => r.id !== btn.dataset.id);
      renderTable();
    });
  });
```

Find the revoke-admin handler:

```js
  adminsBody.querySelectorAll('.btn-revoke-admin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      if (!email) return;
      if (!confirm(`Revoke admin access for ${email}?`)) return;

      const { error } = await supabase.from('admins').delete().eq('email', email);
      if (error) {
        alert('Failed to revoke admin role: ' + error.message);
        return;
      }

      adminUsers = adminUsers.filter((a) => a.email !== email);
      renderAdminsTable();
    });
  });
```

Replace with:

```js
  adminsBody.querySelectorAll('.btn-revoke-admin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      if (!email) return;
      if (!(await confirmDialog(`Revoke admin access for ${email}?`))) return;

      const { error } = await supabase.from('admins').delete().eq('email', email);
      if (error) {
        showToast('Failed to revoke admin role: ' + error.message, true);
        return;
      }

      adminUsers = adminUsers.filter((a) => a.email !== email);
      renderAdminsTable();
    });
  });
```

Find the referral status-update and delete handlers:

```js
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
```

Replace with:

```js
  referralsBody.querySelectorAll('select.ref-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      sel.dataset.value = sel.value;
      const { error } = await supabase.from('referral_suggestions').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) {
        showToast('Failed to update status.', true);
        return;
      }
      const ref = referrals.find((r) => String(r.id) === String(sel.dataset.id));
      if (ref) ref.status = sel.value;
    });
  });

  referralsBody.querySelectorAll('.btn-delete-ref').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this referral suggestion?'))) return;
      const { error } = await supabase.from('referral_suggestions').delete().eq('id', btn.dataset.id);
      if (error) {
        showToast('Failed to delete referral.', true);
        return;
      }
      referrals = referrals.filter((r) => String(r.id) !== String(btn.dataset.id));
      renderReferralsTable();
    });
  });
```

- [ ] **Step 5: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Verify in a real browser**

`npm run dev`, log into `/admin/`. On the Service Requests tab: change a status, confirm a small toast (not a browser alert) appears on success/failure. Click a Delete button — confirm a styled dialog (not `window.confirm`) appears with Cancel/Confirm; clicking Cancel does nothing, clicking Confirm deletes the row. Repeat for the Admin Roles tab's Revoke button and the Referral Suggestions tab's Delete button and status dropdown.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/ui-feedback.js src/pages/admin.astro src/scripts/admin.js
git commit -m "feat: replace alert/confirm with styled toast and confirm dialog in admin"
```

---

## Task 3: Clean up admin-directory.js (alert/confirm/prompt → shared UI)

**Files:**
- Modify: `src/scripts/admin-directory.js`

**Interfaces:**
- Consumes: `showToast`, `confirmDialog` from `src/scripts/ui-feedback.js` (Task 2).

- [ ] **Step 1: Import the shared feedback module**

In `src/scripts/admin-directory.js`, change line 1 from:

```js
import { supabase } from '../lib/supabase.js';
```

to:

```js
import { supabase } from '../lib/supabase.js';
import { showToast, confirmDialog } from './ui-feedback.js';
```

- [ ] **Step 2: Add inline group-edit state and replace the `prompt()`-based edit flow**

In `src/scripts/admin-directory.js`, add a new state variable near the top, after the `let loaded = false;` line:

```js
let editingGroupId = null;
```

Find `renderGroups()`:

```js
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
```

Replace with:

```js
function renderGroups() {
  const el = document.getElementById('groupsList');
  el.innerHTML = groups.map((g) => `
    <div class="dir-group" data-id="${g.id}">
      ${editingGroupId === g.id ? `
        <h3>
          <span style="display:flex; gap:8px; align-items:center; flex:1;">
            <input type="text" class="input edit-group-icon" value="${esc(g.icon)}" style="width:60px; margin-bottom:0;" />
            <input type="text" class="input edit-group-label" value="${esc(g.label)}" style="flex:1; margin-bottom:0;" />
          </span>
          <span>
            <button class="icon-btn save-group" data-id="${g.id}">Save</button>
            <button class="icon-btn cancel-edit-group" data-id="${g.id}">Cancel</button>
          </span>
        </h3>
      ` : `
        <h3>
          <span>${esc(g.icon)} ${esc(g.label)} <small>(${esc(g.slug)})</small></span>
          <span>
            <button class="icon-btn edit-group" data-id="${g.id}">Edit</button>
            <button class="icon-btn danger delete-group" data-id="${g.id}">Delete</button>
          </span>
        </h3>
      `}
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
```

- [ ] **Step 3: Replace the edit/delete/add handlers in `wireGroupHandlers()`**

Find:

```js
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
```

Replace with:

```js
function wireGroupHandlers() {
  document.getElementById('groupsList').querySelectorAll('.edit-group').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingGroupId = Number(btn.dataset.id);
      renderGroups();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.cancel-edit-group').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingGroupId = null;
      renderGroups();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.save-group').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.dir-group');
      const label = row.querySelector('.edit-group-label').value.trim();
      const icon = row.querySelector('.edit-group-icon').value.trim();
      if (!label) { showToast('Group label cannot be empty.', true); return; }
      const { error } = await supabase.from('groups').update({ label, icon }).eq('id', Number(btn.dataset.id));
      if (error) { showToast('Failed to update group.', true); return; }
      editingGroupId = null;
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.delete-group').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this group and every subcategory/listing under it? This cannot be undone.'))) return;
      const { error } = await supabase.from('groups').delete().eq('id', Number(btn.dataset.id));
      if (error) { showToast('Failed to delete group.', true); return; }
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
      if (error) { showToast('Failed to add subcategory.', true); return; }
      await loadDirectoryData();
      renderGroups();
      triggerRebuild();
    });
  });

  document.getElementById('groupsList').querySelectorAll('.delete-subcat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this subcategory and every listing under it? This cannot be undone.'))) return;
      const { error } = await supabase.from('subcategories').delete().eq('id', Number(btn.dataset.id));
      if (error) { showToast('Failed to delete subcategory.', true); return; }
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
      if (error) { showToast('Failed to update.', true); box.checked = !box.checked; return; }
      await loadDirectoryData();
      triggerRebuild();
    });
  });
}
```

- [ ] **Step 4: Replace the remaining `alert`/`confirm` call sites (add-group, delete-listing, add-listing)**

Find:

```js
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
```

Replace with:

```js
document.getElementById('addGroupBtn')?.addEventListener('click', async () => {
  const slug = document.getElementById('newGroupSlug')?.value?.trim();
  const label = document.getElementById('newGroupLabel')?.value?.trim();
  const icon = document.getElementById('newGroupIcon')?.value?.trim();
  if (!slug || !label) { showToast('Slug and label are required.', true); return; }
  const { error } = await supabase.from('groups').insert({ slug, label, icon, sort_order: groups.length });
  if (error) { showToast('Failed to add group. Slug may already be in use.', true); return; }
  await loadDirectoryData();
  renderGroups();
  triggerRebuild();
});
```

Find (inside `renderListingsTable()`'s delete handler):

```js
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
```

Replace with:

```js
  listingsBody.querySelectorAll('.btn-delete-listing').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      if (!(await confirmDialog('Delete this business listing permanently?'))) return;
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) {
        showToast('Failed to delete listing: ' + error.message, true);
        return;
      }
      allListings = allListings.filter((l) => l.id !== id);
      renderListingsTable();
      triggerRebuild();
    });
  });
```

Find (inside the `addListingForm` submit handler):

```js
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
```

Replace with:

```js
  if (!name || !phone || !subcategory_id || !neighborhood_slug) {
    showToast('Please complete all required fields.', true);
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
    showToast('Failed to add business listing: ' + error.message, true);
    return;
  }
```

- [ ] **Step 5: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Verify in a real browser**

`npm run dev`, log into `/admin/`, go to Directory CMS → Categories & Groups. Click "Edit" on a group — confirm it turns into inline icon/label inputs with Save/Cancel (no browser `prompt()` popup), Save persists the change, Cancel discards it. Click "Delete" on a group/subcategory — confirm the styled confirm dialog appears. Switch to Business Listings, delete a listing — confirm the styled dialog appears. Try submitting the Add Listing form with a required field empty — confirm a toast appears instead of a browser alert.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/admin-directory.js
git commit -m "feat: replace alert/confirm/prompt with styled UI in directory CMS"
```

---

## Task 4: Replace `alert()` on the account page (login.astro's profile view)

**Files:**
- Modify: `src/scripts/login-page.js`

**Interfaces:** none new — reuses existing `profileNotice` and adds one new inline error element.

- [ ] **Step 1: Replace the profile-save failure alert**

In `src/scripts/login-page.js`, find (inside the `profileForm` submit handler):

```js
    const { error } = await updateProfile({ full_name: name, phone });
    if (error) {
      alert('Failed to update profile: ' + error.message);
      return;
    }

    profileNotice.textContent = 'Profile details updated successfully!';
    profileNotice.style.display = 'block';
```

Replace with:

```js
    const { error } = await updateProfile({ full_name: name, phone });
    if (error) {
      profileNotice.textContent = 'Failed to update profile: ' + error.message;
      profileNotice.style.color = '#DC2626';
      profileNotice.style.background = '#FEF2F2';
      profileNotice.style.borderColor = '#FECACA';
      profileNotice.style.display = 'block';
      return;
    }

    profileNotice.textContent = 'Profile details updated successfully!';
    profileNotice.style.color = '';
    profileNotice.style.background = '';
    profileNotice.style.borderColor = '';
    profileNotice.style.display = 'block';
```

This reuses the existing `.auth-notice` element (`profileNotice`) that already sits right below the Save button, just re-coloring it for the error case instead of popping a browser alert — matching the pattern `.auth-error` already establishes elsewhere on this same page.

- [ ] **Step 2: Replace the toggle-request-btn failure alert**

In `src/scripts/login-page.js`, find (inside `loadUserServiceRequests()`'s toggle-button handler):

```js
      if (error) {
        alert('Failed to update status: ' + error.message);
        btn.disabled = false;
        btn.textContent = currentStatus === 'closed' ? '↺ Reopen' : '✓ Mark Completed';
        return;
      }
```

Replace with:

```js
      if (error) {
        profileNotice.textContent = 'Failed to update status: ' + error.message;
        profileNotice.style.color = '#DC2626';
        profileNotice.style.background = '#FEF2F2';
        profileNotice.style.borderColor = '#FECACA';
        profileNotice.style.display = 'block';
        btn.disabled = false;
        btn.textContent = currentStatus === 'closed' ? '↺ Reopen' : '✓ Mark Completed';
        return;
      }
```

Reuses the same `profileNotice` element rather than adding a new one, since this page only ever shows one profile/account area at a time.

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

`npm run dev`, log into `/login/`, edit your profile and save — confirm the green success notice still appears. To see the error path, temporarily disconnect network (DevTools → Network → Offline), try saving again, confirm a red inline notice appears instead of a browser alert (then restore network).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/login-page.js
git commit -m "fix: replace alert() with inline notice on the account page"
```

---

## Task 5: Add confirm-password field to registration

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/scripts/login-page.js`

**Interfaces:** none new.

- [ ] **Step 1: Add the confirm-password input to the Register view**

In `src/pages/login.astro`, find:

```astro
          <div class="form-group">
            <label for="reg-password">Password *</label>
            <input type="password" id="reg-password" placeholder="At least 6 characters" autocomplete="new-password" />
          </div>
          <button class="btn-submit" id="registerSubmitBtn">Create Account</button>
```

Replace with:

```astro
          <div class="form-group">
            <label for="reg-password">Password *</label>
            <input type="password" id="reg-password" placeholder="At least 6 characters" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label for="reg-password-confirm">Confirm Password *</label>
            <input type="password" id="reg-password-confirm" placeholder="Re-enter your password" autocomplete="new-password" />
          </div>
          <button class="btn-submit" id="registerSubmitBtn">Create Account</button>
```

- [ ] **Step 2: Wire it up and validate the match client-side**

In `src/scripts/login-page.js`, add a DOM reference near the other register inputs:

```js
const regPassword = document.getElementById('reg-password');
```

becomes:

```js
const regPassword = document.getElementById('reg-password');
const regPasswordConfirm = document.getElementById('reg-password-confirm');
```

Then find the register handler's validation block:

```js
  if (password.length < 6) {
    authError.textContent = 'Password must be at least 6 characters.';
    return;
  }

  const { data, error } = await signUp(email, password, { full_name: name, phone });
```

Replace with:

```js
  if (password.length < 6) {
    authError.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (password !== regPasswordConfirm.value) {
    authError.textContent = 'Passwords do not match.';
    return;
  }

  const { data, error } = await signUp(email, password, { full_name: name, phone });
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

`npm run dev`, go to `/login/` → Register tab. Enter mismatched passwords, submit — confirm "Passwords do not match." appears and no signup request is sent (check Network tab for no Supabase auth call). Enter matching passwords ≥ 6 characters — confirm registration proceeds as before.

- [ ] **Step 5: Commit**

```bash
git add src/pages/login.astro src/scripts/login-page.js
git commit -m "feat: add confirm-password field to registration"
```

---

## Task 6: Restyle reset-password.astro to match login.astro's brand

**Files:**
- Modify: `src/pages/reset-password.astro`
- Modify: `src/scripts/reset-password.js`

**Interfaces:** none new — same element IDs, just restyled markup.

- [ ] **Step 1: Rewrite reset-password.astro using login.astro's design tokens**

Replace the entire contents of `src/pages/reset-password.astro` with:

```astro
---
// Landing page for Supabase's password-recovery email link. Supabase's JS
// client auto-detects the recovery token in the URL and creates a session;
// this page just prompts for and submits the new password.
import '../styles/directory.css';
import { neighborhoods } from '../data/neighborhoods.js';

const theme = neighborhoods.find((n) => n.slug === 'onion-creek').theme;
const themeCss = `:root{${Object.entries(theme).map(([k, v]) => `${k}:${v};`).join('')}}`;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Reset Password · Trusted Neighbors</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <style is:global set:html={themeCss}></style>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --color-primary: #064E3B;
        --color-primary-hover: #043E2F;
        --color-bg: #F9FAFB;
        --color-card: #FFFFFF;
        --color-text-main: #111827;
        --color-text-sub: #4B5563;
        --color-text-muted: #6B7280;
        --color-border: #E5E7EB;
        --color-ring: rgba(6, 78, 59, 0.25);
      }

      body {
        font-family: 'Inter', sans-serif;
        background-color: var(--color-bg);
        color: var(--color-text-main);
        margin: 0;
        padding: 0;
        min-height: 100vh;
      }

      .top-bar-nav {
        background: var(--color-primary);
        color: #FFFFFF;
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
      }
      .top-bar-nav a {
        color: #FDE68A;
        text-decoration: none;
        font-weight: 500;
      }

      .auth-container {
        max-width: 460px;
        margin: 40px auto;
        padding: 0 20px;
      }

      .auth-card {
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
        padding: 32px;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .auth-header h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--color-primary);
        margin: 0 0 8px 0;
      }
      .auth-header p {
        color: var(--color-text-sub);
        font-size: 0.95rem;
        margin: 0;
      }

      .form-group {
        margin-bottom: 18px;
      }
      .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text-main);
        margin-bottom: 6px;
      }
      .form-group input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border: 1px solid #D1D5DB;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
        background: #FFFFFF;
        color: var(--color-text-main);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .form-group input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-ring);
      }
      .field-hint {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin: 6px 0 0 0;
      }

      .btn-submit {
        width: 100%;
        padding: 12px 20px;
        background: var(--color-primary);
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-top: 8px;
      }
      .btn-submit:hover {
        background: var(--color-primary-hover);
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .auth-error {
        color: #DC2626;
        font-size: 0.875rem;
        margin-top: 12px;
        text-align: center;
        min-height: 1.25em;
      }

      #invalidView a, #successView a {
        color: var(--color-primary);
        font-weight: 600;
      }
      #invalidView, #successView {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="top-bar-nav">
      <div><strong>Trusted Neighbors</strong> &nbsp;·&nbsp; Austin, Texas</div>
      <div><a href="/login/">← Back to Log In</a></div>
    </div>

    <div class="auth-container">
      <div class="auth-card" id="resetView">
        <div class="auth-header">
          <h1>Set a New Password</h1>
          <p>Choose a new password for your account</p>
        </div>
        <div class="form-group">
          <label for="newPassword">New Password *</label>
          <input type="password" id="newPassword" placeholder="At least 6 characters" autocomplete="new-password" />
          <p class="field-hint">Must be at least 6 characters.</p>
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm New Password *</label>
          <input type="password" id="confirmPassword" placeholder="Re-enter your new password" autocomplete="new-password" />
        </div>
        <button class="btn-submit" id="resetBtn">Set Password</button>
        <p class="auth-error" id="resetError"></p>
      </div>

      <div class="auth-card" id="invalidView">
        <div class="auth-header">
          <h1>Link Invalid or Expired</h1>
          <p>This password reset link is no longer valid.</p>
        </div>
        <p style="text-align:center;"><a href="/login/">Request a new one from the login page</a></p>
      </div>

      <div class="auth-card" id="successView">
        <div class="auth-header">
          <h1>Password Updated</h1>
          <p>You can now log in with your new password.</p>
        </div>
        <p style="text-align:center;"><a href="/">Return to the site</a></p>
      </div>
    </div>

    <script src="../scripts/reset-password.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Update reset-password.js for the confirm-password field and button loading state**

Replace the entire contents of `src/scripts/reset-password.js` with:

```js
import { supabase } from '../lib/supabase.js';
import { updatePassword } from '../lib/auth.js';

const resetView = document.getElementById('resetView');
const invalidView = document.getElementById('invalidView');
const successView = document.getElementById('successView');
const newPasswordEl = document.getElementById('newPassword');
const confirmPasswordEl = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const resetErrorEl = document.getElementById('resetError');

resetBtn.addEventListener('click', async () => {
  resetErrorEl.textContent = '';

  if (newPasswordEl.value.length < 6) {
    resetErrorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (newPasswordEl.value !== confirmPasswordEl.value) {
    resetErrorEl.textContent = 'Passwords do not match.';
    return;
  }

  resetBtn.disabled = true;
  resetBtn.textContent = 'Setting password…';

  const { error } = await updatePassword(newPasswordEl.value);

  if (error) {
    resetErrorEl.textContent = error.message;
    resetBtn.disabled = false;
    resetBtn.textContent = 'Set Password';
    return;
  }

  resetView.style.display = 'none';
  successView.style.display = 'block';
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    resetView.style.display = 'none';
    invalidView.style.display = 'block';
  }
});
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify in a real browser**

`npm run dev`. Trigger a real password reset email from `/login/` → Forgot Password, click the link, confirm `/reset-password/` now matches `/login/`'s visual style (logo bar, green accents, card). Test: mismatched passwords shows an inline error and doesn't submit; a too-short password shows an inline error; a valid matching password shows the "Setting password…" loading state then the success view. Also visit `/reset-password/` directly with no session (e.g. in a private window) and confirm the "Link Invalid or Expired" view shows with a working link back to `/login/`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/reset-password.astro src/scripts/reset-password.js
git commit -m "fix: restyle reset-password page to match login page branding"
```

---

## Task 7: Fix stuck "Verifying your account session…" notice

**Files:**
- Modify: `src/scripts/login-page.js`

**Interfaces:** none new.

- [ ] **Step 1: Clear the notice when falling through to the auth form**

In `src/scripts/login-page.js`, find `initPage()`:

```js
    loadUserServiceRequests(user.email);
  } else {
    // Show Auth Form Card
    if (mainContainer) mainContainer.classList.remove('wide');
    if (authFormCard) authFormCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
  }
}
```

Replace with:

```js
    loadUserServiceRequests(user.email);
  } else {
    // Show Auth Form Card
    if (mainContainer) mainContainer.classList.remove('wide');
    if (authFormCard) authFormCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
    clearMessages();
  }
}
```

`clearMessages()` is already defined earlier in this same file (clears `authError` and hides `authNotice`), so this reuses existing logic rather than adding new code.

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Verify in a real browser**

`npm run dev`, visit `/login/#access_token=invalid` directly (simulating a bad/expired magic-link fragment). Confirm the "Verifying your account session…" notice appears briefly then clears once the session check fails, leaving a clean login form — not a stuck notice sitting above the empty form.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/login-page.js
git commit -m "fix: clear stale verifying-session notice when no session is found"
```

---

## Task 8: Make calendar day cells keyboard-accessible

**Files:**
- Modify: `src/scripts/requests-page.js`
- Modify: `src/pages/[neighborhood]/requests.astro` (CSS lives in `src/styles/directory.css` — check there first; if `.calendar-cell` rules live in `directory.css`, edit that file instead)

**Interfaces:** none new.

- [ ] **Step 1: Confirm where `.calendar-cell` CSS is defined**

Run: `grep -n "calendar-cell" src/styles/directory.css src/pages/[neighborhood]/requests.astro`

`requests.astro` has no `<style>` block (confirmed by reading the file — it only has markup and a `<script>` tag), so the calendar CSS lives in `src/styles/directory.css`. Use that file for the CSS step below.

- [ ] **Step 2: Render clickable cells as real buttons**

In `src/scripts/requests-page.js`, find `renderCalendar()`:

```js
  calendarGrid.innerHTML = days.map((day) => {
    const dayData = groupedMap[day.dateStr];
    const totalCount = dayData ? dayData.totalCount : 0;

    let demandHTML = '';
    if (dayData && dayData.categories) {
      demandHTML = Object.entries(dayData.categories).map(([cat, count]) => `
        <div class="demand-pill ${!isAuthenticated ? 'locked' : ''}">
          <span>${!isAuthenticated ? '🔒 ' : ''}${esc(cat)}</span>
          <span>(${count})</span>
        </div>
      `).join('');
    }

    return `
      <div class="calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}">
        <div class="cell-top">
          <span class="date-num">${day.dayNumber}</span>
          ${totalCount > 0 ? `<span class="cell-count-badge">${totalCount}</span>` : ''}
        </div>
        <div class="cell-demand-list">
          ${demandHTML}
        </div>
      </div>
    `;
  }).join('');

  // Add Cell Click Event Listeners
  calendarGrid.querySelectorAll('.calendar-cell').forEach((cell) => {
    const dateStr = cell.dataset.date;
    const dateData = groupedMap[dateStr];
    if (dateData && dateData.totalCount > 0) {
      cell.addEventListener('click', () => openDetailModal(dateStr, dateData));
    }
  });
}
```

Replace with:

```js
  calendarGrid.innerHTML = days.map((day) => {
    const dayData = groupedMap[day.dateStr];
    const totalCount = dayData ? dayData.totalCount : 0;
    const isInteractive = totalCount > 0;

    let demandHTML = '';
    if (dayData && dayData.categories) {
      demandHTML = Object.entries(dayData.categories).map(([cat, count]) => `
        <div class="demand-pill ${!isAuthenticated ? 'locked' : ''}">
          <span>${!isAuthenticated ? '🔒 ' : ''}${esc(cat)}</span>
          <span>(${count})</span>
        </div>
      `).join('');
    }

    const cellTag = isInteractive ? 'button' : 'div';
    const cellAttrs = isInteractive
      ? `type="button" class="calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}"`
      : `class="calendar-cell not-interactive ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}"`;

    return `
      <${cellTag} ${cellAttrs}>
        <div class="cell-top">
          <span class="date-num">${day.dayNumber}</span>
          ${totalCount > 0 ? `<span class="cell-count-badge">${totalCount}</span>` : ''}
        </div>
        <div class="cell-demand-list">
          ${demandHTML}
        </div>
      </${cellTag}>
    `;
  }).join('');

  // Add Cell Click Event Listeners
  calendarGrid.querySelectorAll('button.calendar-cell').forEach((cell) => {
    const dateStr = cell.dataset.date;
    const dateData = groupedMap[dateStr];
    cell.addEventListener('click', () => openDetailModal(dateStr, dateData));
  });
}
```

Interactive cells become real `<button>` elements (focusable and Enter/Space-activatable natively — no manual `keydown` handling needed), while empty cells stay `<div>`s since they have nothing to activate.

- [ ] **Step 3: Add button-reset CSS so calendar-cell buttons look identical to the old divs**

In `src/styles/directory.css`, find (around line 970):

```css
.calendar-cell {
  background: var(--white);
  min-height: 95px;
  padding: 6px;
  box-sizing: border-border;
  display: flex;
  flex-direction: column;
  transition: background 0.15s;
  cursor: pointer;
}
```

Replace with (removing the blanket `cursor: pointer` since non-interactive cells are now plain `<div>`s, and adding button-reset rules so a `<button class="calendar-cell">` renders identically to the old `<div class="calendar-cell">`):

```css
.calendar-cell {
  background: var(--white);
  min-height: 95px;
  padding: 6px;
  box-sizing: border-border;
  display: flex;
  flex-direction: column;
  transition: background 0.15s;
  font: inherit;
  color: inherit;
  text-align: left;
  border: none;
  margin: 0;
}
button.calendar-cell {
  cursor: pointer;
}
button.calendar-cell:focus-visible {
  outline: 2px solid #064E3B;
  outline-offset: 2px;
}
```

Note `.calendar-cell.today` (a few lines below) already sets `border: 2px solid var(--masters-yellow, #D97706);`, which correctly overrides the new `border: none` via CSS specificity (two classes beats one) — no change needed there.

- [ ] **Step 4: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Verify in a real browser**

`npm run dev`, open a neighborhood's `/requests/` page. Tab through the page with the keyboard — confirm calendar cells with requests receive visible focus and Enter/Space opens the detail modal. Confirm empty cells are not part of the tab order. Confirm the calendar's visual appearance is unchanged from before.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/requests-page.js src/styles/directory.css
git commit -m "fix: make calendar day cells keyboard-accessible"
```

---

## Task 9: Modal focus trap + Escape-to-close

**Files:**
- Create: `src/scripts/modal-a11y.js`
- Modify: `src/scripts/requests-page.js` (request-detail modal)
- Modify: `src/scripts/admin-directory.js` (add-listing modal)
- Modify: `src/scripts/ui-feedback.js` (confirm dialog)

**Interfaces:**
- Produces: `trapFocus(modalEl, onClose)` and `releaseFocus()` from `src/scripts/modal-a11y.js`, consumed by all three modals below.

- [ ] **Step 1: Create the shared focus-trap module**

Create `src/scripts/modal-a11y.js`:

```js
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let previouslyFocused = null;
let activeModal = null;
let activeOnClose = null;

function handleKeydown(e) {
  if (!activeModal) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    activeOnClose?.();
    return;
  }

  if (e.key !== 'Tab') return;

  const focusable = Array.from(activeModal.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

document.addEventListener('keydown', handleKeydown);

export function trapFocus(modalEl, onClose) {
  previouslyFocused = document.activeElement;
  activeModal = modalEl;
  activeOnClose = onClose;

  const focusable = modalEl.querySelector(FOCUSABLE_SELECTOR);
  focusable?.focus();
}

export function releaseFocus() {
  activeModal = null;
  activeOnClose = null;
  previouslyFocused?.focus();
  previouslyFocused = null;
}
```

- [ ] **Step 2: Wire it into the request-detail modal**

In `src/scripts/requests-page.js`, add the import at the top:

```js
import { trapFocus, releaseFocus } from './modal-a11y.js';
```

Find:

```js
// Modal Logic
function closeModal() {
  if (requestDetailModal) requestDetailModal.style.display = 'none';
}

closeDetailModalBtn?.addEventListener('click', closeModal);
requestDetailModal?.addEventListener('click', (e) => {
  if (e.target === requestDetailModal) closeModal();
});
```

Replace with:

```js
// Modal Logic
function closeModal() {
  if (requestDetailModal) requestDetailModal.style.display = 'none';
  releaseFocus();
}

closeDetailModalBtn?.addEventListener('click', closeModal);
requestDetailModal?.addEventListener('click', (e) => {
  if (e.target === requestDetailModal) closeModal();
});
```

Find the end of `openDetailModal()`:

```js
  requestDetailModal.style.display = 'flex';
}
```

Replace with:

```js
  requestDetailModal.style.display = 'flex';
  trapFocus(requestDetailModal, closeModal);
}
```

- [ ] **Step 3: Wire it into the admin Add Listing modal**

In `src/scripts/admin-directory.js`, add the import at the top (alongside the `ui-feedback.js` import from Task 3):

```js
import { trapFocus, releaseFocus } from './modal-a11y.js';
```

Find:

```js
openAddListingModalBtn?.addEventListener('click', () => {
  if (addListingModal) addListingModal.style.display = 'flex';
});

closeAddListingModalBtn?.addEventListener('click', () => {
  if (addListingModal) addListingModal.style.display = 'none';
});
```

Replace with:

```js
function closeAddListingModal() {
  if (addListingModal) addListingModal.style.display = 'none';
  releaseFocus();
}

openAddListingModalBtn?.addEventListener('click', () => {
  if (addListingModal) {
    addListingModal.style.display = 'flex';
    trapFocus(addListingModal, closeAddListingModal);
  }
});

closeAddListingModalBtn?.addEventListener('click', closeAddListingModal);
```

Find the end of the `addListingForm` submit handler:

```js
  if (data) {
    allListings.unshift(data);
  }
  if (addListingModal) addListingModal.style.display = 'none';
  addListingForm.reset();
  renderListingsTable();
  triggerRebuild();
});
```

Replace with:

```js
  if (data) {
    allListings.unshift(data);
  }
  closeAddListingModal();
  addListingForm.reset();
  renderListingsTable();
  triggerRebuild();
});
```

- [ ] **Step 4: Wire it into the shared confirm dialog**

In `src/scripts/ui-feedback.js`, add the import at the top:

```js
import { trapFocus, releaseFocus } from './modal-a11y.js';
```

Find `confirmDialog()`:

```js
    messageEl.textContent = message;
    dialog.style.display = 'flex';

    function cleanup(result) {
      dialog.style.display = 'none';
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }
```

Replace with:

```js
    messageEl.textContent = message;
    dialog.style.display = 'flex';

    function cleanup(result) {
      dialog.style.display = 'none';
      releaseFocus();
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }

    trapFocus(dialog, () => cleanup(false));
```

Place that last line right after the `cleanup` function declaration and before the `onYes`/`onNo` declarations, so `cleanup` exists before `trapFocus` references it via the closure passed to `onClose`.

- [ ] **Step 5: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Verify in a real browser**

For each of the three modals (request-detail on a neighborhood's `/requests/` page, Add Listing in admin's Directory CMS, and any confirm dialog e.g. deleting a request in admin):
- Open the modal — confirm focus moves inside it (e.g. to the close button or first input).
- Press Tab repeatedly — confirm focus cycles within the modal and never escapes to the page behind it.
- Press Shift+Tab from the first focusable element — confirm it wraps to the last.
- Press Escape — confirm the modal closes.
- Confirm focus returns to the element that opened the modal after closing.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/modal-a11y.js src/scripts/requests-page.js src/scripts/admin-directory.js src/scripts/ui-feedback.js
git commit -m "feat: add focus trap and Escape-to-close to all modals"
```

---

## Task 10: Fix admin tab bar overflow on narrow screens

**Files:**
- Modify: `src/pages/admin.astro`

**Interfaces:** none new.

- [ ] **Step 1: Add horizontal scroll fallback to the tab bar**

In `src/pages/admin.astro`, find:

```css
      .tabs-container { margin-bottom: var(--space-xl); border-bottom: 1px solid var(--color-border); padding-bottom: 0; }
      .tabs, .dir-subtabs { display: flex; gap: var(--space-md); }
```

Replace with:

```css
      .tabs-container { margin-bottom: var(--space-xl); border-bottom: 1px solid var(--color-border); padding-bottom: 0; overflow-x: auto; }
      .tabs, .dir-subtabs { display: flex; gap: var(--space-md); flex-wrap: nowrap; }
      .tab-btn { white-space: nowrap; }
```

This mirrors the existing `.table-scroll { overflow-x: auto; }` pattern already used for admin's data tables, rather than introducing a new responsive technique.

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Verify in a real browser**

`npm run dev`, log into `/admin/`, open DevTools' device toolbar and switch to a narrow width (e.g. 375px, iPhone SE). Confirm the 4 tabs no longer wrap/overlap — instead the tab row scrolls horizontally, with all tab labels staying on one line and remaining fully clickable.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin.astro
git commit -m "fix: make admin tab bar horizontally scrollable on narrow screens"
```

---

## Task 11: Persistent password-requirement helper text

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/pages/reset-password.astro`

**Interfaces:** none new — `reset-password.astro` already got its hint in Task 6, Step 1; this task only touches `login.astro`.

- [ ] **Step 1: Add helper text under the registration password field**

In `src/pages/login.astro`, in the `<style>` block, find `.form-group input:focus { ... }` and add directly after it:

```css
      .field-hint {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin: 6px 0 0 0;
      }
```

Then find the registration password field (already modified in Task 5 to include the confirm-password field):

```astro
          <div class="form-group">
            <label for="reg-password">Password *</label>
            <input type="password" id="reg-password" placeholder="At least 6 characters" autocomplete="new-password" />
          </div>
```

Replace with:

```astro
          <div class="form-group">
            <label for="reg-password">Password *</label>
            <input type="password" id="reg-password" placeholder="At least 6 characters" autocomplete="new-password" />
            <p class="field-hint">Must be at least 6 characters.</p>
          </div>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Verify in a real browser**

`npm run dev`, visit `/login/` → Register tab. Confirm "Must be at least 6 characters." is visible under the password field at all times (not just as placeholder text that vanishes on focus/typing). Confirm `/reset-password/` (from Task 6) already shows its equivalent hint.

- [ ] **Step 4: Commit**

```bash
git add src/pages/login.astro
git commit -m "feat: add persistent password requirement hint to registration"
```

---

## Self-Review Notes

- **Spec coverage:** All 9 findings from the design doc map to tasks: #1→Task 1, #2→Tasks 2-4, #3→Task 5, #4→Task 6, #5→Task 7, #6→Task 8, #7→Task 9, #8→Task 10, #9→Task 6 (reset-password hint) + Task 11 (registration hint).
- **Placeholder scan:** No TBDs; every step has literal code. The one "Run X, then check Y" step (Task 8, Step 1) is a discovery step, not a placeholder — it tells the implementer exactly which command to run and what decision to make from its output.
- **Type/interface consistency:** `showToast(message, isError = false)` and `confirmDialog(message)` (Task 2) are called with matching signatures in Tasks 2, 3, and used nowhere else. `trapFocus(modalEl, onClose)` / `releaseFocus()` (Task 9) are called with matching signatures in Tasks 9's three call sites. `signIn(email, password)` (Task 1) matches its existing definition in `src/lib/auth.js` (not modified by this plan).
- **Ordering dependency:** Task 9 modifies `ui-feedback.js` (created in Task 2) and `admin-directory.js` (modified in Task 3) and `requests-page.js` (modified in Task 8) — must run after those three. Task 11 depends on Task 5's markup existing in `login.astro`. Tasks are numbered in a valid dependency order already.
