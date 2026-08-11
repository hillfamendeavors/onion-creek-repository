# Public Requests List & User Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any registered neighbor see and contact who's behind an open service request, while logged-out visitors only ever see anonymous counts, and only the site admin keeps status-change/delete powers.

**Architecture:** Supabase RLS policies move from "anonymous can post, only admin can read" to "any logged-in user can post and read, only admin can write status/delete." A new Postgres view exposes aggregate counts (no PII) to the `anon` role for logged-out visitors. Two client surfaces gain login/signup: the existing "Need a Service?" modal (gates posting) and a new per-neighborhood `/requests/` page (shows the list). A tiny shared `src/scripts/auth.js` module wraps the three Supabase Auth calls both surfaces need, so the sign-in/sign-up logic exists once.

**Tech Stack:** Same as the rest of this repo — Astro 5 static output, vanilla client-side JS, `@supabase/supabase-js` (already a dependency), Supabase Postgres + Auth + RLS.

This codebase has no test framework. As established in the prior admin-enhancements plan, verification here is manual: `npm run build` plus browser checks against the live Supabase project, matching how every other feature in this repo was verified.

## Global Constraints

- Admin email is the literal string `hillfamendeavors@gmail.com` — this is the only account that keeps status-change/delete/`\`/admin/\`` access. Do not build a roles table or generic permissions system for one admin (see [[PRODUCT.md]] Product Principle 4).
- Anonymous (logged-out) visitors must never be able to query raw `service_requests` rows — only the aggregate view. Don't relax this "just for testing."
- Escape all user-submitted fields before interpolating into HTML, matching the existing `esc()` pattern in `src/scripts/admin.js`.
- No new frontend dependencies — everything here is existing `@supabase/supabase-js` calls and vanilla DOM code, consistent with the rest of the site.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| Supabase SQL (via `apply_migration`) | Apply | RLS policy changes + new `service_requests_public_counts` view |
| `src/scripts/auth.js` | Create | Shared `getSession`/`signIn`/`signUp` wrappers used by both the modal and the requests page |
| `src/components/RequestModal.astro` | Modify | Add an inline login/signup view shown before the request form when logged out |
| `src/scripts/directory.js` | Modify | Check session on modal open; wire the new login/signup buttons |
| `src/scripts/admin.js` | Modify | Restrict admin app access to the literal admin email, not "any session" |
| `src/pages/[neighborhood]/requests.astro` | Create | New public per-neighborhood requests page |
| `src/scripts/requests-page.js` | Create | Client logic for the requests page: counts when logged out, full list + login/signup when logged in |
| `src/pages/[neighborhood].astro` | Modify | Add a nav link to the new requests page |
| `src/styles/directory.css` | Modify | Small additions: auth-error/notice text, request-card/count-row styles |

---

## Task 1: Supabase permissions — RLS changes and the public counts view

**Files:**
- Apply SQL: Supabase project `Trusted Neighbor` (ref `dktjutawxktwhuhuwbit`), via the connected `apply_migration` tool

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the permission model every later task's client code depends on — `INSERT`/`SELECT` require any authenticated session; `UPDATE`/`DELETE` require the admin email; `service_requests_public_counts` is readable by `anon`.

- [ ] **Step 1: Replace the INSERT policy (anon → authenticated)**

```sql
drop policy "public can insert requests" on service_requests;

create policy "authenticated users can insert requests"
  on service_requests for insert
  to authenticated
  with check (true);
```

- [ ] **Step 2: Tighten UPDATE and DELETE to the admin email only**

```sql
drop policy "admin can update requests" on service_requests;
drop policy "admin can delete requests" on service_requests;

create policy "admin can update requests"
  on service_requests for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'hillfamendeavors@gmail.com');

create policy "admin can delete requests"
  on service_requests for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'hillfamendeavors@gmail.com');
```

(The existing `"admin can read requests"` SELECT policy for `authenticated` stays as-is — it already grants any logged-in user read access, which is exactly what regular neighbors need now too.)

- [ ] **Step 3: Create the public aggregate view**

```sql
create or replace view public.service_requests_public_counts as
select neighborhood, category, date_needed, count(*) as count
from public.service_requests
where status <> 'closed'
group by neighborhood, category, date_needed;

grant select on public.service_requests_public_counts to anon;
```

