# Mobile Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement clean responsive layout and touch-friendly controls for the service request calendar on mobile devices.

**Architecture:** Responsive CSS media queries with compact mobile indicators and touch targets.

**Tech Stack:** CSS, Vanilla JS, Astro.

---

### Task 1: Update Calendar Rendering Logic in `src/scripts/requests-page.js`
- In `renderCalendar()`, map category names to trade icons (e.g. Plumbing -> 🪠, Electrical -> ⚡, Handyman -> 🔨, Landscaping -> 🌳, Roofing -> 🏠, HVAC -> ❄️, Cleaning -> 🧹, Pest -> 🐜, Painting -> 🎨, Default -> 📦).
- Render `.mobile-demand-indicator` in addition to `.cell-demand-list` for responsive visibility.

### Task 2: Update CSS in `src/styles/directory.css`
- Add `@media (max-width: 640px)` styles for `.calendar-wrapper`, `.calendar-header-row`, `.calendar-grid`, `.calendar-cell`, `.cell-top`, `.cell-demand-list`, `.mobile-demand-indicator`, `.calendar-controls-bar`, `.view-switcher`, and `.month-nav`.
- Hide `.cell-demand-list` on mobile and show `.mobile-demand-indicator`.
- Add bottom safe padding so floating button doesn't block calendar.

### Task 3: Build & Verification
- Test `npm run build`
- Run `detect.mjs`
