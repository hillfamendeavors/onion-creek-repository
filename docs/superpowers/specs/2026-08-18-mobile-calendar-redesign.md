# Mobile Calendar Redesign & Responsive Optimization

## 1. Objective
Fix the responsive design of the service request calendar on mobile devices (e.g. iPhone 375px) so that the 7-day grid is clean, legible, and touch-friendly without squished text, overflow clipping, or overlapping buttons.

## 2. Key Changes
1. **Compact Mobile Day Cells (≤ 640px)**:
   - Use uniform compact cell height (`min-height: 52px`).
   - On desktop (> 640px), keep the full `.cell-demand-list` text pills.
   - On mobile (≤ 640px), replace multi-line text with a compact icon badge (`.mobile-demand-indicator`) showing the trade icon and request count (e.g., `🔨 1`, `⚡ 2`).
   - Highlight active days with a warm amber/green tint and amber border ring.
2. **Shortened Header Weekdays on Mobile**:
   - Show `S M T W T F S` or compact `Sun Mon Tue Wed Thu Fri Sat` with responsive font sizing.
3. **Touch-Friendly Controls Bar**:
   - Center month navigation with 44px minimum tap targets.
   - Full-width pill segmented control for View Switcher (`📅 Calendar View` vs `📋 List View`).
4. **Bottom Safe Area**:
   - Add padding-bottom to the main calendar container so the floating "+ Need a Service?" button does not obstruct dates.

## 3. Files Modified
- `src/styles/directory.css`: Responsive CSS rules for `.calendar-wrapper`, `.calendar-header-row`, `.calendar-grid`, `.calendar-cell`, `.mobile-demand-indicator`, `.calendar-controls-bar`.
- `src/scripts/requests-page.js`: Render mobile demand badges alongside desktop pills for seamless responsive rendering.
