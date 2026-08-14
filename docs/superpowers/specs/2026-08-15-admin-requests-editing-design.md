# Admin Service Requests Management & Editing Design

## Overview
This feature equips administrators with full editing capabilities over community service requests in both the Admin Portal (`/admin`) and on community request pages (`/[neighborhood]/requests/`). Admins can modify any field on a service request (Name, Phone, Email, Neighborhood, Category, Date Needed, Status, and Notes).

---

## 1. Requirements & User Stories
- **R1: Admin Portal Edit Modal (`/admin`)**
  - Add an "✏️ Edit" button in the actions column of the service requests table in `/admin`.
  - Clicking "Edit" opens a modal pre-filled with the request's current data.
  - Fields editable: Name, Phone, Email, Neighborhood (dropdown), Category (text/dropdown), Date Needed (date picker), Status (`new`, `contacted`, `completed`, `closed`), and Notes (textarea).
  - Submitting updates Supabase `service_requests` table, shows toast confirmation, and refreshes the table.
- **R2: In-Page Calendar Admin Controls (`/[neighborhood]/requests`)**
  - Check if the logged-in user is an admin by querying the `admins` table.
  - If admin, render an "🛡️ Admin Edit" button on every request card in both the detail modal and list view.
  - Clicking "🛡️ Admin Edit" opens an in-page edit modal allowing admins to update any request details directly without navigating away.
  - Submitting updates Supabase and immediately calls `reloadData()` to refresh the calendar and list view.
- **R3: Status Options Synchronization**
  - Ensure `STATUSES` in `admin.js` includes `completed` (`['new', 'contacted', 'completed', 'closed']`).

---

## 2. Architecture & Components

### 2.1 Admin Portal Files
- `src/pages/admin.astro`: Add markup for `#editRequestModal` overlay and form.
- `src/scripts/admin.js`:
  - Add `STATUSES = ['new', 'contacted', 'completed', 'closed']`.
  - Add "Edit" button to table row rendering.
  - Wire modal open, populate, close, and submit handler to update Supabase.

### 2.2 Community Requests Page Files
- `src/pages/[neighborhood]/requests.astro`: Add markup for `#adminRequestEditModal` overlay and form.
- `src/scripts/requests-page.js`:
  - In `init()`, check `userIsAdmin = await checkIsAdmin(currentUser.email)`.
  - In `openDetailModal` and `renderList`, if `userIsAdmin`, render `🛡️ Admin Edit` button.
  - Wire `🛡️ Admin Edit` button to open `#adminRequestEditModal` with prefilled values.
  - Wire submit handler to update Supabase, reload data, and close modal.

### 2.3 CSS Styles (`src/styles/directory.css`)
- Add styles for `.btn-action-edit` in admin table.
- Add styles for `.btn-owner-action.admin-edit` (purple/indigo accent: `background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;`).

---

## 3. Verification Plan
1. Log into `/admin`, click "Edit" on a service request, change category/date/notes/status, click Save, and verify changes persist.
2. Visit `/[neighborhood]/requests/` as an admin, click "🛡️ Admin Edit" on any neighbor's request card, edit details, save, and verify instant calendar and modal update.
3. Verify with `npm run build` that all routes compile with 0 errors.
