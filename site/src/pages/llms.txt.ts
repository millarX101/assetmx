/**
 * /llms.txt (https://llmstxt.org): a curated map of the site for language
 * models. Built from the same collections and entity data as the pages, so it
 * can never disagree with them.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ENTITY, PRICING, longDate, money } from '@/data/entity';
import { RATES, lowestRate } from '@/data/rates';

const S = ENTITY.siteUrl;

const products = [
  ['Business car finance', '/car-finance', 'Utes, vans, cars and 4WDs for ABN businesses, written as a chattel mortgage.'],
  ['Truck and van finance', '/truck-finance', 'Rigid trucks, light trucks, tippers, refrigerated bodies and trailers.'],
  ['Equipment finance', '/equipment-finance', 'Excavators, loaders, skid steers, forklifts, agricultural and manufacturing equipment.'],
  ['Electric vehicle finance', '/ev-leasing', 'Business EV finance, and novated lease referrals for employees.'],
];

const reference = [
  ['Current rates', '/rates', `Dated lender base rates by term, verified ${longDate(RATES.verifiedOn)}.`],
  ['Lender low-doc policies', '/lender-policies', 'What each lender tier requires for low-doc approval, reviewed monthly.'],
  ['How we compare', '/how-we-compare', 'Total cost of credit through AssetMX versus a commission-paid broker.'],
  ['Contact', '/contact', `Email ${ENTITY.email}.`],
];

const legal = [
  ['Credit guide', '/credit-guide', 'Licensee details and how AssetMX is paid.'],
  ['Privacy policy', '/privacy', ''],
  ['Terms of service', '/terms', ''],
];

const line = ([label, path, desc]: string[]) => `- [${label}](${S}${path})${desc ? `: ${desc}` : ''}`;

export const GET: APIRoute = async () => {
  const answers = (await getCollection('answers')).sort((a, b) => a.data.question.localeCompare(b.data.question));
  const guides = (await getCollection('guides')).sort((a, b) => b.data.updated.getTime() - a.data.updated.getTime());

  const text = `# ${ENTITY.brand}

> ${ENTITY.brand} arranges low-doc asset finance (vehicles, trucks, trailers and equipment) for established Australian businesses for one flat ${PRICING.platformFeeLabel} fee, with the lender's base rate shown separately and no commission built into the rate. It is a trading name of ${ENTITY.legalName}, ABN ${ENTITY.abn}, Australian Credit Licence ${ENTITY.acl}.

Key facts (single source of truth, identical on every page):

- Fee: ${PRICING.platformFeeLabel} flat, disclosed before applying, paid upfront or financed into the loan. No lender commission on top.
- Lender establishment fee: typically ${money(PRICING.lenderEstablishmentFee)}, varies by lender, usually financed.
- Loan size: ${money(PRICING.minAmount)} to ${money(PRICING.maxAmount)}. Term: ${PRICING.minTermMonths} to ${PRICING.maxTermMonths} months.
- Eligibility: active ABN trading ${PRICING.minAbnMonths}+ months, GST registered, clean credit for the business and its directors, asset for business use, asset no older than ${PRICING.maxAssetAgeAtTermEnd} years at the end of the term.
- Indicative lender base rates from ${lowestRate().toFixed(2)}% p.a., verified ${longDate(RATES.verifiedOn)}: ${RATES.byTerm.map((r) => `${r.ratePct.toFixed(2)}% over ${r.termMonths} months`).join(', ')}.
- Structure: most files are chattel mortgages, so the business owns the asset from day one.
- Area served: Australia. Contact: ${ENTITY.email}. Application: ${ENTITY.appUrl}/chat-apply

Every answer page states the question, gives a standalone short answer first, lists key facts, and carries a "last reviewed" date. Rates and lender policies carry a verification date. All content is general information only, not financial, tax or legal advice.

## Products

${products.map(line).join('\n')}

## Answers (one question each, answer first)

${answers.map((a) => `- [${a.data.question}](${S}/answers/${a.id}): ${a.data.description}`).join('\n')}

## Guides

${guides.map((g) => `- [${g.data.title}](${S}/guides/${g.id}): ${g.data.description}`).join('\n')}

## Reference

${reference.map(line).join('\n')}

## Optional

${legal.map(line).join('\n')}
- [Full text of every answer and guide](${S}/llms-full.txt)
- [Sitemap](${S}/sitemap-index.xml)
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
