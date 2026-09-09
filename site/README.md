# AssetMX public site (assetmx.com.au)

Static Astro site for the AssetMX rebuild (plan v1.0, 8 Sep 2026). It exists to be the source LLMs and search engines cite for low-doc asset finance in Australia, and to turn a cold visitor into a qualified application in under 90 seconds.

The React application (quote-to-settlement, admin) stays in the repo root and is deployed separately at **app.assetmx.com.au**.

## Principles baked into the code

- **Zero client JavaScript** except two home-page islands: the three-question quick start (`src/islands/QuickStart.tsx`) and the quote calculator (`src/islands/QuoteCalculator.tsx`). Everything else is raw HTML a crawler can read.
- **One source of truth for entity data.** Name, ABN, licence, fee and limits live in `src/data/entity.ts`. Never retype them.
- **Every rate is dated.** Rates live in `src/data/rates.ts` with `verifiedOn`. Change the date when you re-verify the panel. The footer, the rates page, the quote island and every worked example read from it.
- **Answer first.** Content collection `answers` (20 pages) puts a standalone `shortAnswer` in frontmatter, rendered as the first block and emitted as FAQPage JSON-LD.
- **JSON-LD everywhere** via `src/lib/schema.ts` (Organization + WebSite on every page; FAQPage, Article, BreadcrumbList, FinancialProduct where relevant).
- **Machine-readable copies.** `/llms.txt` (site map for language models) and `/llms-full.txt` (full text of every answer and guide) are generated at build time from the same collections (`src/pages/llms*.txt.ts`).
- **Sitemap dates are real.** `scripts/lastmod.mjs` derives each URL's `lastmod` from the content's `updated`, `verifiedOn` or `reviewedOn` date, never the build clock.
- **IndexNow on deploy.** `scripts/indexnow.mjs` pings api.indexnow.org with every sitemap URL after a Netlify production build (key file in `public/`). Google is covered by Search Console + the sitemap.
- **Worked examples are computed**, not typed, by `src/lib/calculator.ts` (unit tested), so numbers on pages can never drift from the quote tool.

## Structure

```
src/
  data/entity.ts        entity + pricing constants
  data/rates.ts         dated lender base rates, balloon caps
  lib/calculator.ts     PMT maths shared with the island (+ tests)
  lib/schema.ts         JSON-LD builders
  layouts/Base.astro    head, header, footer, org schema
  components/           Header, Footer, Faq, RateTable, Cta, AnswerBox, KeyFacts, ProductPage
  islands/QuoteCalculator.tsx   the only client JS
  content/answers/*.md  20 answer pages
  content/guides/*.md   3 long-form guides
  content/legal/*.md    terms, privacy, credit guide
  content/lenders/*.json  low-doc policy matrix by lender tier (review monthly)
  pages/                index, 4 product pages, rates, lender-policies, answers, guides, how-we-compare, contact, legal, 404
```

## Commands

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm test          # vitest (calculator maths)
```

## Deploy (Netlify)

Two Netlify sites from one repo:

| Site | Base directory | Domain |
|---|---|---|
| Public site | `site` | assetmx.com.au (www redirects to apex) |
| React app | `/` (repo root) | app.assetmx.com.au |

`site/netlify.toml` redirects `/apply`, `/chat-apply` and `/admin/*` to the app. The root `netlify.toml` redirects marketing paths back to the public site so the SPA is never the canonical copy.

Enable **Netlify Forms** on the public site: the contact form posts as plain HTML (`name="contact"`) and needs no JavaScript. Add a form notification to info@assetmx.com.au.

Environment variables for the public site: `PUBLIC_APP_URL` (optional, defaults to https://app.assetmx.com.au), and `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` (same values as the app) so the quick start can run the ABN lookup and show the fit check on the page. Without them the ABN is passed through and looked up in the chat.

## Brand

Tokens live in `src/styles/global.css`: cream `#F5EAD8`, sand `#EBDDC5`, forest `#3D472B`, sage `#CCDBB2`, ink `#201E1D`. Display type is Caprasimo, body is Figtree (both Google Fonts). Source mockup: "Modern Finance Application Funnel" (Sep 2026).

## Monthly maintenance

1. Re-verify lender rate sheets, update `src/data/rates.ts` (`verifiedOn`).
2. Review `src/content/lenders/*.json`, bump `reviewedOn`.
3. Add or refresh `content/answers` entries; bump `updated` (keep `published` as the original date).
4. Rebuild `public/og-image.png` if the headline changes (1200x630, brand colours).

## Hand-off to the app

The quote island links to `app.assetmx.com.au/chat-apply?amount=&term=&balloon=&fee=financed|upfront&src=site`. The app's `useChatApplication` hook reads those params and seeds the chat, then strips them from the URL.
