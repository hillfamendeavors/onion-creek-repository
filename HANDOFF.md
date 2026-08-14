# Handoff: Trusted Neighbors Directory

Written to hand this project off to a different AI coding tool (Antigravity) with zero shared conversation history. If you're a fresh agent reading this: read this whole file before touching anything — it front-loads context that would otherwise take many tool calls to reconstruct, and several past mistakes it's worth not repeating.

**Read next, in this order:** [`PRODUCT.md`](PRODUCT.md) (durable product facts, audience, constraints) → [`docs/ROADMAP.md`](docs/ROADMAP.md) (current status + prioritized gaps) → this file's "Immediate next steps" section.

---

## What this project is

A static Astro 5 site: neighbor-sourced local business directories for four Austin-area communities (Avery Ranch, Circle C, Onion Creek, Sunfield), live at **trustedneighbors.net**, deployed on Netlify. Core value prop: every page is pre-rendered to real HTML at build time so crawlers/AI readers see actual content — this is load-bearing, not incidental (see PRODUCT.md).

Backend is Supabase (Postgres + Auth), accessed **directly from the browser** via a public anon key protected by Row Level Security — there is no general API layer. Three Netlify Functions exist only where a real secret must stay server-side (sending email via Resend, triggering a Netlify rebuild).

## Quick facts / IDs

| Thing | Value |
|---|---|
| Supabase project | `Trusted Neighbor`, ref `dktjutawxktwhuhuwbit`, org `hbslvtqjpvmvipwxwrgp` |
| Supabase URL / anon key | Hardcoded in `src/lib/supabase.js` — safe to expose, RLS is the real boundary. Don't "fix" this into an env var; there's no server runtime to read one from at build/browser time in this static setup |
| Netlify site | `trustedneighbors.net`, owned by "Sir Seth" (`hillfamendeavors@gmail.com`) — the person running this session does **not** have Netlify dashboard access themselves, historically had to ask Sir Seth for things like env vars |
| Admin accounts | Two rows in the `admins` table: `hillfamendeavors@gmail.com` (Seth) and `marconidominyx@gmail.com` (the user) |
| Email sending | Resend, domain `trustedneighbors.net` verified. Supabase Auth's SMTP is also routed through Resend (fixed a rate-limit bug — see "Landmines" below) |
| Git remote | `origin` → GitHub, branch `main`. Netlify auto-deploys from `main` on push |

## Current exact state (check freshness — this drifts)

Run these to get ground truth rather than trusting this file's numbers:

```bash
git log --oneline -20        # what's committed
git status -sb               # ahead/behind origin — check "ahead N" carefully
```

As of the original handoff: working tree clean, 17 commits ahead of `origin/main`, nothing pushed. **As of 14 August 2026 (see "What happened since this handoff" below): 20 commits ahead, still nothing pushed.** Production is still running code from well before this session's work — see Immediate Next Steps.

Supabase: 4 directory tables exist and are populated (`groups`: 8 rows, `subcategories`: 37, `neighborhood_subcategories`: 145, `listings`: 502 — split 100/118/121/163 across the four neighborhoods). Verified via direct count queries, exact match against the source JSON. A 5th table, `profiles`, was added 14 August 2026 (see below) — 2 rows, one per registered account, auto-populated via an `auth.users` trigger.

## What happened in the session before this handoff (chronological, condensed)

This project went through several extended work sessions. Summarizing because the full history is long and most of it is now superseded, but the *reasoning* behind decisions matters for not undoing them:

1. **Built a "Need a Service?" request board** — visitors post a service request (category/date/contact info), stored in `service_requests`, triaged at `/admin/`.
2. **Added real accounts** — Supabase Auth, an `admins` table (not a role system — presence in the table = admin), a public requests page showing aggregate counts to anonymous visitors and full contact details to logged-in users.
3. **Migrated Formspree → Resend** for all three site forms (referral, service request, "suggest a neighborhood"), via `netlify/functions/{notify-request,notify-referral,notify-suggestion,_resend}.js`.
4. **Fixed a real bug, not a code bug**: the dev server once returned `504 Outdated Optimize Dep` for `@supabase/supabase-js` — Vite's dependency cache was stale. Fix was `rm -rf node_modules/.vite`. If a fresh agent ever sees *every* client-side interaction on a page silently dead at once (modals, tabs, search all inert), check this before assuming the source code broke — a single failed ES module import kills the whole script's execution, so nothing after the failed import line ever runs.
5. **Consolidated auth into one `/login/` page**, deleting two duplicated inline auth forms (net code reduction, not a new abstraction — see PRODUCT principle: prefer deletion).
6. **Security hardening pass**: Supabase's advisor flagged a `SECURITY DEFINER` view bypassing RLS and an over-privileged trigger function. Fixed by column-scoping anonymous grants and locking `search_path`. Learned the hard way that **Supabase's default table-level `GRANT SELECT` to `anon` is broader than an RLS policy alone** — a `create policy ... for select` restricting to certain columns does nothing if the blanket table grant still covers all columns; you must `revoke select on <table> from anon` first, then grant only the specific columns.
7. **Just-completed: the admin CMS.** Moved all 502 listings out of static JSON (`src/data/*.json`) into Supabase, gave the admin full CRUD (groups/subcategories/listings) at `/admin/`'s new "Directory" tab, and wired saves to trigger a real Netlify rebuild via an admin-gated function. Full design reasoning below.

