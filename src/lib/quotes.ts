// Quote snapshot + API helpers for the admin quote builder and the customer
// /q/:token page. The edge functions live in supabase/functions/send-quote and
// supabase/functions/quote-public.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { getMaxBalloon, LENDER_ESTABLISHMENT_FEE, PLATFORM_FEE } from './calculator';
import { getSupabaseAnonKey, getSupabaseUrl, supabase } from './supabase';
import type { FinanceType, Quote } from '@/types/database';

/** Mirrors site/src/data/entity.ts - the ABN/ACL printed on a quote must match the website. */
export const ENTITY = {
  brand: 'AssetMX',
  legalName: 'Blackrock Leasing Pty Ltd',
  abn: '15 681 267 818',
  acl: '569484',
  email: 'info@assetmx.com.au',
  siteUrl: 'https://assetmx.com.au',
} as const;

export const QUOTE_DISCLAIMER =
  'This is not an offer of finance. It is an indicative quote based on the information provided, subject to ' +
  "the lender's credit assessment and verification of you and the asset, and may change before settlement. " +
  'Finance is for business purposes only. Other lender fees and charges may apply.';

export const FINANCE_TYPE_LABELS: Record<FinanceType, string> = {
  chattel_mortgage: 'Commercial loan (chattel mortgage)',
  finance_lease: 'Finance lease',
  hire_purchase: 'Commercial hire purchase',
};

/** What the customer page receives from quote-public (no internal columns). */
export type PublicQuote = Pick<
  Quote,
  | 'quote_number' | 'created_at' | 'sent_at' | 'status' | 'responded_at' | 'valid_until'
  | 'customer_name' | 'business_name' | 'abn' | 'prepared_by' | 'finance_type'
  | 'asset_type' | 'asset_condition' | 'asset_description'
  | 'asset_price' | 'deposit_amount' | 'trade_in_amount' | 'loan_amount'
  | 'term_months' | 'balloon_percentage' | 'fee_financed'
  | 'rate_pct' | 'effective_rate_pct' | 'monthly_repayment' | 'alt_monthly_repayment'
  | 'weekly_repayment' | 'fortnightly_repayment'
  | 'balloon_amount' | 'amount_financed' | 'total_repayments' | 'total_interest' | 'total_cost'
  | 'platform_fee' | 'establishment_fee'
  | 'message'
> & { expired?: boolean };

export type QuoteFigures = Pick<
  Quote,
  | 'asset_price' | 'deposit_amount' | 'trade_in_amount' | 'loan_amount'
  | 'rate_pct' | 'effective_rate_pct' | 'monthly_repayment' | 'alt_monthly_repayment'
  | 'weekly_repayment' | 'fortnightly_repayment'
  | 'balloon_amount' | 'amount_financed' | 'total_repayments' | 'total_interest' | 'total_cost'
  | 'platform_fee' | 'establishment_fee'
>;

