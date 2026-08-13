# Auth, Requests, and Admin UI/UX Fixes — Design

## Context

The user asked for a broad UI/UX fix pass across "the accounting system, logging in, reset/forgot password, registration, the calendar, the need a service [feature], and everything that is new feature... especially the admin." Clarified in conversation:

- "Accounting system" = the existing login/logout accounts gating the "Need a Service?" feature (not invoicing/payments — no such feature exists or is wanted).
- "Calendar" = the existing `date_needed` field/date picker on service requests, not a request for a new calendar UI. (A real calendar view already exists at `/{neighborhood}/requests/` — built after `HANDOFF.md`/`ROADMAP.md` were last updated, so those docs are stale relative to the code.)

Agreed approach: audit the real pages/flows first, present concrete findings, then fix in priority order — rather than guessing at problems. The audit is done; this doc records what it found and the fix plan. Scope is the areas the user named (auth, the requests/calendar page, admin) — not a full site-wide pass over the homepage/nav/neighborhood pages.

## Findings, in fix order

1. **Admin login is broken.** `src/pages/admin.astro` decides server-side whether to render the login form or the console by reading an `sb-access-token` cookie (`Astro.cookies.get(...)`). That cookie is only ever set by an `onAuthStateChange` listener that lives in `src/lib/auth.js`. `src/scripts/admin.js` signs in by calling `supabase.auth.signInWithPassword()` directly against the client from `src/lib/supabase.js` — it never imports `src/lib/auth.js`, so the listener that sets the cookie is never registered on `/admin/`. After a successful sign-in, `admin.js` calls `window.location.reload()`, which re-runs the server-side check, finds no cookie, and re-renders the login form — even though the client does hold a valid session in localStorage. Every other page that needs auth (`/login/`, `/reset-password/`, `/{neighborhood}/requests/`) imports `src/lib/auth.js` and is unaffected.

2. **Native `alert()`/`confirm()`/`prompt()` dialogs** are used for destructive-action confirmation and error/edit flows in `src/scripts/admin.js`, `src/scripts/admin-directory.js`, and `src/scripts/login-page.js`, inconsistent with the custom-styled UI used everywhere else in those same files.

3. **No confirm-password field at registration** (`src/pages/login.astro`'s `#viewRegister`), while `/reset-password/` has one. A mistyped password at signup is easy to create and currently uncaught client-side.

4. **`/reset-password/` is visually a different product** from `/login/` — plain system font, a different green (`#1a3a2a` vs. the brand's `--color-primary: #064E3B`), no logo/nav — despite being reached mid-flow from a branded email link.

5. **Stuck "Verifying your account session…" notice.** `src/scripts/login-page.js`'s `initPage()` shows this notice when the URL contains an auth token/code, but never clears it if the subsequent `getSession()` call comes back empty — it can stay visible indefinitely alongside the (now showing) login form.

6. **Calendar day cells aren't keyboard-accessible.** `src/scripts/requests-page.js`'s `.calendar-cell` elements are `<div>`s with only a `click` listener — not focusable, not activatable via keyboard, not announced as interactive.

7. **Modals have no focus management.** The request-detail modal (`requests-page.js`) and the admin "Add Listing" modal (`admin-directory.js`) don't trap focus, don't close on Escape, and don't return focus to the triggering element on close.

8. **Admin's tab bar likely overflows on narrow screens.** `.tabs` in `admin.astro` is an unwrapped flex row of 4 text-heavy buttons (Service Requests / Referral Suggestions / Admin Roles / Directory CMS) with no wrap or horizontal-scroll handling.

9. **Password requirements only shown as placeholder text**, which disappears on focus — no persistent helper text under the password field at registration or reset.

## Fix approach per finding

1. Change `admin.js`'s login handler to go through the shared `signIn()` in `src/lib/auth.js` instead of calling `supabase.auth.signInWithPassword()` directly — importing `auth.js` registers its cookie-syncing listener, which is the actual fix (root cause, not a cookie hack bolted onto `admin.js`). Verify manually in a real browser: log into `/admin/`, confirm the reload lands in the console, not back at login.
2. Replace `alert()`/`confirm()`/`prompt()` call sites with the app's existing inline notice/error element pattern (already used in `login.astro`/`login-page.js` via `.auth-error`/`.auth-notice`) and a small custom confirm-dialog treatment reused across the destructive actions, matching admin's existing `.card`/modal visual language. `prompt()`-based group editing becomes an inline edit form using the same pattern as the existing "Add Listing" modal.
3. Add a second password field + client-side match check to `#viewRegister` in `login.astro`, mirroring `reset-password.js`'s existing match-check logic.
4. Restyle `/reset-password/` using `login.astro`'s existing design tokens/card/logo treatment instead of its current standalone styling — same visual system, not a new one.
5. Clear the "Verifying…" notice in `login-page.js`'s `initPage()` when it falls through to showing the auth form (no session found).
6. Make `.calendar-cell` real `<button>` elements (or add `tabindex="0"`, `role="button"`, and a `keydown` handler for Enter/Space) for cells that have data, matching how `.auth-tab` buttons are already implemented elsewhere in this codebase.
7. Add a shared small focus-trap + Escape-to-close behavior to both modals — reuse one helper rather than duplicating it in `requests-page.js` and `admin-directory.js`, consistent with this codebase's existing pattern of small shared `esc()`-style helpers per script file. Store and restore `document.activeElement` on open/close.
8. Add `overflow-x: auto` + `flex-wrap` fallback (or a horizontal scroll container, matching the existing `.table-scroll` pattern already used for admin's tables) to `.tabs` in `admin.astro`.
9. Add persistent helper `<p>` text under the password fields in `login.astro` (register) and `reset-password.astro`, styled like the existing `.form-group label`/muted-text treatment.

## Non-goals

- No new features (no invoicing/payments, no new calendar UI — both already confirmed as not wanted).
- No full audit of the homepage (`index.astro`), neighborhood pages, or nav — out of scope for this pass.
- No introduction of a new dependency or JS framework — all fixes stay within this codebase's existing vanilla-JS, per-script-file conventions (see `HANDOFF.md`'s "Working conventions").
- No change to the RLS/security model — finding #1's fix is purely about the client establishing the cookie the existing server-side check already expects; it doesn't change what that check does.

## Verification

No test framework exists in this repo (established gap, see `HANDOFF.md`). Verification is manual: `npm run build` after each change, then `npm run dev` and click through the affected flow in a real browser — matching how every other feature in this codebase has been verified. Finding #1 specifically needs a real login attempt against a real admin account to confirm the reload no longer bounces back to the login screen.