## What happened since this handoff (14 August 2026 session)

A new session, working from the same local folder, ran a full UI/UX audit-and-fix pass plus new admin features. Chronological, condensed:

1. **Found and fixed a real admin login bug.** `src/pages/admin.astro` gates the console server-side by reading an `sb-access-token` cookie; that cookie is only ever set by an `onAuthStateChange` listener living in `src/lib/auth.js`. `admin.js` signed in by calling `supabase.auth.signInWithPassword()` directly and never imported `auth.js`, so the listener never registered on `/admin/` — a successful login would `window.location.reload()` straight back to the login screen. Fixed by routing the login handler through the existing `signIn()` wrapper instead of duplicating the Supabase call. This was likely why admin login looked broken.
2. **Replaced every native `alert()`/`confirm()`/`prompt()`** across `admin.js`, `admin-directory.js`, and `login-page.js` with a small shared `src/scripts/ui-feedback.js` (`showToast`, `confirmDialog`) and, for Directory CMS group editing, an inline edit form instead of `prompt()`.
3. **Auth-page fixes:** confirm-password field + match validation on registration; `/reset-password/` restyled to match `/login/`'s branding (was a plain, unbranded page); fixed a stuck "Verifying your account session…" notice.
4. **Accessibility:** calendar day cells with requests are now real `<button>` elements (were `<div>`s with only a click handler — not keyboard reachable); a shared `src/scripts/modal-a11y.js` adds focus-trap + Escape-to-close + focus-return to every modal (request detail, Add Listing, the new confirm dialog).
5. **Admin console overhaul:**
   - Converted the top tab bar into a left sidebar nav, collapsing to horizontal scroll under 768px.
   - New **Users** tab: every registered account (name/email/phone/registered date) with their service requests as inline badges — backed by a new `public.profiles` table, auto-populated via an `auth.users` insert trigger (RLS: admin reads all, user reads own; mirrors the existing `private.is_admin()` pattern, no service-role key needed).
   - New **Overview** tab, now the sidebar's default landing view: three live stat counts (registered users, open service requests, pending referral suggestions) via `count: 'exact', head: true` queries.
   - Users tab row actions: **Send Reset** (calls the existing public `requestPasswordReset()` — no new backend) and **Grant Admin** (reuses the existing `admins`-insert pattern, shows "Already Admin" once granted); user emails are now `mailto:` links.
   - Fixed two latent bugs found while touching this area: `admins` was missing `created_at` (the Admin Roles tab queried/sorted/displayed it against a column that didn't exist), and `grantAdminBtn` inserted a nonexistent `role` column.
6. **Typography:** admin/login/reset-password had drifted to a generic `Inter` default. Restored the site's own established pairing — `EB Garamond` (headings, already used in `directory.css` for `header h1`/listing names) + `Source Sans 3` (body/UI) — rather than introducing a new identity.
7. Softened (not removed) a `.toast` component's `border-left` from 4px to 2px — it's a functional severity indicator (error/warning/success color, paired with an icon), not decoration, so kept rather than stripped like the purely-decorative `.dir-subcat` border that was removed.

Full findings/reasoning: `docs/superpowers/specs/2026-08-14-auth-admin-uiux-fixes-design.md` and `docs/superpowers/specs/2026-08-14-admin-users-actions-design.md`, plans in the matching `docs/superpowers/plans/` files.

**Verification gap:** every change built successfully (`npm run build`) and was checked with a headless Playwright pass for pages reachable without real credentials (login, register, reset-password, the public calendar — including a real keyboard-navigation + focus-trap test against live calendar data). The admin-only surfaces (login success, Users tab data accuracy, Send Reset actually delivering email, Grant Admin) were confirmed by the user directly in their own logged-in session, not by this agent — this agent never had admin credentials.

## The admin CMS — what it is and why it's shaped this way

**The core tension**: the site's whole reason for being static is crawler-visible pre-rendered HTML. Making content admin-editable normally means either (a) fetching it client-side, which is exactly the regression the original Astro rewrite fixed (a prior version fetched listings via client JS and search engines indexed empty pages), or (b) re-rendering on every edit. Chose (b).

**Schema** (all in `public` schema, RLS enabled on every table):

```
groups (id, slug, label, icon, sort_order)
subcategories (id, group_id → groups, name, icon, sort_order)
neighborhood_subcategories (neighborhood_slug, subcategory_id → subcategories)  -- composite PK, which subcats are enabled per neighborhood
listings (id, neighborhood_slug, subcategory_id → subcategories, name, phone, note, email, website, featured, sort_order)
```

Why `neighborhood_slug` is a `text check (... in ('avery-ranch','circle-c','onion-creek','sunfield'))` rather than a foreign key to a `neighborhoods` table: there are only 4, they're stable, developer-level facts already canonical in `src/data/neighborhoods.js`. A real table for 4 rows that never change through the CMS would be needless indirection — add one only if neighborhoods themselves become admin-addable.

Why `service_requests.category` was **not** migrated to a foreign key against `subcategories` (this was originally planned as a blocking prerequisite in an earlier version of the roadmap, then deliberately reversed): a service request is a historical record of what someone asked for on a given date. If an admin later renames "Plumbers" to "Plumbing Services," an old request should still say "Plumbers" — that's correct, not stale data. The only cost is the admin's category filter dropdown can show both spellings after a rename, which is cosmetic. Don't re-add this FK without a real reason.

**RLS pattern**: one shared helper, reused everywhere instead of repeating the same subquery in every policy:

```sql
create schema if not exists private;
create or replace function private.is_admin()
returns boolean language sql security definer set search_path = '' stable
as $$ select exists (select 1 from public.admins where email = (select auth.jwt() ->> 'email')) $$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
```

Every new table: `for select to anon, authenticated using (true)` (public directory content — this was already fully public as committed JSON before, so no new exposure) + `for all to authenticated using ((select private.is_admin())) with check (...)`.

**Auto-rebuild**: `netlify/functions/trigger-rebuild.js` receives the caller's Supabase access token, forwards it as a bearer token to `GET /rest/v1/admins?select=email` (the existing `admins` table RLS policy already restricts this to the caller's own row — zero new auth logic needed), and if a row comes back, POSTs `process.env.NETLIFY_BUILD_HOOK_URL`. **This env var is not set yet** — see Immediate next steps.

