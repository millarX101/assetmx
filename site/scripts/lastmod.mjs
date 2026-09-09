/**
 * Real last-modified dates for the sitemap, derived from content instead of
 * the build clock. Runs at config time (astro.config.mjs), so it reads the
 * source files directly rather than going through astro:content.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const DATE = /(\d{4}-\d{2}-\d{2})/;

const field = (text, key) => text.match(new RegExp(`^${key}:\\s*"?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
const attr = (text, key) => text.match(new RegExp(`${key}="(\\d{4}-\\d{2}-\\d{2})"`))?.[1];
const files = (dir, ext) => readdirSync(join(SRC, dir)).filter((f) => f.endsWith(ext)).map((f) => join(SRC, dir, f));
const max = (...dates) => dates.filter(Boolean).sort().at(-1);

const map = new Map();
const set = (path, date) => date && map.set(path, date);

// Content collections
for (const f of files('content/answers', '.md')) set(`/answers/${basename(f, '.md')}`, field(readFileSync(f, 'utf8'), 'updated'));
for (const f of files('content/guides', '.md')) set(`/guides/${basename(f, '.md')}`, field(readFileSync(f, 'utf8'), 'updated'));
for (const f of files('content/legal', '.md')) set(`/${basename(f, '.md')}`, field(readFileSync(f, 'utf8'), 'updated'));

// Pages that carry their own updated date
for (const p of ['car-finance', 'truck-finance', 'equipment-finance', 'ev-leasing', 'how-we-compare']) {
  set(`/${p}`, attr(readFileSync(join(SRC, `pages/${p}.astro`), 'utf8'), 'updated'));
}

// Data-driven pages
set('/rates', readFileSync(join(SRC, 'data/rates.ts'), 'utf8').match(/verifiedOn:\s*'(\d{4}-\d{2}-\d{2})'/)?.[1]);
set('/lender-policies', max(...files('content/lenders', '.json').map((f) => JSON.parse(readFileSync(f, 'utf8')).reviewedOn?.match(DATE)?.[1])));

// Index pages inherit the newest of their children
const newest = (prefix) => max(...[...map].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v));
set('/answers', newest('/answers/'));
set('/guides', newest('/guides/'));
export const LATEST = max(...map.values());
set('/', LATEST);
set('/contact', LATEST);

/** ISO lastmod for a sitemap URL, or undefined when nothing dated backs the page. */
export function lastmodFor(url) {
  const path = new URL(url).pathname.replace(/\/$/, '') || '/';
  const d = map.get(path);
  return d ? new Date(`${d}T00:00:00Z`).toISOString() : undefined;
}
