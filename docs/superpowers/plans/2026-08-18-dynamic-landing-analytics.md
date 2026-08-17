# Dynamic Landing Page Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make landing page metrics and directory card badges dynamic and grounded in real Supabase database counts.

**Architecture:** Fetch server-side counts during build in Astro frontmatter for zero layout shift, render 4 balanced metric counters, and add lightweight client-side live hydration.

**Tech Stack:** Astro, Vanilla JS, Supabase JS Client, CSS.

---

### Task 1: Add Astro Server-Side Queries to `src/pages/index.astro`
- Add frontmatter block to query `listings` table for total listings, unique names, category count, and neighborhood counts.
- Provide safe fallback constants (501, 373, 34, 4) in case of build-time network timeouts.

### Task 2: Update HTML Markup for 4 Metrics & Neighborhood Cards in `src/pages/index.astro`
- Update `.trust-stats` to render 4 metric items with CSS grid/flex:
  1. `data-count="{totalRecommendations}"` (500+) -> Verified Recommendations
  2. `data-count="{totalBusinesses}"` (370+) -> Local Businesses
  3. `data-count="{totalCategories}"` (34+) -> Service Categories
  4. `data-count="{activeNeighborhoods}"` (4) -> Active Communities
- Update `#neighborhoods` cards with dynamic badge pills (e.g. `data-neighborhood-count="onion-creek"`).

### Task 3: Add Client-Side Live Hydration & Counter Animation
- Wire client-side Supabase query to dynamically refresh numbers if updated in admin.
- Retain `IntersectionObserver` smooth count-up animation.

### Task 4: Verification & Build
- Test `npm run build`
- Run `detect.mjs`