- [ ] **Step 4: Verify email sign-ups are enabled**

In the Supabase dashboard for this project: **Authentication → Providers → Email**, confirm "Enable sign up" is on (it's the default for a new project, so this is a quick check, not expected to need a change).

- [ ] **Step 5: Manually verify the new permission model**

In the Supabase SQL Editor:
```sql
select * from pg_policies where tablename = 'service_requests';
```
Confirm exactly 4 policies: insert (authenticated), select (authenticated), update (authenticated, admin-email condition), delete (authenticated, admin-email condition). Then:
```sql
select * from service_requests_public_counts;
```
Confirm it returns aggregate rows with no name/phone/email columns.

- [ ] **Step 6: Commit**

No repo files changed in this task (pure Supabase-side SQL) — nothing to commit here. Proceed to Task 2.

---

## Task 2: Shared auth helper

**Files:**
- Create: `src/lib/auth.js`

**Interfaces:**
- Consumes: the existing `supabase` client from `src/lib/supabase.js`.
- Produces: `getSession()`, `signIn(email, password)`, `signUp(email, password)` — imported by Task 3 (`directory.js`) and Task 5 (`requests-page.js`).

- [ ] **Step 1: Write the module**

Create `src/lib/auth.js`:

```js
import { supabase } from './supabase.js';

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}
```

- [ ] **Step 2: Manually verify**

Run `npm run build` — confirm it succeeds (this file has no consumers yet, so this just checks for syntax errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.js
git commit -m "feat: add shared Supabase Auth helper"
```

---

## Task 3: Gate the "Need a Service?" modal behind login/signup

**Files:**
- Modify: `src/components/RequestModal.astro`
- Modify: `src/scripts/directory.js`

**Interfaces:**
- Consumes: `getSession`, `signIn`, `signUp` from `src/lib/auth.js` (Task 2).
- Produces: nothing new consumed by later tasks — this is a self-contained UI change.

- [ ] **Step 1: Add the auth view to the modal markup**

In `src/components/RequestModal.astro`, insert a new `<div id="requestAuthView">` immediately after the opening `<button class="modal-close" id="closeRequestModal">✕</button>` line and before `<div id="requestFormView">`:

```astro
    <div id="requestAuthView">
      <h3>Log In or Sign Up</h3>
      <p class="modal-sub">Create a free account (or log in) to post a request — this lets your neighbors see and reach out to you.</p>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="auth-email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password *</label>
        <input type="password" id="auth-password" placeholder="At least 6 characters" />
      </div>
      <button class="submit-btn" id="authSignInBtn">Log In</button>
      <button class="submit-btn" id="authSignUpBtn">Sign Up</button>
      <p class="auth-error" id="authError"></p>
      <p class="auth-notice" id="authSignupNotice" style="display:none;">Check your email to confirm your account, then log in above.</p>
    </div>
```

- [ ] **Step 2: Hide the request form by default in markup**

In the same file, change the `requestFormView` opening tag so it starts hidden (JS will show it once authenticated):

```astro
    <div id="requestFormView" style="display:none;">
```

- [ ] **Step 3: Add auth-related CSS**

In `src/styles/directory.css`, after the existing `.thank-you p { font-size: 0.85rem; color: var(--mid-gray); }` line, add:

```css
.auth-error { color: #b00020; font-size: 0.85rem; min-height: 1.2em; }
.auth-notice { font-size: 0.85rem; color: var(--masters-green); }
```

- [ ] **Step 4: Wire session-checking and auth handlers in `directory.js`**

In `src/scripts/directory.js`, add the import at the top (alongside the existing `import { supabase } from '../lib/supabase.js';`):

```js
import { getSession, signIn, signUp } from '../lib/auth.js';
```

Replace the existing "Need a Service?" modal block (currently starting at `// ── "Need a Service?" modal ──` through its closing `}`) with:

```js
// ── "Need a Service?" modal ──
const reqOverlay = document.getElementById('requestModalOverlay');
const reqOpenBtn = document.getElementById('openRequestModal');
const reqCloseBtn = document.getElementById('closeRequestModal');
const reqSubmitBtn = document.getElementById('submitRequestBtn');
const reqAuthView = document.getElementById('requestAuthView');
const reqFormView = document.getElementById('requestFormView');
const reqThankYou = document.getElementById('requestThankYouView');
const authEmailEl = document.getElementById('auth-email');
const authPasswordEl = document.getElementById('auth-password');
const authErrorEl = document.getElementById('authError');
const authSignupNoticeEl = document.getElementById('authSignupNotice');
const authSignInBtn = document.getElementById('authSignInBtn');
const authSignUpBtn = document.getElementById('authSignUpBtn');

function showRequestForm() {
  reqAuthView.style.display = 'none';
  reqFormView.style.display = 'block';
  reqThankYou.style.display = 'none';
}

function showAuthView() {
  reqAuthView.style.display = 'block';
  reqFormView.style.display = 'none';
  reqThankYou.style.display = 'none';
}

function closeRequestModal() {
  reqOverlay.classList.remove('open');
  setTimeout(() => {
    reqThankYou.style.display = 'none';
    ['r-category', 'r-date', 'r-name', 'r-phone', 'r-email', 'r-notes', 'auth-email', 'auth-password'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    authErrorEl.textContent = '';
    authSignupNoticeEl.style.display = 'none';
  }, 300);
}

if (reqOverlay && reqOpenBtn && reqCloseBtn) {
  const dateEl = document.getElementById('r-date');
  if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];

  reqOpenBtn.addEventListener('click', async () => {
    reqOverlay.classList.add('open');
    const session = await getSession();
    if (session) {
      showRequestForm();
    } else {
      showAuthView();
    }
  });
  reqCloseBtn.addEventListener('click', closeRequestModal);
  reqOverlay.addEventListener('click', (e) => { if (e.target === reqOverlay) closeRequestModal(); });

  authSignInBtn.addEventListener('click', async () => {
    authErrorEl.textContent = '';
    const { error } = await signIn(authEmailEl.value.trim(), authPasswordEl.value);
    if (error) {
      authErrorEl.textContent = error.message;
      return;
    }
    showRequestForm();
  });

  authSignUpBtn.addEventListener('click', async () => {
    authErrorEl.textContent = '';
    const { error } = await signUp(authEmailEl.value.trim(), authPasswordEl.value);
    if (error) {
      authErrorEl.textContent = error.message;
      return;
    }
    authSignupNoticeEl.style.display = 'block';
  });

  reqSubmitBtn.addEventListener('click', async () => {
    const category = document.getElementById('r-category').value;
    const date_needed = document.getElementById('r-date').value;
    const name = document.getElementById('r-name').value.trim();
    let phone = document.getElementById('r-phone').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const notes = document.getElementById('r-notes').value.trim();

    const phoneDigits = phone.replace(/\D/g, '');
    if (!category || !date_needed || !name || !phoneDigits) {
      alert('Please fill in the category, date needed, your name, and phone fields.');
      return;
    }
    if (phoneDigits.length !== 10) {
      alert('Please enter a 10-digit phone number in the format (512) 555-0000.');
      return;
    }
    phone = formatUSPhone(phoneDigits);

    reqSubmitBtn.textContent = 'Submitting…';
    reqSubmitBtn.disabled = true;

    const { error } = await supabase.from('service_requests').insert({
      neighborhood: reqOverlay.dataset.neighborhood,
      category,
      date_needed,
      name,
      phone,
      email: email || null,
      notes: notes || null,
    });

    reqSubmitBtn.textContent = 'Submit Request';
    reqSubmitBtn.disabled = false;

    if (error) {
      alert('Something went wrong submitting your request. Please try again.');
      return;
    }

    reqFormView.style.display = 'none';
    reqThankYou.style.display = 'block';
  });
}
```

- [ ] **Step 5: Manually verify**

Run `npm run build`, then `npm run dev`. Open a neighborhood page in a private/incognito window (no existing Supabase session), click "🛠️ Need a Service?" — confirm the login/signup view shows, not the request form. Sign up with a test email, confirm the "check your email" notice appears. Using an account you've already confirmed, log in — confirm it swaps to the request form and a submission still works end to end (row lands in Supabase). Reopen the modal in the same session — confirm it goes straight to the request form (no re-login needed).

- [ ] **Step 6: Commit**

```bash
git add src/components/RequestModal.astro src/scripts/directory.js src/styles/directory.css
git commit -m "feat: require login to post a service request"
```

---

## Task 4: Restrict admin access to the admin email

**Files:**
- Modify: `src/scripts/admin.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the admin email constant and gate both login paths**

In `src/scripts/admin.js`, after the existing `const STATUSES = [...]` line, add:

```js
const ADMIN_EMAIL = 'hillfamendeavors@gmail.com';
```

Replace the `loginBtn` click handler with:

```js
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
```

Replace the final `supabase.auth.getSession().then(...)` block with:

```js
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user?.email === ADMIN_EMAIL) showApp();
});
```

- [ ] **Step 2: Manually verify**

`npm run build`, then `npm run dev`, open `/admin/`. Log in with your admin account — confirm it still works exactly as before. Log out, then log in with a different (non-admin) test account (e.g. one created in Task 3's verification) — confirm you see "This account does not have admin access." and are not shown the requests table.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/admin.js
git commit -m "fix: restrict admin page access to the admin email only"
```

