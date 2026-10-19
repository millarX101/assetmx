// Quote snapshot + API helpers for the admin quote builder and the customer
// /q/:token page. The edge functions live in supabase/functions/send-quote and
// supabase/functions/quote-public.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { calculateQuote, type QuoteInput } from './calculator';
import { getSupabaseAnonKey, getSupabaseUrl, supabase } from './supabase';
import type { Quote } from '@/types/database';

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
  "This is an indicative quote, not an offer or approval of credit. The rate, fees and repayments are " +
  "subject to the lender's credit assessment, verification of your information and the asset, and may change " +
  'before settlement. Finance is for business purposes only. Repayments are calculated in advance, with the ' +
  'first payment due at settlement.';

/** What the customer page receives from quote-public (no internal columns). */
export type PublicQuote = Pick<
  Quote,
  | 'quote_number' | 'created_at' | 'sent_at' | 'status' | 'responded_at' | 'valid_until'
  | 'customer_name' | 'business_name' | 'abn'
  | 'asset_type' | 'asset_condition' | 'asset_description'
  | 'loan_amount' | 'term_months' | 'balloon_percentage' | 'fee_financed'
  | 'rate_pct' | 'monthly_repayment' | 'weekly_repayment' | 'fortnightly_repayment'
  | 'balloon_amount' | 'amount_financed' | 'total_repayments' | 'total_interest' | 'total_cost'
  | 'platform_fee' | 'establishment_fee' | 'broker_rate_pct' | 'broker_total_cost' | 'estimated_saving'
  | 'message'
> & { expired?: boolean };

export type QuoteFigures = Pick<
  Quote,
  | 'rate_pct' | 'monthly_repayment' | 'weekly_repayment' | 'fortnightly_repayment'
  | 'balloon_amount' | 'amount_financed' | 'total_repayments' | 'total_interest' | 'total_cost'
  | 'platform_fee' | 'establishment_fee' | 'broker_rate_pct' | 'broker_total_cost' | 'estimated_saving'
>;

/**
 * Freeze the calculator output for the option the customer is actually being
 * offered. calculateQuote's totals always describe the fee-financed option, so
 * the fee-upfront figures are rebuilt here from its *FeeUpfront fields.
 */
export function quoteFigures(input: QuoteInput): QuoteFigures {
  const out = calculateQuote(input);
  const financed = input.financePlatformFee !== false;
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const monthly = financed ? out.monthlyRepayment : out.monthlyRepaymentFeeUpfront;
  const amountFinanced = financed ? out.totalAmountFinanced : out.totalAmountFinancedFeeUpfront;
  const totalRepayments = monthly * input.termMonths + out.balloonAmount;
  const totalCost = totalRepayments + (financed ? 0 : out.platformFee);

  return {
    rate_pct: out.indicativeRate,
    monthly_repayment: monthly,
    weekly_repayment: financed ? out.weeklyRepayment : out.weeklyRepaymentFeeUpfront,
    fortnightly_repayment: financed ? out.fortnightlyRepayment : out.fortnightlyRepaymentFeeUpfront,
    balloon_amount: out.balloonAmount,
    amount_financed: amountFinanced,
    total_repayments: r2(totalRepayments),
    total_interest: r2(totalRepayments - amountFinanced),
    total_cost: r2(totalCost),
    platform_fee: out.platformFee,
    establishment_fee: out.lenderEstablishmentFee,
    broker_rate_pct: out.brokerComparisonRate,
    broker_total_cost: out.brokerComparisonTotalCost,
    estimated_saving: r2(out.brokerComparisonTotalCost - totalCost),
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

const publicEndpoint = () => `${getSupabaseUrl()}/functions/v1/quote-public`;
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
