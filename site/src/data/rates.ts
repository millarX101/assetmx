/**
 * Indicative lender base rates by term.
 * Every rate shown on the public site MUST come from here and be rendered
 * with its verification date. Update `verifiedOn` whenever the panel is re-checked.
 * Mirrors DEFAULT_RATES in the app (src/lib/calculator.ts) and the rate_config table.
 */
export const RATES = {
  verifiedOn: '2026-09-08',
  source: 'AssetMX lender panel rate sheets',
  byTerm: [
    { termMonths: 12, ratePct: 8.49 },
    { termMonths: 24, ratePct: 7.49 },
    { termMonths: 36, ratePct: 7.25 },
    { termMonths: 48, ratePct: 7.25 },
    { termMonths: 60, ratePct: 7.25 },
  ],
  maxBalloonByTerm: { 12: 65, 24: 60, 36: 50, 48: 40, 60: 30, 72: 30, 84: 30 } as Record<number, number>,
} as const;

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
  return RATES.maxBalloonByTerm[key] ?? 30;
}