---

## Task 5: Public per-neighborhood requests page

**Files:**
- Create: `src/pages/[neighborhood]/requests.astro`
- Create: `src/scripts/requests-page.js`
- Modify: `src/pages/[neighborhood].astro`
- Modify: `src/styles/directory.css`

**Interfaces:**
- Consumes: `getSession`, `signIn`, `signUp` from `src/lib/auth.js` (Task 2); the `supabase` client from `src/lib/supabase.js`; the `service_requests_public_counts` view and tightened RLS from Task 1.
- Produces: nothing consumed by later tasks (this is the final piece).

- [ ] **Step 1: Add request-list CSS**

In `src/styles/directory.css`, after the `.auth-notice { ... }` line added in Task 3, add:

```css
.request-count-row { padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
.request-card { padding: 16px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 12px; }
.request-card a { color: var(--phone); text-decoration: none; }
.request-card a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Create the page**

Create `src/pages/[neighborhood]/requests.astro`:

```astro
---
import Directory from '../../layouts/Directory.astro';
import { neighborhoods } from '../../data/neighborhoods.js';

export function getStaticPaths() {
  return neighborhoods.map((n) => ({
    params: { neighborhood: n.slug },
    props: { neighborhood: n },
  }));
}

const { neighborhood } = Astro.props;
---