export interface QuoteCalcInput {
  assetPrice: number;
  deposit: number;
  tradeIn: number;
  termMonths: number;
  balloonPct: number; // % of asset price
  feeFinanced: boolean;
  ratePct: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Same formula as site/src/lib/calculator.ts pmt() and the app calculator, so quotes match the website. */
export function pmt(principal: number, annualRatePct: number, n: number, balloon: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return (principal - balloon) / n;
  const pvBalloon = balloon / Math.pow(1 + r, n);
  return ((principal - pvBalloon) * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

/** The rate that gives `payment` on `principal` - i.e. the effective rate once a fee is financed on top. */
function effectiveRate(principal: number, n: number, balloon: number, payment: number): number {
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (pmt(principal, mid, n, balloon) < payment) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The quote engine. Asset price less deposit and trade-in is the amount to
 * finance; the lender fee is always added; the AssetMX fee is either paid
 * upfront or added. Both fee options are priced so the quote can show them
 * side by side, with the effective rate of adding the fee to the loan.
 */
export function computeQuote(i: QuoteCalcInput): QuoteFigures {
  const deposit = Math.max(0, i.deposit || 0);
  const tradeIn = Math.max(0, i.tradeIn || 0);
  const net = i.assetPrice - deposit - tradeIn;
  if (!(i.assetPrice > 0)) throw new Error('Enter the asset price');
  if (net < 5000) throw new Error('Amount to finance (price less deposit and trade-in) must be at least $5,000');
  if (net > 500000) throw new Error('Amount to finance must be $500,000 or less');
  if (i.termMonths < 12 || i.termMonths > 84) throw new Error('Term must be 12 to 84 months');
  const maxBalloon = getMaxBalloon(i.termMonths);
  if (i.balloonPct < 0 || i.balloonPct > maxBalloon) throw new Error(`Balloon must be 0-${maxBalloon}% for this term`);
  if (!(i.ratePct > 0 && i.ratePct < 40)) throw new Error('Rate must be between 0 and 40%');

  const balloon = r2(i.assetPrice * (i.balloonPct / 100));
  if (balloon >= net) throw new Error('Balloon must be less than the amount to finance');

  const base = net + LENDER_ESTABLISHMENT_FEE; // lender fee always financed
  const upfront = r2(pmt(base, i.ratePct, i.termMonths, balloon));
  const financed = r2(pmt(base + PLATFORM_FEE, i.ratePct, i.termMonths, balloon));
  const monthly = i.feeFinanced ? financed : upfront;
  const amountFinanced = i.feeFinanced ? base + PLATFORM_FEE : base;
  const totalRepayments = r2(monthly * i.termMonths + balloon);

  return {
    asset_price: i.assetPrice,
    deposit_amount: deposit,
    trade_in_amount: tradeIn,
    loan_amount: net,
    rate_pct: i.ratePct,
    // Always the fee-added rate, so the quote can show both options
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

export const publicQuoteUrl = (token: string) => `${window.location.origin}/q/${token}`;

/** Hand an accepted quote straight into the chat application, prefilled. */
export function applyUrl(q: Pick<Quote, 'loan_amount' | 'term_months' | 'balloon_percentage' | 'fee_financed' | 'asset_type'>) {
  const p = new URLSearchParams({
    amount: String(q.loan_amount),
    term: String(q.term_months),
    balloon: String(q.balloon_percentage),
    fee: q.fee_financed ? 'financed' : 'upfront',
    asset: q.asset_type,
    src: 'quote',
  });
  return `/chat-apply?${p}`;
}

async function functionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      /* fall through */
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

/** Admin: email the quote to the customer (supabase-js attaches the session JWT). */
export async function sendQuote(quoteId: string): Promise<{ public_url: string }> {
  const { data, error } = await supabase.functions.invoke('send-quote', { body: { quote_id: quoteId } });
  if (error) throw new Error(await functionError(error));
  return data;
}

/** Admin: download the PDF quote sheet (quote + terms). Works for drafts. */
export async function downloadQuotePdf(quote: Pick<Quote, 'id' | 'quote_number'>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${getSupabaseUrl()}/functions/v1/send-quote`, {
    method: 'POST',
    headers: {
      apikey: getSupabaseAnonKey(),
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quote_id: quote.id, action: 'pdf' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Could not create the PDF');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `AssetMX-quote-${quote.quote_number}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const publicEndpoint = () => `${getSupabaseUrl()}/functions/v1/quote-public`;

/** Customer: the PDF quote sheet for a sent quote (doesn't count as a view). */
export const publicPdfUrl = (token: string) =>
  `${publicEndpoint()}?${new URLSearchParams({ token, format: 'pdf' })}`;
const publicHeaders = () => ({
  apikey: getSupabaseAnonKey(),
  Authorization: `Bearer ${getSupabaseAnonKey()}`,
  'Content-Type': 'application/json',
});

export async function fetchPublicQuote(token: string, preview = false): Promise<PublicQuote> {
  const qs = new URLSearchParams({ token, ...(preview ? { preview: '1' } : {}) });
  const res = await fetch(`${publicEndpoint()}?${qs}`, { headers: publicHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Quote not found');
  return body.quote;
}

export async function respondToQuote(token: string, action: 'accept' | 'decline', reason?: string): Promise<PublicQuote> {
  const res = await fetch(publicEndpoint(), {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify({ token, action, reason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Could not record your response');
  return body.quote;
}
