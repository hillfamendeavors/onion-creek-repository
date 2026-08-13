# User Account Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `/login/` authenticated page into an intuitive, feature-rich User Account Hub with custom avatar upload/preview, primary neighborhood preferences, saved favorites tab, submitted referrals tracker, and streamlined service request management.

**Architecture:** Extend `src/pages/login.astro` HTML layout and `src/scripts/login-page.js` logic. Store profile metadata (avatar_url, primary_neighborhood, saved_listings) in Supabase user metadata / `profiles` table.

**Tech Stack:** Astro, Vanilla JS, Supabase Client SDK, HTML5 File API (DataURL / FileReader).

## Global Constraints
- Single Page App feel on `/login/` without adding external JS frameworks (Vanilla JS only).
- Theme colors dynamically inherit from neighborhood theme (`--color-primary`, `--color-accent`, etc.).
- Default avatar image fallback points to `/images/default-avatar.jpg`.

---

### Task 1: Profile Customization & Hero Header (Avatar Upload & Neighborhood Preference)

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/scripts/login-page.js`
- Test: Manual browser test on `/login/` when authenticated

**Interfaces:**
- Consumes: Supabase `supabase.auth.getUser()`, `updateProfile()`
- Produces: `avatar_url`, `neighborhood_slug` saved in user metadata & `profiles` table.

- [ ] **Step 1: Update `login.astro` HTML markup for Profile Hero & Account Form**
  Add avatar upload input `<input type="file" id="avatarFileInput" accept="image/*" style="display:none;" />`, avatar overlay camera icon button, primary neighborhood `<select id="prof-neighborhood">`, and neighborhood resident badge `<span id="neighborhoodBadge" class="pill-tag neighborhood">`.

- [ ] **Step 2: Update `login-page.js` script logic for Avatar Upload & Neighborhood Saving**
  Add file change listener to `avatarFileInput` to read file via `FileReader`, update `#userAvatar` image source, save base64 data to user metadata/profile, and save primary neighborhood.

- [ ] **Step 3: Test profile saving in browser**
  Upload image, select primary neighborhood, click "Save Profile", verify changes persist across refresh.

---

### Task 2: Account Sub-Tabs & Saved Favorites Hub

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/scripts/login-page.js`
- Modify: `src/scripts/directory.js`

**Interfaces:**
- Consumes: `profiles.saved_listings` array in user metadata / Supabase
- Produces: Interactive bookmark toggle on public directory cards & Saved Recommendations tab in Account Hub.

- [ ] **Step 1: Add Account Sub-Tab navigation buttons to `login.astro`**
  Add tabs: `Requests`, `Saved Recommendations`, `My Referrals`, `Settings`.

- [ ] **Step 2: Add Bookmark Star / Heart icon on public directory listing cards in `directory.js`**
  Wire click listener to toggle saved listings array in user metadata / localStorage.

- [ ] **Step 3: Render Saved Recommendations grid in `login-page.js`**
  Fetch saved listing objects, display clean cards with Business Name, Phone, Category, Neighborhood, and `Remove` button.

---

### Task 3: My Referrals Tracker & + Post Request Modal

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/scripts/login-page.js`

**Interfaces:**
- Consumes: `referral_suggestions` table where `referrer_email = user.email`
- Produces: Referrals tracker tab and `+ Post New Request` modal trigger.

- [ ] **Step 1: Add Referral Suggestions tracker renderer in `login-page.js`**
  Fetch `referral_suggestions` by `referrer_email`, display status pills (`Under Review`, `Approved & Published`, `Rejected`).

- [ ] **Step 2: Add `+ Post Service Request` Modal HTML & JS trigger**
  Add modal with neighborhood, category, date needed, notes fields, submit handler inserting into `service_requests`.

- [ ] **Step 3: Verify build with `npm run build`**
  Run build command to guarantee zero build errors.
