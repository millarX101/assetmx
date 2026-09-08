/**
 * JSON-LD builders. Every builder pulls entity data from ENTITY so the
 * organisation node is identical on every page (@id anchored).
 */
import { ENTITY, PRICING } from '@/data/entity';

export const ORG_ID = `${ENTITY.siteUrl}/#organization`;
export const SITE_ID = `${ENTITY.siteUrl}/#website`;

export function organization() {
  return {
    '@type': ['Organization', 'FinancialService'],
    '@id': ORG_ID,
    name: ENTITY.brand,
    legalName: ENTITY.legalName,
    alternateName: ENTITY.legalName,
    url: ENTITY.siteUrl,
    logo: { '@type': 'ImageObject', url: ENTITY.logo },
    email: ENTITY.email,
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'ABN', value: ENTITY.abn },
      { '@type': 'PropertyValue', propertyID: 'Australian Credit Licence', value: ENTITY.acl },
    ],
    areaServed: { '@type': 'Country', name: ENTITY.areaServed },
    address: { '@type': 'PostalAddress', addressCountry: 'AU' },
    priceRange: `${PRICING.platformFeeLabel} flat fee`,
    description:
      'Self-serve low-doc asset finance for established Australian businesses. $800 flat fee, lender base rate shown separately, no hidden commission.',
    knowsAbout: [
      'Low-doc asset finance',
      'Chattel mortgage',
      'Equipment finance',
      'Truck finance',
      'Business car finance',
      'Electric vehicle finance',
      'Balloon payments',
    ],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: ENTITY.siteUrl,
    name: ENTITY.brand,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-AU',
  };
}

export function webPage(opts: { url: string; name: string; description: string; type?: string; dateModified?: string }) {
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: 'en-AU',
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
  };
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function article(opts: {
  url: string;
  headline: string;
  description: string;
  published: string;
  modified: string;
}) {
  return {
    '@type': 'Article',
    '@id': `${opts.url}#article`,
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.published,
    dateModified: opts.modified,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: { '@id': `${opts.url}#webpage` },
    inLanguage: 'en-AU',
  };
}

export function financialProduct(opts: { url: string; name: string; description: string; category: string }) {
  return {
    '@type': 'FinancialProduct',
    '@id': `${opts.url}#product`,
    name: opts.name,
    description: opts.description,
    category: opts.category,
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'Country', name: 'Australia' },
    feesAndCommissionsSpecification: `${PRICING.platformFeeLabel} flat platform fee. Lender base rate shown separately. No commission built into the rate.`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: PRICING.platformFee,
      description: 'Flat platform fee, payable once, can be financed into the loan or paid upfront.',
      eligibleCustomerType: 'Business',
    },
  };
}

export function offerCatalog() {
  const base = ENTITY.siteUrl;
  const items = [
    ['Business car finance', 'Utes, vans, cars and 4WDs for ABN businesses', `${base}/car-finance`],
    ['Truck and van finance', 'Rigid trucks, light trucks and commercial vans', `${base}/truck-finance`],
    ['Equipment finance', 'Excavators, loaders, earthmoving and trade equipment', `${base}/equipment-finance`],
    ['Electric vehicle finance', 'Business EV finance and novated lease referrals', `${base}/ev-leasing`],
  ];
  return {
    '@type': 'OfferCatalog',
    name: 'Asset finance products',
    itemListElement: items.map(([name, description, url]) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'FinancialProduct', name, description, url },
    })),
  };
}

/** Wrap nodes in a single @graph document. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
