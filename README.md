# Trusted Neighbors Directory

Neighbor-sourced local business directories for Austin-area neighborhoods, built
with [Astro](https://astro.build).

## Why Astro

The pages used to load their listings in the browser with `fetch('listings.json')`.
Search engines and AI readers (ChatGPT, Claude) fetch the raw HTML but **don't run
JavaScript**, so they saw an empty page. Astro **pre-renders** every listing into the
static HTML at build time, so the content is readable by crawlers and AI — while the
search, filtering, collapsing, and "Suggest a Referral" form still work client-side.

## Project structure

```
src/
  data/
    neighborhoods.js     # per-neighborhood config (name, title, Formspree id, subject)
    <slug>.json          # the listings for each neighborhood (edit these to add listings)
  layouts/Directory.astro
  components/
    ListingsTree.astro   # renders all groups/subcategories/listings at build time
    ListingRow.astro     # one listing (standard row or VIP "featured" card)
    ReferralModal.astro  # "Suggest a Referral" modal
    OrderModal.astro     # dormant "Order a Directory" modal (Sunfield)
  scripts/directory.js   # client interactivity (filter/search/collapse/copy/submit)
  styles/directory.css   # all styles
  pages/[neighborhood].astro  # one template -> /avery-ranch/, /circle-c/, etc.
public/
  index.html             # the landing page (served as-is at /)
  assets/                # images
```

## Develop / build

```bash
npm install        # once
npm run dev        # local dev server with hot reload
npm run build      # outputs static site to dist/
npm run preview    # serve the built dist/ locally
```

## Adding or editing a listing

1. Edit the relevant `src/data/<slug>.json` (e.g. `src/data/onion-creek.json`).
   Each listing is `{ "name", "phone", "note" }`; optional `"featured": true` renders
   the VIP card, and `"address"` / `"serviceArea"` adds a Google Maps link.
2. Run `npm run build`.
3. Deploy the `dist/` folder.

## Deploy

The build outputs plain static files to `dist/` — deploy that folder to any static
host (Netlify, Vercel, GitHub Pages, etc.). Netlify/Vercel auto-detect Astro.

For **GitHub Pages**, set `site` (and `base` if served from a sub-path) in
`astro.config.mjs` and publish `dist/` via an action.
