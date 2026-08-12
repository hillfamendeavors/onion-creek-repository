# Trusted Neighbors — Status & Roadmap

_As of 13 August 2026._

Neighbor-sourced business directories for four Austin-area communities (Avery Ranch, Circle C, Onion Creek, Sunfield), live at **trustedneighbors.net**. 502 listings across 8 categories and 37 subcategories, plus a neighbor-to-neighbor service-request board.

---

## ⚠️ Read this first

**12 commits are built, tested, and committed — but not pushed.** Everything from password reset onward exists only on this machine. Verified against the live site: `/login/` returns **404** in production while working locally.

That includes real content changes, not just features — the Interior Designers category and the Doubet Interiors listing move aren't live either.

```bash
git push origin main   # Netlify auto-deploys from main
```

Nothing else in this roadmap matters until that happens.

---

## Where things stand

### Live and working

| Capability | Notes |
|---|---|
| Directory site | 4 neighborhoods, 502 listings, pre-rendered static HTML |
| Search / filter / collapse | Client-side over pre-rendered DOM |
| "Suggest a Referral" | Now emails via Resend |
| "Need a Service?" requests | Posts to Supabase, login-gated |
| Public requests board | `/{neighborhood}/requests/` — counts when logged out, contacts when logged in |
| Admin triage | `/admin/` — filter, sort, status, delete |
| Email notifications | 3 Netlify Functions, all responding in production |
| Auth | Supabase email/password, SMTP routed through Resend |
| Multi-admin | `admins` table (2 accounts) |

### Built but not deployed

Password reset (helpers + `/reset-password/` page) · global `/login/` page · site-wide login-status bar · admin empty/loading states · admin status-failure handling · requests-page error/empty separation · auth double-submit protection · admin mobile-responsive table · Interior Designers category + Doubet Interiors listing · design-detector config

---

## What's missing

### 1. Blocking — do these first

| # | Gap | Why it matters |
|---|---|---|
| 1.1 | **12 unpushed commits** | Two weeks of work invisible to users |
| 1.2 | **Leaked-password protection still off** | Confirmed disabled by Supabase advisor. Public signup is open. Dashboard toggle — Authentication → Password settings |
| 1.3 | **Reset-password redirect URLs unverified** | Supabase must allowlist `https://trustedneighbors.net/reset-password/` and `http://localhost:4321/reset-password/`, or reset links silently go to the wrong place |
| 1.4 | **Referral + suggestion emails never tested in production** | The functions respond, but no confirmed end-to-end send since the Formspree→Resend swap. Only `notify-request` was verified |

### 2. SEO foundations — currently absent

The project's stated reason for existing on Astro is that crawlers and AI readers get real pre-rendered HTML. That half is done well. The surrounding SEO infrastructure was never built:

| # | Gap | Impact |
|---|---|---|
| 2.1 | `site` is commented out in `astro.config.mjs` | No canonical URLs; sitemap generation impossible until set |
| 2.2 | No `sitemap.xml` | Crawlers discover pages only by following links |
| 2.3 | No `robots.txt` | No crawl directives, no sitemap pointer |
| 2.4 | No 404 page | Broken URLs render Netlify's generic default |

All four are small. Together they're the highest value-per-hour work remaining.

### 3. Data-model debt — blocks the admin CMS

| # | Gap | Consequence |
|---|---|---|
| 3.1 | **Categories are free display text with no stable IDs** | The name flows `sub.name` → `<option>` → `service_requests.category` → admin filter. Renaming a category through a CRUD UI would orphan every historical request. **Fix before building any edit UI** |
| 3.2 | `ReferralModal.astro` carries a dead 37-option hardcoded category list | Unreachable today, but silently rots the moment categories become editable |
| 3.3 | `email` (27 listings) and `website` (15 listings) exist in data, never rendered | Either surface them or drop them |
| 3.4 | `address` / `serviceArea` are rendered by `ListingRow.astro` but exist in **zero** listings | Dead code path building a Google Maps link nobody sees |

### 4. Security & quality

