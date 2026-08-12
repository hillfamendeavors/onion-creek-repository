# Trusted Neighbors — Status & Roadmap

_As of 13 August 2026 (updated after the admin CMS build)._

Neighbor-sourced business directories for four Austin-area communities (Avery Ranch, Circle C, Onion Creek, Sunfield), live at **trustedneighbors.net**. 502 listings across 8 categories and 37 subcategories, plus a neighbor-to-neighbor service-request board and a full admin CMS.

See also: [`HANDOFF.md`](../HANDOFF.md) at the repo root — a session-specific handoff written for continuing this work in a different tool, more detailed than this roadmap on exactly where things were left.

---

## ⚠️ Read this first

**17 commits are built, tested, and committed — but not pushed.** Nothing since the service-request feature is live in production. Verified against the live site earlier: `/login/` returns **404** in production while working locally — the same is true of everything listed below.

```bash
git push origin main   # Netlify auto-deploys from main
```

Nothing else in this roadmap matters until that happens.

---

## Where things stand

### Live and working (in production, trustedneighbors.net)

| Capability | Notes |
|---|---|
| Directory site | 4 neighborhoods, pre-rendered static HTML |
| Search / filter / collapse | Client-side over pre-rendered DOM |
| "Need a Service?" requests | Posts to Supabase, login-gated |
| Admin triage | `/admin/` — filter, sort, status, delete on service requests |
| Multi-admin | `admins` table (2 accounts) |

### Built and committed, not yet pushed/deployed

- **Directory content moved from static JSON into Supabase** (`groups`, `subcategories`, `neighborhood_subcategories`, `listings` tables) — the build now reads from the database, not `src/data/*.json`, at build time. All 502 listings migrated with verified exact counts (100/118/121/163).
- **Admin CMS** — `/admin/` now has a "Directory" tab alongside "Service Requests": full CRUD on groups, subcategories (with per-neighborhood enable checkboxes), and listings.
- **Auto-rebuild on save** — `netlify/functions/trigger-rebuild.js` verifies the caller is an admin (reusing existing RLS, no new secret), then pings a Netlify build hook. Requires you to create that build hook and set `NETLIFY_BUILD_HOOK_URL` — see Blocking below.
- "Suggest a Referral" / "Suggest a Neighborhood" now email via Resend (Formspree fully removed).
- Public requests board `/{neighborhood}/requests/` — counts when logged out, contacts when logged in.
- Password reset, one global `/login/` page, site-wide login-status bar.
- Interior Designers category + Doubet Interiors listing (content fix, now migrated into the DB too).
- Security hardening: locked `search_path` on the notification trigger, revoked its public RPC access, replaced a `SECURITY DEFINER` view bypass with column-scoped anonymous grants (anonymous users cannot read `name`/`phone`/`email`/`notes` on `service_requests` — enforced by the database, verified by direct API calls), same public-read/admin-write RLS pattern applied to all 4 new directory tables via one shared `private.is_admin()` helper.

---

## What's missing

### 1. Blocking — do these first

| # | Gap | Why it matters |
|---|---|---|
| 1.1 | **17 unpushed commits** | Including the entire admin CMS — invisible to users until pushed |
| 1.2 | **Netlify build hook not created** | `trigger-rebuild.js` needs `NETLIFY_BUILD_HOOK_URL` set as an env var, or admin saves succeed in the DB but never republish the site |
| 1.3 | **Admin CMS never click-tested in a real browser** | Verified via build output + direct API calls only — no interactive session actually exercised the Directory tab end to end |
| 1.4 | **Leaked-password protection still off** | Confirmed disabled by Supabase advisor. Public signup is open. Dashboard toggle — Authentication → Password settings |
| 1.5 | **Reset-password redirect URLs unverified** | Supabase must allowlist `https://trustedneighbors.net/reset-password/` and `http://localhost:4321/reset-password/`, or reset links silently go to the wrong place |
| 1.6 | **Referral + suggestion emails never tested in production** | The functions respond, but no confirmed end-to-end send since the Formspree→Resend swap. Only `notify-request` was verified |

### 2. SEO foundations — currently absent

The project's stated reason for existing on Astro is that crawlers and AI readers get real pre-rendered HTML. That half is done well. The surrounding SEO infrastructure was never built:

| # | Gap | Impact |
|---|---|---|
| 2.1 | `site` is commented out in `astro.config.mjs` | No canonical URLs; sitemap generation impossible until set |
| 2.2 | No `sitemap.xml` | Crawlers discover pages only by following links |
| 2.3 | No `robots.txt` | No crawl directives, no sitemap pointer |
| 2.4 | No 404 page | Broken URLs render Netlify's generic default |

All four are small. Still the highest value-per-hour work remaining once the CMS is verified live.

### 3. Data-model / content debt

