/**
 * Single source of truth for entity data.
 * Every page, JSON-LD block and footer reads from here so the name, ABN,
 * licence and fee are byte-identical everywhere (LLM citation consistency).
 */
export const ENTITY = {
  brand: 'AssetMX',
  legalName: 'Blackrock Leasing Pty Ltd',
  abn: '15 681 267 818',
  acl: '569484',
  email: 'info@assetmx.com.au',
  siteUrl: 'https://assetmx.com.au',
  appUrl: import.meta.env.PUBLIC_APP_URL ?? 'https://app.assetmx.com.au',
  logo: 'https://assetmx.com.au/logo.svg',
  ogImage: 'https://assetmx.com.au/og-image.png',
  areaServed: 'Australia',
  governingLaw: 'New South Wales, Australia',
  /** GA4 measurement id, shared with the app. Empty string disables the tag. */
  gaId: 'G-NFS486LH5F',
} as const;

/** Fixed positioning. Do not restate these numbers anywhere else. */
export const PRICING = {
  platformFee: 800,
  platformFeeLabel: '$800',
  lenderEstablishmentFee: 500,
  minAmount: 5_000,
  maxAmount: 500_000,
  minTermMonths: 12,
  maxTermMonths: 84,
  minAbnMonths: 24,
  gstRequired: true,
  maxAssetAgeAtTermEnd: 15,
  typicalBrokerMarginPct: 2.0,
} as const;

export const APP_LINKS = {
  quote: `${ENTITY.appUrl}/chat-apply`,
  apply: `${ENTITY.appUrl}/apply`,
  admin: `${ENTITY.appUrl}/admin`,
} as const;

export const money = (n: number, dp = 0) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);

export const pct = (n: number, dp = 2) => `${n.toFixed(dp)}%`;

export const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
