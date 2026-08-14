# Specification: Directory CMS Neighborhood Scoping & Minimalist UI

**Date:** 2026-08-15  
**Status:** Approved  
**Topic:** Admin Directory CMS Segmented Neighborhood Filter & Minimalist Architecture

---

## 1. Goal
Provide a streamlined, neighborhood-scoped CMS interface in `/admin/directory/` where administrators can focus exclusively on a single neighborhood's business directory (e.g. Onion Creek, Circle C, Avery Ranch, Sunfield) or switch seamlessly to view all neighborhoods globally, designed under the **Minimalist UI** editorial standard.

---

## 2. Architecture & Design

### 2.1 Segmented Neighborhood Switcher Bar
Located immediately above the Directory CMS table and filter bar:
- Tabs:
  - **All Neighborhoods** (with dynamic badge count)
  - **Onion Creek** (with dynamic badge count)
  - **Circle C** (with dynamic badge count)
  - **Avery Ranch** (with dynamic badge count)
  - **Sunfield** (with dynamic badge count)
- Behavior:
  - Clicking any tab filters the CMS view immediately.
  - Active tab is highlighted with off-black background (`#111111`) and white text (`#FFFFFF`) with a `4px` border-radius.
  - Inactive tabs have transparent backgrounds with subtle hover state (`#F3F4F6`).
  - Active neighborhood preference is persisted in browser session (`sessionStorage` / `localStorage`).

### 2.2 Scoped Context Actions
When a specific neighborhood (e.g., "Onion Creek") is active:
1. **Listings Table:** Displays only businesses belonging to that neighborhood.
2. **Category Filter Dropdown:** Scopes only to subcategories that have listings or are enabled in that neighborhood (`neighborhood_subcategories`).
3. **Reordering (`▲` / `▼`):** Rearranges listings within that specific neighborhood's category.
4. **"+ Add Business Listing" Button:** Automatically pre-selects the active neighborhood in the modal.
5. **Featured Toggle:** 1-click toggling for featured providers within that community.

### 2.3 Minimalist UI Aesthetic Directives
- **Palette:** Warm monochrome (`#FFFFFF`, `#F9F9F8`, `#111111`, `#787774`) with ultra-fine `1px solid #EAEAEA` borders.
- **Accents:** Muted pastels:
  - Neighborhood Tag: `#EDF3EC` background, `#346538` text.
  - Category Tag: `#E1F3FE` background, `#1F6C9F` text.
  - Featured Tag: `#FBF3DB` background, `#956400` text.
- **Iconography:** Clean typographic arrows (`▲`, `▼`) and minimalist text badges; no emojis in code or UI copy.

---

## 3. Component & File Scope

### Modified Files:
- [`src/pages/admin/directory.astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin/directory.astro):
  - Add segmented neighborhood switcher markup with dynamic count pills.
  - Apply minimalist UI tokens and container structures.
- [`src/scripts/admin-directory.js`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/scripts/admin-directory.js):
  - Wire segmented neighborhood switcher clicks.
  - Maintain active neighborhood state.
  - Calculate per-neighborhood listing counts and update tab badges.
  - Scope category filter and Add/Edit modals to the active neighborhood.
- [`src/layouts/AdminLayout.astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/layouts/AdminLayout.astro):
  - Ensure minimalist UI styles and CSS variables support clean segmented bars and muted pastel chips.

---

## 4. Verification & Testing
- Test clicking between All Neighborhoods and individual neighborhood tabs.
- Verify listing counts on tabs update dynamically upon adding, editing, or deleting listings.
- Verify "+ Add Business Listing" defaults to the active neighborhood tab.
- Verify `npm run build` exits with code 0.
