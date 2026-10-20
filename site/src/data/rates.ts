/**
 * Indicative lender base rates by term.
 * Every rate shown on the public site MUST come from here and be rendered
 * with its verification date. Update `verifiedOn` whenever the panel is re-checked.
 * Mirrors DEFAULT_RATES in the app (src/lib/calculator.ts) and the rate_config table.
 */
export const RATES = {
  verifiedOn: '2026-10-19',
  source: 'AssetMX lender panel rate sheets',
  byTerm: [
    { termMonths: 12, ratePct: 9.95 },
    { termMonths: 24, ratePct: 7.98 },
    { termMonths: 36, ratePct: 7.98 },
    { termMonths: 48, ratePct: 7.98 },
    { termMonths: 60, ratePct: 8.06 },
  ],
  // ATO residual guidelines, rounded down (mirrors the app's MAX_BALLOON_BY_TERM)
  maxBalloonByTerm: { 12: 65, 24: 56, 36: 46, 48: 37, 60: 28, 72: 28, 84: 28 } as Record<number, number>,
} as const;

/** EV and plug-in hybrid offer. Mirrors EV_DISCOUNT_* in src/lib/calculator.ts. */
export const EV_OFFER = { discountPct: 1, until: '2026-12-31' } as const;
export const evOfferActive = (now: Date = new Date()) => now.getTime() < Date.parse('2027-01-01T00:00:00+11:00');

export const lowestRate = () => Math.min(...RATES.byTerm.map((r) => r.ratePct));

export function rateForTerm(termMonths: number): number {
  const tiers = [...RATES.byTerm].sort((a, b) => a.termMonths - b.termMonths);
  const exact = tiers.find((r) => r.termMonths === termMonths);
  if (exact) return exact.ratePct;
  // Nearest tier at or below the requested term; shortest tier for anything shorter.
  const below = tiers.filter((r) => r.termMonths < termMonths).pop();
  return (below ?? tiers[0]).ratePct;
}

export function maxBalloon(termMonths: number): number {
  const key = Math.ceil(termMonths / 12) * 12;
  return RATES.maxBalloonByTerm[key] ?? 28;
}
