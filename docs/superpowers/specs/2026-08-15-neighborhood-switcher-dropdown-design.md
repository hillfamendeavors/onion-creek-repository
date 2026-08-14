# Design Spec: Neighborhood Switcher Dropdown

## 1. Goal & Context
Provide residents and visitors with a fast, intuitive way to switch between Austin neighborhood directories directly from any directory or service calendar header, without needing to navigate back to the main landing page first.

---

## 2. Component & Layout Architecture

### A. Header Navigation Cluster
Located inside the `.logo-wrap` of:
* [`src/pages/[neighborhood].astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/pages/[neighborhood].astro)
* [`src/pages/[neighborhood]/requests.astro`](file:///c:/Users/marco/Documents/projects/onion-creek-repository/src/pages/[neighborhood]/requests.astro)

```html
<div class="directory-nav-cluster">
  <a class="header-link" href="/">← All Directories</a>
  <div class="neighborhood-switcher-wrap" id="neighborhoodSwitcher">
    <button type="button" class="neighborhood-switcher-btn" id="switchDropdownBtn" aria-expanded="false" aria-haspopup="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>Switch Directory</span>
      <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <div class="neighborhood-dropdown-card" id="switcherDropdownCard" style="display:none;" role="menu">
      <div class="dropdown-header">
        <span>Select Neighborhood</span>
      </div>
      <div class="dropdown-items-list">
        <!-- Dynamic Neighborhood Rows with Directory & Calendar links -->
      </div>
    </div>
  </div>
</div>
```

---

## 3. Dropdown Menu Data & Item Features

Each neighborhood entry in the popover includes:
1. **Neighborhood Name:** (e.g. *Sunfield, Buda*, *Onion Creek*, *Circle C*, *Avery Ranch*)
2. **Status Indicator:** Highlights the currently viewed neighborhood with an `Active` badge.
3. **Dual Direct Actions:**
   * Primary click: Navigates to that neighborhood's main Directory (`/[slug]/`).
   * Quick Calendar action: `[ 📅 Calendar ↗ ]` jumps directly to `/[slug]/requests/`.

---

## 4. Interaction & Accessibility
* **Toggle & Dismiss:** Clicking the switcher button toggles the popover. Clicking outside or pressing `Escape` closes it.
* **Keyboard Navigation:** Full focus trap / sequential tab order across directory links.
* **Responsive Behavior:** On mobile, the switcher and back button stack or flex neatly without header text truncation.

---

## 5. Implementation Plan Summary
1. Create a reusable component `src/components/NeighborhoodSwitcher.astro` (or embed in directory and calendar pages).
2. Add high-contrast, polished styling in `src/styles/directory.css`.
3. Add client interaction in `src/scripts/directory.js` and `src/scripts/requests-page.js`.
4. Test and verify build across all static routes.