**Admin UI**: `src/pages/admin.astro` now has two tabs (Service Requests / Directory). Directory has two sub-tabs (Categories: groups + subcategories + per-neighborhood enable checkboxes; Listings: neighborhood-scoped listing CRUD). Logic lives in `src/scripts/admin-directory.js`. Deliberately plain/utilitarian styling matching the rest of `/admin/` (no framework, inline `<style>` in the `.astro` file) — this is intentional, see PRODUCT.md's "static-first" principle, not an oversight to "improve" later.

**`getStaticPaths` in `src/pages/[neighborhood].astro`** now queries Supabase instead of `import.meta.glob('../data/*.json')`. Every downstream consumer (`ListingsTree.astro`, `ReferralModal.astro`, `RequestModal.astro`) only ever consumed the resulting `groups` prop, never the JSON directly — so this swap required zero changes to those files. The 4 JSON files under `src/data/` are now dead weight for the build but were deliberately left in git as a historical fallback, not deleted.

## Landmines already hit (don't re-trigger these)

- **Empty string vs SQL `null` during the data migration**: `subcategories.icon` and `listings.note` are `not null default ''`. A generator script that converts `''` → SQL `null` (to handle genuinely-absent `email`/`website`) will violate the not-null constraint on `icon`/`note`, which legitimately can be `''`. The fix was making the null-conversion only trigger on actual JS `null`/`undefined`, never on empty string — different columns need different empty-value semantics.
- **Postgres migrations are transactional** — a mid-migration constraint violation rolls back the *entire* `apply_migration` call, including statements that "succeeded" earlier in the same call. Don't assume partial application; always re-check row counts after a failure before retrying.
- **The Supabase MCP connector gateway occasionally 502s** (Cloudflare-level, not a data issue) — back off ~60s+ and retry; it resolved cleanly both times it happened, no data was ever partially written when this occurred.
- **`revoke select on <table> from anon` before column-scoping a grant** — see item 6 in the session summary above. Forgetting this step makes a "column-scoped" grant silently ineffective.
- **A stale dev-server module graph looks exactly like a broken app — check the month label first.** Editing `astro.config.mjs` restarts the dev server and forces Vite to re-optimize deps (`Re-optimizing dependencies because vite config has changed`). Any tab held open across that window keeps a module graph pointing at pre-restart URLs, one import fails, and *nothing* in `requests-page.js` runs. On `/<slug>/requests/` the tell is that `#currentMonthLabel` still reads **`May 2026`** and the grid still reads `Loading calendar…` — both are static placeholders, and `renderCalendar()` overwrites both in the first milliseconds of `init()`. If you see them, no JS ran; do not debug the calendar code. Fix: hard reload (`Ctrl+Shift+R`), then `rm -rf node_modules/.vite` + restart if it persists. This is the same underlying landmine as the `504 Outdated Optimize Dep` entry above, but it recurs on *any* config edit, not just a stale cache. Full diagnosis, including the browser evidence that the source was never at fault: `docs/superpowers/specs/2026-08-15-calendar-blank-module-failure-design.md`.
- **The anonymous `401` on `/rest/v1/service_requests` in the console is correct behaviour, not a bug.** `directory.js`'s live-request-badge query runs for logged-out visitors, and RLS denies it — anonymous users may only read `service_requests_public_counts`. The call site guards with `if (!error && count > 0)` and degrades to "no badge". Do not loosen RLS to silence it.
- **Client-side auth listeners only run if their module is actually imported.** `src/lib/auth.js`'s module-level `onAuthStateChange` listener is what syncs the Supabase session into the `sb-access-token`/`sb-refresh-token` cookies `admin.astro`'s SSR gate reads. A page whose script signs in via `supabase.auth.signInWithPassword()` directly instead of importing `auth.js`'s `signIn()` never registers that listener — the cookie never gets set, and any SSR check gating on it silently sees no session. This bit `/admin/` specifically (see session summary above); every other auth-gated page happened to already import `auth.js` for other reasons. If a fresh SSR gate is added anywhere else, make sure the page's client script actually imports `auth.js`.
- **Every new `SECURITY DEFINER` function needs its `EXECUTE` grant revoked from `anon`/`authenticated` explicitly** — this is the same landmine as the already-documented `private.is_admin()` case, but it recurs per-function, not just once. The `handle_new_user()` trigger added 14 August 2026 was initially left callable directly via `/rest/v1/rpc/handle_new_user` by any client until the Supabase security advisor caught it post-migration. Run `get_advisors(type: 'security')` after every migration that adds a `SECURITY DEFINER` function, not just once per project.

