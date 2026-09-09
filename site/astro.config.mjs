// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { lastmodFor } from './scripts/lastmod.mjs';

// Public marketing/answer site for assetmx.com.au.
// Static output, zero client JS except the quote island.
export default defineConfig({
  site: 'https://assetmx.com.au',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    sitemap({
      // Utility pages are noindex; keep them out of the sitemap so the two signals agree.
      filter: (page) => !/\/(404|contact-thanks)$/.test(page),
      // lastmod comes from the content's own `updated` / `verifiedOn` / `reviewedOn`
      // dates (scripts/lastmod.mjs), not the build clock, so it is a real signal.
      serialize: (item) => {
        const lastmod = lastmodFor(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