| # | Gap | Assessment |
|---|---|---|
| 4.1 | `/admin/` is a static file | The **data** is properly protected by RLS — this is real security, not theatre. The *page* is publicly fetchable. Fix by adding `@astrojs/netlify` and setting `prerender = false` on that one route |
| 4.2 | Zero automated tests | Every change is verified by hand. Acceptable at this size; a real risk once the CMS lands |
| 4.3 | Supabase anon key committed in source | **Intentional and correct** — it's the publishable key, protected by RLS. Not a defect |

Security work already completed this cycle: locked `search_path` on the notification trigger, revoked its public RPC access, and replaced a `SECURITY DEFINER` view bypass with column-scoped anonymous grants. Anonymous users can no longer read `name`, `phone`, `email`, or `notes` — enforced by the database, verified by direct API calls.

---

## Roadmap

### Phase 1 — Foundation ✅ complete

Service requests, accounts, admin triage, Resend migration, password reset, global login, security hardening.

### Phase 2 — Ship and configure ⏱ ~1 hour

1. `git push origin main`, confirm Netlify deploys
2. Verify `/login/`, `/reset-password/` respond in production
3. Enable leaked-password protection
4. Add both reset-password redirect URLs to Supabase
5. Send one real referral and one suggestion; confirm both arrive

**Done when:** every shipped feature works on trustedneighbors.net, not just localhost.

### Phase 3 — SEO foundations ⏱ ~2 hours

1. Set `site: 'https://trustedneighbors.net'` in `astro.config.mjs`
2. Add `@astrojs/sitemap`, exclude `/admin/`, `/login/`, `/reset-password/`
3. Write `public/robots.txt` pointing at the sitemap, disallowing those same routes
4. Build `src/pages/404.astro` linking to the four neighborhoods
5. Add per-page `<meta name="description">` and Open Graph tags to neighborhood pages

**Done when:** a sitemap lists all four directories and Search Console accepts it.

### Phase 4 — Admin CMS ⏱ largest phase, needs its own plan

Move 502 listings from static JSON into Supabase, give the admin full CRUD, and trigger a Netlify build hook on save so pages stay pre-rendered.

**Decided:** database + auto-rebuild. Edits go live 1–2 minutes after saving, and crawler-visible HTML is preserved. Client-side fetching was explicitly rejected — that's the exact regression the Astro rewrite fixed.

Sequence:

1. **Stable IDs first** (gap 3.1) — schema with real primary keys, backfill `service_requests.category` to reference them. Everything else depends on this
2. Schema: shared `groups` / `subcategories` tables + per-neighborhood join. The taxonomy is global — all four files share the same 8 groups; they differ only by omission. Do **not** model four independent trees
3. Migrate the JSON, keeping it in git as a fallback until the DB is proven
4. Swap `getStaticPaths` to read from Supabase at build time
5. Admin CRUD UI for groups, subcategories, listings
6. Netlify build hook on save + a visible "publishing…" state, since edits aren't instant
7. Delete the dead fallback (3.2), resolve the unused fields (3.3, 3.4)
8. Add `@astrojs/netlify`, set `prerender = false` on `/admin/` for real server-side gating (4.1)

### Phase 5 — Polish and hardening

Automated tests around the auth and request paths · request expiry (past-dated requests still show as open) · admin pagination (fine at 1 row, not at 500) · rate-limiting on request submission · accessibility pass.

---

## Decisions already made

Recorded so they don't get relitigated:

| Decision | Rationale |
|---|---|
| **Stay on Astro** | The value prop is pre-rendered HTML for crawlers. Next/Remix would add a runtime and buy nothing |
| **DB + rebuild, not live fetch** | Preserves SEO. Client-fetching listings is the regression Astro was adopted to fix |
| **Anonymous users see counts only** | Names and phone numbers require an account. Enforced at the database |
| **One global `/login/`** | Replaced two inline auth forms rather than extracting a shared component — net code reduction |
| **Admin gated by `admins` table** | Not a role system. Add a row to grant access |
| **Resend for all email** | Formspree fully removed. Domain verified; Supabase SMTP routes through it |

## Open questions

- **Request lifecycle** — should past-dated requests auto-close, or stay until an admin closes them?
- **Sir Seth's access** — does he need an admin account, or does he only own Netlify/DNS?
- **Referral moderation** — referrals email in, then get hand-added to JSON. Should Phase 4's CMS absorb that into a review queue?
- **`.impeccable/config.json`** — currently committed. Should it be gitignored alongside `.claude/` and `.codex/`?