<Directory title={`${neighborhood.name} Requests`} footerLabel={neighborhood.footerLabel} theme={neighborhood.theme}>
  <header>
    <div class="logo-wrap">
      <h1>{neighborhood.name} <span>Requests</span></h1>
      <p class="header-sub">Open service requests from your neighbors</p>
      <a class="order-btn" href={`/${neighborhood.slug}/`}>Back to Directory</a>
    </div>
  </header>

  <main data-neighborhood={neighborhood.slug}>
    <div id="requestsAuthPrompt" style="display:none;">
      <p class="modal-sub">Log in or create a free account to see who's asking and reach out.</p>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="rp-auth-email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password *</label>
        <input type="password" id="rp-auth-password" placeholder="At least 6 characters" />
      </div>
      <button class="submit-btn" id="rpSignInBtn">Log In</button>
      <button class="submit-btn" id="rpSignUpBtn">Sign Up</button>
      <p class="auth-error" id="rpAuthError"></p>
      <p class="auth-notice" id="rpSignupNotice" style="display:none;">Check your email to confirm your account, then log in above.</p>
    </div>

    <div id="requestsCounts"></div>
    <div id="requestsFull" style="display:none;"></div>
  </main>
</Directory>

<script src="../../scripts/requests-page.js"></script>
```

- [ ] **Step 3: Write the client script**

Create `src/scripts/requests-page.js`:

```js
import { supabase } from '../lib/supabase.js';
import { getSession, signIn, signUp } from '../lib/auth.js';

const main = document.querySelector('main[data-neighborhood]');
const neighborhood = main.dataset.neighborhood;

