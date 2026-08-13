# Admin Console: Users Tab Actions + Overview Tab — Design

## Context

Following the earlier UI/UX fix pass and the new Users tab (`docs/superpowers/specs/2026-08-14-auth-admin-uiux-fixes-design.md`), the user asked for the admin to be able to trigger a password reset for a registered user, plus more admin-console feature suggestions. Four small, no-new-schema features were agreed on.

## Features

1. **Admin-triggered password reset.** A "Send Reset" button per row in the Users tab. Calls the existing `requestPasswordReset(email)` from `src/lib/auth.js` — the same public Supabase Auth call the site's own "Forgot Password" flow already uses. No new backend, no service-role secret. Feedback via the existing `showToast()` from `ui-feedback.js`. No confirm dialog — sending an email isn't destructive.

2. **Quick "Grant Admin" from the Users tab.** A button per row that inserts `{ email }` into `admins`, identical to the existing `grantAdminBtn` logic in `admin.js`'s Admin Roles tab. `admin-users.js` additionally fetches `admins` alongside `profiles`/`service_requests` so a row for an existing admin shows a static "Already Admin" label instead of the button. No confirm dialog, matching the existing Admin Roles tab's own grant action (only revoke/delete actions get a confirm dialog in this codebase's established pattern).

3. **Mailto link on user emails.** Each user's email in the Users tab becomes `<a href="mailto:...">` instead of plain text.

4. **Overview tab.** A new sidebar item, first in the list (ahead of Service Requests), becomes admin's new default landing tab. Three stat cards, reusing the existing `.card` class (no icons — keeps this codebase's plain/utilitarian admin aesthetic, per `HANDOFF.md`): total registered users (`profiles` count), open service requests (`service_requests` where `status <> 'closed'`), pending referral suggestions (`referral_suggestions` where `status = 'new'`). New `src/scripts/admin-overview.js`, following the established one-script-per-tab convention (`admin-directory.js`, `admin-users.js`).

## Data model

No migration. All four features read/write tables that already exist: `profiles`, `admins`, `service_requests`, `referral_suggestions`.

## UI changes

- `src/pages/admin.astro`: add `tabOverviewBtn` as the first sidebar link (now `.active` by default instead of `tabRequestsBtn`); add `tab-overview` markup (three stat cards) as the first tab panel, hidden by default like the others except it starts visible; `tab-requests` starts hidden instead. Add a "Send Reset" and "Grant Admin"/"Already Admin" cell to the Users table's column set.
- `src/scripts/admin.js`: add `tabOverviewBtn` to the tab-switching `ALL_TABS` array and the show/hide id list; wire its click to dispatch an `overview-tab-shown` event (matching the existing `directory-tab-shown`/`users-tab-shown` pattern); on initial load (where it currently does `loadRequests(); loadReferrals();`), also trigger the overview load and make it the visible tab instead of `tab-requests`.
- `src/scripts/admin-users.js`: fetch `admins` alongside existing queries; add the "Send Reset" button (calls `requestPasswordReset`) and the "Grant Admin"/"Already Admin" cell to each row's template; wrap email in a mailto link.
- `src/scripts/admin-overview.js` (new): lazy-loads once on first `overview-tab-shown` (matching `admin-users.js`'s `loaded` guard pattern), runs three count queries in parallel, renders three stat cards.

## Out of scope

- Deleting/deactivating a user account, admin-created invites, and a full audit log — all need a service-role secret / new backend infra, explicitly deferred to a future round per the user's own bucketing in this conversation.
- Search/filter on the Users tab — not requested, and at 2 current users there's nothing to filter yet (YAGNI).
