# Dynamic Landing Page Analytics & Real Neighborhood Pro Counts Design

## 1. Objective
Transform the static "400+ Recommendations / 100+ Local Businesses / 4 Active Neighborhoods" placeholder stats on the landing page into dynamic, live-hydrated metrics that accurately reflect real database figures, and enhance neighborhood directory cards with dynamic verified pro count badges.

## 2. Requirements & Metrics
1. **Stats Bar Metrics**:
   - **500+ Verified Recommendations**: Count of total listing recommendations in the `listings` table (currently 501).
   - **370+ Local Businesses**: Count of unique business names in `listings` (currently 373).
   - **34+ Service Categories**: Count of active distinct subcategories covered (currently 34).
   - **4 Active Communities**: Count of neighborhood communities (Onion Creek, Sunfield, Circle C, Avery Ranch).
2. **Neighborhood Directory Card Badges**:
   - Onion Creek: `120+ Verified Pros` (currently 121)
   - Sunfield: `160+ Verified Pros` (currently 162)
   - Circle C: `115+ Verified Pros` (currently 118)
   - Avery Ranch: `100+ Verified Pros` (currently 100)
3. **Performance & Architecture**:
   - **Instant First Paint**: Astro server-side query in frontmatter pre-populates initial figures into HTML attributes so there is zero layout shift (CLS) or visual blank lag.
   - **Live Client Hydration**: Client script queries Supabase asynchronously on load to update numbers and live badges if new listings are published.
   - **Count-Up Animation**: Retain and refine the smooth `IntersectionObserver` ease-out cubic animation when visitors scroll down to the stats bar.

## 3. Architecture & Files
- **File**: `src/pages/index.astro`
  - Add Astro frontmatter `---` to fetch initial counts from Supabase at build time / SSR.
  - Update markup for `.trust-stats` (4 metrics instead of 3).
  - Update neighborhood card elements in `#neighborhoods` with live count badges.
  - Add lightweight client-side live hydration script with error handling and fallback.