## Immediate next steps, in priority order

1. **Create the Netlify build hook.** Netlify dashboard (needs Sir Seth, or whoever now has access) → Site configuration → Build & deploy → Build hooks → Add one named `cms-save`, branch `main`. Set `NETLIFY_BUILD_HOOK_URL` as an env var to that URL. Trigger one manual redeploy afterward so the function picks it up.
2. **Click through the Directory CMS tab specifically.** As of 14 August 2026: admin login, the Service Requests tab, and the new Users tab are all confirmed working in a real logged-in browser session (the admin login bug above is fixed and verified). The Directory CMS tab's add/edit/delete-listing flow and the auto-rebuild trigger specifically have *not* been confirmed live — still resting on code review + `npm run build` only, same gap the original handoff flagged.
3. Decide on pushing to `origin/main` (20 commits currently sitting local-only, up from 17 at the original handoff). Not done this session either, for the same continuity reason as before.
4. Everything else is in `docs/ROADMAP.md`'s "Blocking" and "SEO foundations" sections, already prioritized.

## Working conventions this project has established (follow them)

- No JS framework beyond Astro's static templating — interactivity is hand-written vanilla JS. Don't introduce React/Vue/htmx/etc.
- No new frontend dependencies without a real justification — this project has exactly two (`astro`, `@supabase/supabase-js`).
- Every script file defines its own tiny `esc()` HTML-escaping helper rather than importing a shared one — that's the established (deliberately duplicated) pattern in this codebase, not an oversight.
- Prefer deletion over new abstraction when consolidating duplicated code (see the `/login/` consolidation).
- Mark deliberate scope-cuts inline with a one-line rationale (e.g. the no-FK decision above) rather than silently doing the minimal thing — future readers need to know a corner was cut on purpose, not by accident.
- No automated tests exist yet; verification throughout has been manual (`npm run build` + direct API/SQL checks). This is an accepted gap (see ROADMAP 4.2), not a standard to silently break by adding tests inconsistently — if you add a test framework, say so explicitly and follow through project-wide rather than testing only your own change.
