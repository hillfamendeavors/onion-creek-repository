# Public Requests List & User Accounts — Design

## Context

The site already lets any visitor anonymously post a service request ("I need a plumber on this date") which only the site admin can see, via `/admin/`. The user now wants any neighbor to be able to see who's requesting what and reach out directly — turning the request feature from an admin-only lead intake into a lightweight, visible neighbor-to-neighbor board. This requires real user accounts (not just the single admin account that exists today) and a privacy model for what's visible before vs. after logging in.

## Goals

- Any neighbor can register an account and, once logged in, both post a request and see the full details (name, phone, email, notes) of other open requests in their neighborhood, reaching out via `tel:`/`mailto:` links.
- Logged-out visitors see only that requests exist — aggregate counts per category/date, no identifying information — never raw contact details.
- The single admin (Seth Hill) keeps exclusive ability to change request status or delete requests, and exclusive access to `/admin/` — regular registered neighbors must not get those powers just by having an account.

## Non-goals

- In-app messaging — contact happens via the visitor's own phone/email app (`tel:`/`mailto:` links), not a message system inside the site.
- Business/provider-specific registration — accounts are for any neighbor, not a separate "business" account type.
- A real calendar/month-grid UI — this is a simple list sorted by date needed.
- Multi-admin roles/permissions system — admin stays gated by a single hardcoded email match, matching the existing single-admin setup.

## Data model & permissions changes (Supabase)

`service_requests` RLS policies change from the current (anonymous-post, admin-only-read) model to:

| Operation | Role | Rule |
|---|---|---|
| `INSERT` | `authenticated` | any logged-in user (was: `anon`, any visitor) |
| `SELECT` | `authenticated` | any logged-in user (unchanged — this already existed for the admin build, and "authenticated" now includes regular neighbors too) |
| `UPDATE` | `authenticated`, admin email only | tightened from "any authenticated user"; admin email is `hillfamendeavors@gmail.com` |
| `DELETE` | `authenticated`, admin email only | tightened from "any authenticated user"; admin email is `hillfamendeavors@gmail.com` |

A new public Postgres view, e.g. `service_requests_public_counts`, aggregates `(neighborhood, category, date_needed, count(*))` for rows where `status <> 'closed'`, with `SELECT` granted to the `anon` role. This is the only thing logged-out visitors can query — the base table has no `anon` policies left at all once this ships.

Supabase Auth's public sign-up (email + password, with Supabase's standard email-confirmation step) is enabled for this project — previously only the one admin account existed; this opens registration to any visitor.

## UI changes

**`RequestModal.astro` / `directory.js`:** on open, check for a Supabase Auth session. No session → show an inline login/signup form (email + password) in place of the request fields; on success, swap to the existing request form without closing the modal. Existing session → opens straight to the request form (no behavior change from today).

**New route `src/pages/[neighborhood]/requests.astro`** (or equivalent per-neighborhood requests page): fetches from `service_requests_public_counts` when logged out, rendering aggregate lines like "Plumbers needed — Aug 20 — 1 request," with a login/signup prompt. When logged in, fetches full rows from `service_requests` filtered to that neighborhood and `status <> 'closed'`, sorted by `date_needed`, rendering name/phone/email/notes with `tel:`/`mailto:` links. Linked via a new nav button on the existing neighborhood page.

`admin.js`'s existing "any valid session shows the admin app" check is replaced with a check that the session's email is exactly `hillfamendeavors@gmail.com` — otherwise a regular neighbor who registers could log into `/admin/` and get status-change/delete powers that should stay admin-only.

## Out of scope (explicitly not building)

- In-app messaging system.
- Separate "business" registration flow.
- Month-grid calendar UI.
- General multi-admin roles/permissions infrastructure.
