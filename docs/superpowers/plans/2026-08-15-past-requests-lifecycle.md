# Past Requests Lifecycle & Reschedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete lifecycle handling for past-due service requests: date input locking (`min=today`), amber `⏰ Past Date` status badges for unfulfilled requests, an owner 1-click reschedule workflow, and an organized list view separating Upcoming and Past requests.

**Architecture:** Frontend date constraints dynamically calculated from local date (`YYYY-MM-DD`); badge styling and card states updated in CSS and JS; owner reschedule handler triggers Supabase single-row update to `date_needed` with instant re-render.

**Tech Stack:** Astro, Vanilla JS / CSS, Supabase JS Client

## Global Constraints
- Timezone-safe local date calculation via `new Date().toLocaleDateString('en-CA')`.
- Mobile-first responsive styling complying with `.agents/rules/responsive-design-default.md`.
- Supabase best practices complying with `.agents/rules/supabase-postgres-best-practices-default.md`.

---

### Task 1: Add Date Guard to Request Submission Inputs
**Files:**
- Modify: `src/scripts/directory.js`
- Modify: `src/scripts/account-page.js`

- [ ] **Step 1: Set `min` attribute on date inputs on modal open / page load**
- [ ] **Step 2: Add validation check in submit handlers to reject dates earlier than today**
- [ ] **Step 3: Test modal date picker blocks past dates**

---

### Task 2: Add Badges and Reschedule Button Styles to CSS
**Files:**
- Modify: `src/styles/directory.css`

- [ ] **Step 1: Add `.status-badge.past` styling (amber background and text)**
- [ ] **Step 2: Add `.btn-owner-action.reschedule` styling (blue interactive button)**
- [ ] **Step 3: Add `.requests-section-heading` styling for List View sections**

---

### Task 3: Implement Past Date Badges and Reschedule Action on Requests Page
**Files:**
- Modify: `src/scripts/requests-page.js`

- [ ] **Step 1: Add `isPastDate(dateStr)` helper**
- [ ] **Step 2: Update `openDetailModal` to show `⏰ Past Date` for unfulfilled past requests and render `📅 Reschedule` button for owners**
- [ ] **Step 3: Wire `📅 Reschedule` click event to prompt for a new date (`>= today`) and update `service_requests.date_needed` in Supabase**
- [ ] **Step 4: Update `renderList` to separate requests into "Upcoming Requests" and "Past Requests"**

---

### Task 4: Implement Past Date and Reschedule on Account Dashboard
**Files:**
- Modify: `src/scripts/account-page.js`

- [ ] **Step 1: Update `loadUserServiceRequests` to display `⏰ Past Date` badge if `date_needed < today` and unfulfilled**
- [ ] **Step 2: Add `📅 Reschedule` action button in the action cell for active/past requests**
- [ ] **Step 3: Wire reschedule handler on `/account/`**

---

### Task 5: Build Verification & Manual Testing
**Files:**
- Test with: `npm run build`

- [ ] **Step 1: Run `npm run build` to verify 0 errors**
- [ ] **Step 2: Verify all components render properly**
