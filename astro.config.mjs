// @ts-check
import { defineConfig } from 'astro/config';
import { neighborhoods } from './src/data/neighborhoods.js';

// Prints every page's URL under "Local:" when `astro dev` starts, so you don't
// have to guess the neighborhood slugs or remember the admin route.
const logRoutes = {
  name: 'log-routes',
  hooks: {
    'astro:server:start': ({ address, logger }) => {
      const base = `http://localhost:${address.port}`;
      const routes = ['/', ...neighborhoods.map((n) => `/${n.slug}/`), '/admin/'];
      logger.info(`Pages:\n${routes.map((r) => `    ${base}${r}`).join('\n')}`);
    },
  },
};

import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// Static output (default). Each neighborhood is pre-rendered to /<slug>/index.html
// with all listings baked into the HTML, so crawlers and AI readers see real content.
export default defineConfig({
  site: 'https://trustedneighbors.net',
  trailingSlash: 'always',
  adapter: netlify(),
  integrations: [
    logRoutes,
    sitemap({
      filter: (page) =>
        !page.includes('/admin/') &&
        !page.includes('/login/') &&
        !page.includes('/reset-password/'),
    }),
  ],
});