const authPrompt = document.getElementById('requestsAuthPrompt');
const countsEl = document.getElementById('requestsCounts');
const fullEl = document.getElementById('requestsFull');
const authEmailEl = document.getElementById('rp-auth-email');
const authPasswordEl = document.getElementById('rp-auth-password');
const authErrorEl = document.getElementById('rpAuthError');
const signupNoticeEl = document.getElementById('rpSignupNotice');

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function renderCounts() {
  const { data, error } = await supabase
    .from('service_requests_public_counts')
    .select('*')
    .eq('neighborhood', neighborhood);

  if (error || !data || data.length === 0) {
    countsEl.innerHTML = '<p>No open requests right now.</p>';
    return;
  }

  countsEl.innerHTML = data
    .sort((a, b) => (a.date_needed < b.date_needed ? -1 : 1))
    .map((r) => `<div class="request-count-row">${esc(r.category)} needed — ${esc(r.date_needed)} — ${r.count} request${r.count === 1 ? '' : 's'}</div>`)
    .join('');
}

async function renderFullList() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('neighborhood', neighborhood)
    .neq('status', 'closed')
    .order('date_needed', { ascending: true });

  if (error) {
    fullEl.innerHTML = '<p>Failed to load requests.</p>';
    return;
  }
  if (data.length === 0) {
    fullEl.innerHTML = '<p>No open requests right now.</p>';
    return;
  }

  fullEl.innerHTML = data.map((r) => `
    <div class="request-card">
      <strong>${esc(r.category)}</strong> needed — ${esc(r.date_needed)}
      <p>${esc(r.name)} — <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.email ? ` — <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</p>
      ${r.notes ? `<p>${esc(r.notes)}</p>` : ''}
    </div>
  `).join('');
}

async function render() {
  const session = await getSession();
  if (session) {
    authPrompt.style.display = 'none';
    countsEl.style.display = 'none';
    fullEl.style.display = 'block';
    await renderFullList();
  } else {
    authPrompt.style.display = 'block';
    fullEl.style.display = 'none';
    countsEl.style.display = 'block';
    await renderCounts();
  }
}

document.getElementById('rpSignInBtn').addEventListener('click', async () => {
  authErrorEl.textContent = '';
  const { error } = await signIn(authEmailEl.value.trim(), authPasswordEl.value);
  if (error) {
    authErrorEl.textContent = error.message;
    return;
  }
  render();
});

document.getElementById('rpSignUpBtn').addEventListener('click', async () => {
  authErrorEl.textContent = '';
  const { error } = await signUp(authEmailEl.value.trim(), authPasswordEl.value);
  if (error) {
    authErrorEl.textContent = error.message;
    return;
  }
  signupNoticeEl.style.display = 'block';
});

render();
```

- [ ] **Step 4: Add the nav link**

In `src/pages/[neighborhood].astro`, change:

```astro
      <a class="order-btn" href="/">Back Home</a>
```

to:

```astro
      <a class="order-btn" href="/">Back Home</a>
      <a class="order-btn" href={`/${neighborhood.slug}/requests/`}>Open Requests</a>
```

- [ ] **Step 5: Manually verify**

`npm run build`, then `npm run dev`. From a neighborhood page, click "Open Requests" — confirm it navigates to `/<slug>/requests/`. In a private/incognito window (logged out), confirm you see aggregate count lines only (e.g. "Plumbers needed — 2026-08-20 — 1 request") with no names or contact info anywhere in the rendered HTML (check via browser dev tools "View Page Source" / inspect, not just visually). Log in with a confirmed test account — confirm the view swaps to full request cards with working `tel:`/`mailto:` links, filtered to that neighborhood, excluding anything marked `closed` in `/admin/`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/[neighborhood]/requests.astro src/scripts/requests-page.js src/pages/[neighborhood].astro src/styles/directory.css
git commit -m "feat: add public per-neighborhood open-requests page"
```

---

## Self-Review Notes

- **Spec coverage:** RLS/permissions model → Task 1. Shared auth helper → Task 2. Posting-gate UI → Task 3. Admin-email restriction (explicitly called out in the spec's UI changes section) → Task 4. Public requests page (counts when logged out, full list when logged in) → Task 5. All spec sections are covered.
- **Placeholder scan:** no TBD/TODO; the one literal constant (`hillfamendeavors@gmail.com`) is intentional and matches the spec, not a placeholder to fill in later.
- **Type/name consistency:** `getSession`/`signIn`/`signUp` are defined once in Task 2's `src/lib/auth.js` and imported with those exact names in Tasks 3 and 5 — no renaming drift. `service_requests_public_counts` is the exact view name used consistently in Task 1's SQL and Task 5's query.
