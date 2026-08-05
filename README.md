# Trusted Neighbors Directory

Neighbor-sourced local business directories for Austin-area neighborhoods, built with [Astro](https://astro.build).

## Overview

**Trusted Neighbors Directory** provides fast, accessible, neighbor-recommended local business directories for Austin-area communities (including Avery Ranch, Circle C, Onion Creek, and Sunfield). 

### Why Astro?
Previously, directory listings were fetched dynamically in the browser via client-side JavaScript (`fetch('listings.json')`). Because search engine crawlers and AI assistants (e.g., ChatGPT, Claude) often fetch raw HTML without executing JavaScript, they were indexing empty pages. 

With Astro, every listing is **pre-rendered into static HTML at build time**. Crawlers and AI engines receive full, indexable content immediately, while client-side search, filtering, category expansion/collapse, and referral submission remain fast and interactive.

---

## Supported Neighborhoods

- **Avery Ranch** (`/avery-ranch/`)
- **Circle C** (`/circle-c/`)
- **Onion Creek** (`/onion-creek/`)
- **Sunfield** (`/sunfield/`)

---

## Project Structure

```
.
├── astro.config.mjs          # Astro configuration
├── netlify.toml              # Netlify build & security headers configuration
├── package.json              # Project dependencies & scripts
├── public/                   # Static assets & landing page
│   ├── index.html            # Main landing page
│   └── assets/               # Branding assets & images
└── src/
    ├── components/
    │   ├── ListingsTree.astro  # Builds category/subcategory listing tree
    │   ├── ListingRow.astro    # Renders standard listings & VIP featured cards
    │   ├── ReferralModal.astro # "Suggest a Referral" interactive modal
    │   └── OrderModal.astro    # "Order a Directory" modal
    ├── data/
    │   ├── neighborhoods.js    # Neighborhood metadata (name, Formspree ID, SEO titles)
    │   ├── avery-ranch.json    # Avery Ranch business listings
    │   ├── circle-c.json       # Circle C business listings
    │   ├── onion-creek.json    # Onion Creek business listings
    │   └── sunfield.json       # Sunfield business listings
    ├── layouts/
    │   └── Directory.astro     # Master layout for directory pages
    ├── pages/
    │   ├── index.astro         # Main landing page route
    │   └── [neighborhood].astro# Dynamic route generating pages for each neighborhood
    ├── scripts/
    │   └── directory.js        # Client-side filtering, search, collapse, & form handler
    └── styles/
        └── directory.css       # Global styles & directory theme
```

---

## Development & Commands

Ensure Node.js (v20 or higher recommended) is installed.

```bash
# Install dependencies
npm install

# Start local development server (with hot-reload at http://localhost:4321)
npm run dev

# Build for production (outputs static HTML to dist/)
npm run build

# Preview the production build locally
npm run preview
```

---

## Managing Listings & Neighborhoods

### Adding or Editing Listings
1. Open the JSON file corresponding to the target neighborhood in `src/data/` (e.g., `src/data/onion-creek.json`).
2. Add or modify listings under the relevant group/category.
   - **Standard listing**: `{ "name": "Vendor Name", "phone": "512-555-0199", "note": "Recommended plumber" }`
   - **Featured VIP card**: Add `"featured": true` to display as a highlighted card.
   - **Location / Maps link**: Include `"address"` or `"serviceArea"` to automatically generate a Google Maps link.
3. Save the file and verify with `npm run build`.

### Adding a New Neighborhood
1. Create a new JSON data file in `src/data/<slug>.json` containing the category structure and listings.
2. Register the neighborhood in `src/data/neighborhoods.js` with its title, Formspree form ID, and metadata.
3. Build or restart the dev server—Astro's dynamic route `src/pages/[neighborhood].astro` will automatically generate the new page at `/<slug>/`.

---

## Deployment

The project builds to a fully static output directory (`dist/`).

### Netlify (Recommended)
This repository includes a `netlify.toml` pre-configured with:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `20`
- **Security headers**: CSP, HSTS, X-Frame-Options, and Referrer Policy.

Simply connect the Git repository to Netlify for automatic CI/CD deployments.

### Other Static Hosts (Vercel, Cloudflare Pages, GitHub Pages)
- **Vercel / Cloudflare**: Auto-detects Astro. Set output directory to `dist`.
- **GitHub Pages**: Configure `site` (and `base` if using a subpath) in `astro.config.mjs`, and deploy the `dist/` directory via GitHub Actions.
