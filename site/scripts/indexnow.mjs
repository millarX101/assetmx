/**
 * IndexNow ping after a production build: tells Bing, Yandex, Naver, Seznam
 * (and whoever shares their index) which URLs changed, so they crawl within
 * minutes instead of weeks. Google does not use IndexNow; Search Console +
 * the sitemap cover it.
 *
 * Runs only on Netlify production builds (CONTEXT=production) or when
 * INDEXNOW_FORCE=1. Never fails the build.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KEY = '77c9f3c8e3200087b3dda69bdf638345'; // must match public/<KEY>.txt
const HOST = 'assetmx.com.au';
const SITEMAP = fileURLToPath(new URL('../dist/sitemap-0.xml', import.meta.url));

if (process.env.CONTEXT !== 'production' && !process.env.INDEXNOW_FORCE) {
  console.log('[indexnow] skipped (not a production build)');
  process.exit(0);
}

try {
  const xml = readFileSync(SITEMAP, 'utf8');
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  });
  console.log(`[indexnow] submitted ${urlList.length} URLs, HTTP ${res.status}`);
} catch (err) {
  console.warn('[indexnow] failed, continuing build:', err?.message ?? err);
}
