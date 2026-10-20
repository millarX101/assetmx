// The AssetMX quote engine. One source for the admin quote builder (the web
// app imports this file) and the automatic quotes (request-quote), so a quote
// is priced the same wherever it is made. Keep it free of Deno APIs.
//
// REPAYMENT STRUCTURE (matches Westpac's Commercial Loan / Goods Loan quotes)
//   Payments are monthly in arrears: the first is due one month after settlement.
//   With a balloon, a term of n months is n-1 regular payments, then the
//   balloon alone as payment n. Without a balloon it is n regular payments.
//   Verified against a Westpac quote: 35 x $1,669.11 + $29,592.80 balloon on
//   $74,482.00 financed solves to 8.5354% p.a. (shown as 8.54%).
//
// The website calculators (src/lib/calculator.ts, site/src/lib/calculator.ts)
// use the same formula; change all three together.

export const PLATFORM_FEE = 800;
export const LENDER_ESTABLISHMENT_FEE = 500;

/** Fallback lender base rates by term, mirroring DEFAULT_RATES in src/lib/calculator.ts. */
export const DEFAULT_RATES: Record<number, number> = { 12: 9.95, 24: 7.98, 36: 7.98, 48: 7.98, 60: 8.06 };

const MAX_BALLOON_BY_TERM: Record<number, number> = { 12: 65, 24: 60, 36: 50, 48: 40, 60: 30, 72: 30, 84: 30 };

export function getMaxBalloon(termMonths: number): number {
  return MAX_BALLOON_BY_TERM[Math.ceil(termMonths / 12) * 12] ?? 30;
}

/**
 * EV and plug-in hybrid offer: 1% p.a. off the lender base rate, through
 * 31 December 2026 (Sydney time). Mirrors src/lib/calculator.ts.
 */
/** Metro Finance rate = the term rate + 0.65% p.a. Mirrors src/lib/calculator.ts. */
export const METRO_MARGIN_PCT = 0.65;

export const EV_DISCOUNT_PCT = 1;
export const EV_DISCOUNT_UNTIL = '2026-12-31';
const EV_DISCOUNT_ENDS = Date.parse('2027-01-01T00:00:00+11:00');
export const evDiscountActive = (now: Date = new Date()) => now.getTime() < EV_DISCOUNT_ENDS;
export const evDiscountFor = (isEv?: boolean, now: Date = new Date()) => (isEv && evDiscountActive(now) ? EV_DISCOUNT_PCT : 0);

/** Same term banding as getBaseRate() in src/lib/calculator.ts. */
export function baseRateFor(termMonths: number, rates: Record<number, number> = DEFAULT_RATES): number {
  const r = { ...DEFAULT_RATES, ...rates };
  if (r[termMonths]) return r[termMonths];
  if (termMonths >= 36 && termMonths <= 60) return r[36];
  if (termMonths <= 12) return r[12];
  if (termMonths < 36) return r[24];
  return r[60];
}

/** Number of regular monthly payments: the balloon replaces the last one. */
export const regularPayments = (termMonths: number, balloon: number) => (balloon > 0 ? termMonths - 1 : termMonths);

/** Monthly repayment, in arrears, Westpac structure (see header). */
export function repayment(principal: number, annualRatePct: number, termMonths: number, balloon: number): number {
  const r = annualRatePct / 100 / 12;
  const k = regularPayments(termMonths, balloon);
  if (r === 0) return (principal - balloon) / k;
  const annuity = (1 - Math.pow(1 + r, -k)) / r;
  return (principal - balloon * Math.pow(1 + r, -termMonths)) / annuity;
}

/** The rate that gives `payment` on `principal` - the effective rate once a fee is financed on top. */
export function effectiveRate(principal: number, termMonths: number, balloon: number, payment: number): number {
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (repayment(principal, mid, termMonths, balloon) < payment) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface QuoteCalcInput {
  assetPrice: number;
  deposit: number;
  tradeIn: number;
  termMonths: number;
  balloonPct: number; // % of asset price
  feeFinanced: boolean;
  ratePct: number;
}

export interface QuoteFigures {
  asset_price: number;
  deposit_amount: number;
  trade_in_amount: number;
  loan_amount: number; // amount to finance before fees
  rate_pct: number;
  effective_rate_pct: number; // with the AssetMX fee added to the loan
  monthly_repayment: number;
  alt_monthly_repayment: number; // the other AssetMX-fee option
  weekly_repayment: number;
  fortnightly_repayment: number;
  balloon_amount: number;
  amount_financed: number;
  total_repayments: number;
  total_interest: number;
  total_cost: number;
  platform_fee: number;
  establishment_fee: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Asset price less deposit and trade-in is the amount to finance; the lender
 * fee is always added; the AssetMX fee is paid upfront or added. Both fee
 * options are priced so the quote can show them side by side.
 */
export function computeQuote(i: QuoteCalcInput): QuoteFigures {
  const deposit = Math.max(0, i.deposit || 0);
  const tradeIn = Math.max(0, i.tradeIn || 0);
  const net = i.assetPrice - deposit - tradeIn;
  if (!(i.assetPrice > 0)) throw new Error("Enter the asset price");
  if (net < 5000) throw new Error("Amount to finance (price less deposit and trade-in) must be at least $5,000");
  if (net > 500000) throw new Error("Amount to finance must be $500,000 or less");
  if (i.termMonths < 12 || i.termMonths > 84) throw new Error("Term must be 12 to 84 months");
  const maxBalloon = getMaxBalloon(i.termMonths);
  if (i.balloonPct < 0 || i.balloonPct > maxBalloon) throw new Error(`Balloon must be 0-${maxBalloon}% for this term`);
  if (!(i.ratePct > 0 && i.ratePct < 40)) throw new Error("Rate must be between 0 and 40%");

  const balloon = r2(i.assetPrice * (i.balloonPct / 100));
  if (balloon >= net) throw new Error("Balloon must be less than the amount to finance");

  const base = net + LENDER_ESTABLISHMENT_FEE; // lender fee always financed
  const upfront = r2(repayment(base, i.ratePct, i.termMonths, balloon));
  const financed = r2(repayment(base + PLATFORM_FEE, i.ratePct, i.termMonths, balloon));
  const monthly = i.feeFinanced ? financed : upfront;
  const amountFinanced = i.feeFinanced ? base + PLATFORM_FEE : base;
  const totalRepayments = r2(monthly * regularPayments(i.termMonths, balloon) + balloon);

  return {
    asset_price: i.assetPrice,
    deposit_amount: deposit,
    trade_in_amount: tradeIn,
    loan_amount: net,
    rate_pct: i.ratePct,
    effective_rate_pct: Math.round(effectiveRate(base, i.termMonths, balloon, financed) * 100) / 100,
    monthly_repayment: monthly,
    alt_monthly_repayment: i.feeFinanced ? upfront : financed,
    weekly_repayment: r2((monthly * 12) / 52),
    fortnightly_repayment: r2((monthly * 12) / 26),
    balloon_amount: balloon,
    amount_financed: amountFinanced,
    total_repayments: totalRepayments,
    total_interest: r2(totalRepayments - amountFinanced),
    total_cost: r2(totalRepayments + (i.feeFinanced ? 0 : PLATFORM_FEE)),
    platform_fee: PLATFORM_FEE,
    establishment_fee: LENDER_ESTABLISHMENT_FEE,
  };
}