| # | Gap | Status |
|---|---|---|
| 3.1 | ~~Categories are free text with no stable IDs~~ | **Reconsidered, not fixed.** `service_requests.category` deliberately stays free text with no FK to `subcategories` — a request is a historical snapshot of what was asked for, and a rename shouldn't retroactively rewrite old requests. Only cost: the admin's category filter dropdown may show both old and new spellings after a rename, which is cosmetic |
| 3.2 | ~~`ReferralModal.astro`'s dead hardcoded category fallback~~ | **Fixed** — deleted, `groups` is now always passed |
| 3.3 | `email` / `website` never rendered publicly | Still true on `ListingRow.astro` — but now properly captured and editable via the admin CMS's listing form, just not shown to visitors yet |
| 3.4 | `address` / `serviceArea` dead code in `ListingRow.astro` | Still unaddressed — builds a Google Maps link nobody sees, since no listing has ever populated these fields (not part of the new `listings` schema either) |

### 4. Security & quality

| # | Gap | Assessment |
|---|---|---|
| 4.1 | `/admin/` is a static file | The **data** is properly protected by RLS — this is real security, not theatre. The *page* is publicly fetchable. Fix by adding `@astrojs/netlify` and setting `prerender = false` on that one route |
| 4.2 | Zero automated tests | Every change is verified by hand/API calls. Real risk now that the CMS is live — a broken save could corrupt live directory content with no test catching it |
| 4.3 | Supabase anon key committed in source | **Intentional and correct** — it's the publishable key, protected by RLS. Not a defect |

---

## Roadmap

### Phase 1 — Foundation ✅ complete (accounts, requests, admin triage, Resend, security hardening)

### Phase 2 — Ship and configure ⏱ ~1 hour, still pending

1. `git push origin main`, confirm Netlify deploys
2. Create the Netlify build hook, set `NETLIFY_BUILD_HOOK_URL`
3. Click-test the admin Directory tab for real (add/edit/delete a listing, confirm a rebuild fires and the live site updates)
4. Enable leaked-password protection; add reset-password redirect URLs
5. Send one real referral and one suggestion; confirm both arrive

**Done when:** every shipped feature — including the CMS — works on trustedneighbors.net, not just localhost.

### Phase 3 — SEO foundations ⏱ ~2 hours, not started

1. Set `site: 'https://trustedneighbors.net'` in `astro.config.mjs`
2. Add `@astrojs/sitemap`, exclude `/admin/`, `/login/`, `/reset-password/`
3. Write `public/robots.txt` pointing at the sitemap, disallowing those same routes
4. Build `src/pages/404.astro` linking to the four neighborhoods
5. Add per-page `<meta name="description">` and Open Graph tags to neighborhood pages

### Phase 4 — Admin CMS ✅ built, unverified live

Directory content lives in Supabase (`groups`/`subcategories`/`neighborhood_subcategories`/`listings`), admin has full CRUD, saves trigger an admin-gated rebuild via Netlify Function. See `HANDOFF.md` for the exact schema and file list. Remaining: the click-through verification and build-hook setup listed under Phase 2 above — this phase is code-complete but operationally unverified.

### Phase 5 — Polish and hardening, not started

Automated tests around the auth/request/CMS paths (now the highest-value test target, given 4.2) · request expiry (past-dated requests still show as open) · admin pagination (fine at 502 rows, worth revisiting at scale) · rate-limiting on request submission · public display of listing `email`/`website` (3.3) · resolve or remove `address`/`serviceArea` (3.4) · `@astrojs/netlify` + server-gated `/admin/` (4.1) · accessibility pass.

---

## Decisions already made

Recorded so they don't get relitigated:

| Decision | Rationale |
|---|---|
| **Stay on Astro** | The value prop is pre-rendered HTML for crawlers. Next/Remix would add a runtime and buy nothing |
| **DB + rebuild, not live fetch** | Preserves SEO. Client-fetching listings is the regression Astro was adopted to fix |
| **No FK from `service_requests` to `subcategories`** | A request is a snapshot, not a live reference — see 3.1 above |
| **No `neighborhoods` table** | 4 slugs are stable, developer-level facts already canonical in `src/data/neighborhoods.js`; a `check` constraint covers it without a whole reference table |
| **One shared `private.is_admin()` RLS helper** | Reused across `admins`-gated policies on `service_requests` and all 4 new directory tables, rather than repeating the subquery per policy |
| **Anonymous users see request counts only** | Names and phone numbers require an account. Enforced at the database |
| **One global `/login/`** | Replaced two inline auth forms rather than extracting a shared component — net code reduction |
| **Admin gated by `admins` table** | Not a role system. Add a row to grant access |
| **Resend for all email** | Formspree fully removed. Domain verified; Supabase SMTP routes through it |
| **Rebuild-on-save, no debouncing** | Each CMS save triggers its own rebuild call. Add batching only if build-minute usage becomes a real problem at 2-admin scale |

## Open questions

- **Sir Seth's access** — does he need an admin account, or does he only own Netlify/DNS?
- **Referral moderation** — referrals email in; nothing routes them into the new `listings` table automatically. Should that become a review queue?
- **`.impeccable/config.json`** — currently committed. Should it be gitignored alongside `.claude/` and `.codex/`?
- **Listing `sort_order`** — the admin UI doesn't expose a way to reorder listings/subcategories/groups yet (schema supports it, no UI control). Worth adding, or is insertion order fine?
