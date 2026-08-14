# Admin Service Requests Management & Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable administrators to manage and edit service requests in full (name, phone, email, neighborhood, category, date needed, status, notes) from both the Admin Portal (`/admin`) and directly on community request pages (`/[neighborhood]/requests/`).

**Architecture:** 
- Admin Portal: Add Edit Request Modal in `src/pages/admin.astro` and wire handlers in `src/scripts/admin.js`.
- Calendar Page: Add in-page Admin Edit Modal in `src/pages/[neighborhood]/requests.astro` and wire admin check + handlers in `src/scripts/requests-page.js`.
- CSS: Add styling for `.btn-action-edit` and `.btn-owner-action.admin-edit`.

**Tech Stack:** Astro, Vanilla JS / CSS, Supabase JS Client

---

### Task 1: Admin Portal Edit Modal Markup and Styles
**Files:**
- Modify: `src/pages/admin.astro`
- Modify: `src/styles/directory.css`

- [ ] **Step 1: Add `#editRequestModal` HTML structure in `src/pages/admin.astro`**
- [ ] **Step 2: Add styles for `.btn-action-edit` and edit modal in `src/styles/directory.css`**

---

### Task 2: Admin Portal Edit Script Logic
**Files:**
- Modify: `src/scripts/admin.js`

- [ ] **Step 1: Update `STATUSES` to include `completed`**
- [ ] **Step 2: Render "Edit" button in each request row**
- [ ] **Step 3: Wire edit button click to open and populate `#editRequestModal`**
- [ ] **Step 4: Wire form submit to update `service_requests` table in Supabase and refresh table**

---

### Task 3: In-Page Calendar Admin Edit Modal Markup
**Files:**
- Modify: `src/pages/[neighborhood]/requests.astro`

- [ ] **Step 1: Add `#adminRequestEditModal` markup at the bottom of `requests.astro`**

---

### Task 4: In-Page Calendar Admin Edit Script Logic
**Files:**
- Modify: `src/scripts/requests-page.js`
- Modify: `src/styles/directory.css`

- [ ] **Step 1: Add `checkIsAdmin` query in `init()` to set `userIsAdmin = true`**
- [ ] **Step 2: Render `🛡️ Admin Edit` button on all request cards when `userIsAdmin` is true**
- [ ] **Step 3: Wire click and submit handlers for `#adminRequestEditModal` to update Supabase and call `reloadData()`**
- [ ] **Step 4: Add `.btn-owner-action.admin-edit` styling in `src/styles/directory.css`**

---

### Task 5: Build Verification & Testing
**Files:**
- Test with: `npm run build`

- [ ] **Step 1: Run `npm run build` to verify 0 errors**
- [ ] **Step 2: Verify both admin portal and calendar in-page edit flows**
