# Past Requests Lifecycle & Reschedule Design

## Overview
This feature introduces lifecycle management for past-dated service requests across the calendar, requests list, modal views, and user account page. It prevents past-date selection on creation, clearly marks past-due unfulfilled requests with an amber status badge, organizes the list view into Upcoming and Past sections, and gives request owners a 1-click reschedule action to move requests to future dates.

---

## 1. Requirements & User Stories
- **R1: Date Selection Guard**
  - All request submission date pickers (`#r-date` in `RequestModal.astro`, `#usrReqDate` in `account.astro`) must enforce `min="YYYY-MM-DD"` set to today's local date.
  - Client-side validation prevents submission if `date_needed < today`.
- **R2: Visual State for Past Requests**
  - If `date_needed < today` and `status === 'new'`: Card displays an amber status badge `⏰ Past Date`.
  - If `date_needed < today` and `status === 'completed'`: Card displays `✓ Fulfilled` with scratched-off/grayed-out styling.
- **R3: 1-Click Reschedule for Request Owners**
  - In modal, list view, and `/account/` dashboard, owners of unfulfilled requests can click `📅 Reschedule`.
  - Prompt or date selector allows picking a new date (`>= today`).
  - Database updates `date_needed`, reloads data, and re-renders calendar/list without needing to delete and recreate.
- **R4: List View Organization**
  - List View groups entries into **Upcoming Requests** (primary, sorted by date ascending) and **Past Requests** (clearly marked with past dates and fulfillment statuses).

---

## 2. Architecture & Components

### 2.1 Date Guard Implementation
- In `src/scripts/directory.js` and `src/scripts/account-page.js`:
  - When DOM loads or modal opens, compute `todayStr = new Date().toISOString().split('T')[0]`.
  - Set `min` attribute on `#r-date` and `#usrReqDate`.
  - In submit handlers, validate `date_needed >= todayStr`.

### 2.2 CSS Styles (`src/styles/directory.css`)
- Add badge style for `.status-badge.past`:
  - Amber background (`#FEF3C7`), dark amber text (`#92400E`), and border (`#FCD34D`).
- Add button style for `.btn-owner-action.reschedule`:
  - Blue accent (`background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;`).

### 2.3 Requests Page Logic (`src/scripts/requests-page.js`)
- Helper: `isPastDate(dateStr)`: returns `true` if `dateStr < todayStr`.
- In `openDetailModal`:
  - For unfulfilled past requests, display `<span class="status-badge past">⏰ Past Date</span>`.
  - For owners, include `📅 Reschedule` button alongside `✓ Mark as Fulfilled` and `✕ Cancel Request`.
  - Wire click handler for reschedule to prompt for a new date (with `min=today`) and update Supabase `service_requests.date_needed`.
- In `renderList`:
  - Split requests into `upcoming` (`date_needed >= todayStr`) and `past` (`date_needed < todayStr`).
  - Render separate headings: `Upcoming Requests` and `Past Requests`.
- In `renderCalendar`:
  - Past dates with open requests show muted pill or `⏰` indicator.

### 2.4 Account Page Logic (`src/scripts/account-page.js`)
- In `loadUserServiceRequests`:
  - Check if `date_needed < todayStr` and `status === 'new'`.
  - Render status badge as `⏰ Past Date`.
  - Include `📅 Reschedule` action button in the action column.

---

## 3. Error Handling & Edge Cases
- **Timezone Safety**: Local date string calculation uses `new Date().toLocaleDateString('en-CA')` (which outputs `YYYY-MM-DD` in local time) to prevent UTC vs local day mismatch.
- **Network / Supabase Updates**: Reschedule updates update `service_requests` table with single row update `.eq('id', id)`. Error triggers feedback message and resets button state.

---

## 4. Verification Plan
1. **Date Picker Validation**: Open "Need a Service?" modal; verify yesterday cannot be selected in date picker.
2. **Past Date Badge**: Inspect requests with dates before today; verify amber `⏰ Past Date` badge appears.
3. **Reschedule Action**: Click `📅 Reschedule`, select a future date, verify request moves to the new calendar cell and list updates.
4. **Build Verification**: Run `npm run build` to confirm 0 compilation errors across all pages.
