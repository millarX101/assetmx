// Quote snapshot + API helpers for the admin quote builder and the customer
// /q/:token page. The edge functions live in supabase/functions/send-quote and
// supabase/functions/quote-public.

import { FunctionsHttpError } from '@supabase/supabase-js';
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

// The quote engine (Westpac-matched repayment maths) is shared with the
// request-quote edge function so manual and automatic quotes price identically.
export {
  computeQuote,
  repayment,
  effectiveRate,
  regularPayments,
  type QuoteCalcInput,
  type QuoteFigures,
} from '../../supabase/functions/_shared/quote-engine';

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
