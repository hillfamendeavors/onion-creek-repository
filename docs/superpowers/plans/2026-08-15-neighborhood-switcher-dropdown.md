# Neighborhood Switcher Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a responsive Neighborhood Switcher Dropdown component across all directory and service calendar headers.

**Architecture:** Create a reusable Astro component `NeighborhoodSwitcher.astro` and wire styles in `directory.css` and event handlers in `directory.js` and `requests-page.js` to allow instant switching between neighborhood directories.

**Tech Stack:** Astro, Vanilla JavaScript, Vanilla CSS.

## Global Constraints
- Do not introduce new external libraries or dependencies.
- Follow the Texas Masters theme color tokens (`--masters-green`, `--masters-yellow`, `--dark-gray`, etc.).
- Ensure keyboard accessibility (`Escape` to close, `Tab` focus management).

---

### Task 1: Create `NeighborhoodSwitcher.astro` Component
**Files:**
- Create: `src/components/NeighborhoodSwitcher.astro`

- [ ] **Step 1: Write component template**
  - Render the trigger button with location pin icon, active neighborhood name or "Switch Directory", and chevron icon.
  - Render the popover dropdown list with all 4 Austin neighborhoods (`Onion Creek`, `Sunfield`, `Circle C`, `Avery Ranch`).
  - Highlight the currently active neighborhood with a badge.
  - Provide direct links to both Directory (`/[slug]/`) and Calendar (`/[slug]/requests/`).

---

### Task 2: Style the Switcher in `src/styles/directory.css`
**Files:**
- Modify: `src/styles/directory.css`

- [ ] **Step 1: Add CSS rules**
  - Style `.directory-nav-cluster` (flex container grouping back button and switcher).
  - Style `.neighborhood-switcher-wrap`, `.neighborhood-switcher-btn` with hover/focus states.
  - Style `.neighborhood-dropdown-card` (floating popover with shadow, border, and z-index).
  - Style `.dropdown-item-row`, `.dropdown-neigh-link`, `.dropdown-cal-link`, and active badge.
  - Ensure mobile responsiveness.

---

### Task 3: Embed Switcher in Directory & Calendar Pages
**Files:**
- Modify: `src/pages/[neighborhood].astro`
- Modify: `src/pages/[neighborhood]/requests.astro`

- [ ] **Step 1: Replace plain back button with `<NeighborhoodSwitcher currentSlug={neighborhood.slug} />`**

---

### Task 4: Client Interaction Script & Keyboard Accessibility
**Files:**
- Modify: `src/scripts/directory.js`
- Modify: `src/scripts/requests-page.js`

- [ ] **Step 1: Wire toggle logic**
  - Click on `#switchDropdownBtn` toggles dropdown card and rotates chevron.
  - Click outside or press `Escape` closes the dropdown.

---

### Task 5: Build Verification
- [ ] **Step 1: Run `npm run build` to verify 0 errors.**
