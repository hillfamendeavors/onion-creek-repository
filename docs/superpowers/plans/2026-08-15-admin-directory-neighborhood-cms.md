# Directory CMS Neighborhood Scoping & Minimalist UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a clean segmented neighborhood selector in `/admin/directory/` to view and manage listings per neighborhood or globally, styled with Minimalist UI guidelines.

**Architecture:** Add a responsive segmented bar in `src/pages/admin/directory.astro` displaying All Neighborhoods + individual neighborhoods with live count badges. In `src/scripts/admin-directory.js`, maintain the active neighborhood filter state, update tab count badges, filter the category dropdown to only show active subcategories in that neighborhood, and pre-fill modals with the active neighborhood.

**Tech Stack:** Astro, Vanilla JavaScript, Supabase Postgres, Minimalist UI Design Tokens (Warm Monochrome + Muted Pastels).

---

## File Structure

- **Modify**: [`src/layouts/AdminLayout.astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/layouts/AdminLayout.astro) — Add segmented control styles and Minimalist UI muted pastel tokens.
- **Modify**: [`src/pages/admin/directory.astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin/directory.astro) — Add segmented neighborhood bar markup and refine table styling.
- **Modify**: [`src/scripts/admin-directory.js`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/scripts/admin-directory.js) — Add neighborhood tab switching, scoped category filtering, dynamic badge counting, and modal defaults.

---

## Bite-Sized Tasks

### Task 1: Add Minimalist UI Tokens and Segmented Control Styles
**Files:**
- Modify: `src/layouts/AdminLayout.astro`

- [ ] Add CSS for `.segmented-bar`, `.segmented-item`, `.segmented-badge`, and muted pastel tags (`.pill-tag.neighborhood`, `.pill-tag.category`, `.pill-tag.featured`).
- [ ] Ensure `1px solid #EAEAEA` borders and warm monochrome styling.

---

### Task 2: Update `directory.astro` with Segmented Neighborhood Switcher
**Files:**
- Modify: `src/pages/admin/directory.astro`

- [ ] Add `#neighborhoodSegmentedBar` with tabs:
  - `All Neighborhoods` (`#tabNb-all`)
  - `Onion Creek` (`#tabNb-onion-creek`)
  - `Circle C` (`#tabNb-circle-c`)
  - `Avery Ranch` (`#tabNb-avery-ranch`)
  - `Sunfield` (`#tabNb-sunfield`)
- [ ] Remove emojis and replace with clean minimalist text and geometric arrows.

---

### Task 3: Implement Neighborhood Scoping in `admin-directory.js`
**Files:**
- Modify: `src/scripts/admin-directory.js`

- [ ] Maintain `currentNeighborhood` state variable (default `'all'`).
- [ ] Wire click handlers for each segmented tab to switch `currentNeighborhood` and update active CSS classes.
- [ ] Calculate and display dynamic count badges on each tab (`All: 502`, `Onion Creek: 142`, etc.).
- [ ] Update `populateCategorySelects` to filter subcategories when a specific neighborhood is active.
- [ ] When "+ Add Business Listing" is clicked, pre-select the active neighborhood in the modal.
- [ ] When reordering (`▲` / `▼`), adjust sort order relative to the active neighborhood.

---

### Task 4: Verification & Build
- [ ] Run `npm run build` to verify clean build.
- [ ] Test switching between All Neighborhoods and each community tab.
- [ ] Test adding, editing, reordering, and deleting listings within a neighborhood.
