// @ts-check
import { defineConfig } from 'astro/config';

// Static output (default). Each neighborhood is pre-rendered to /<slug>/index.html
// with all listings baked into the HTML, so crawlers and AI readers see real content.
//
// For GitHub Pages, set `site` (and `base` if served from a sub-path), e.g.:
//   site: 'https://trustedneighbors.net',
export default defineConfig({
  trailingSlash: 'always',
});
