// The quote as the customer sees it. Rendered on /q/:token, in the admin
// builder preview and on the admin quote page. Print-ready: the browser's
// "Save as PDF" produces the quote PDF, so there is no PDF library.

import { BrandMark } from '@/components/BrandMark';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import { ASSET_CONDITION_LABELS, ASSET_TYPE_LABELS } from '@/lib/crm';
import { ENTITY, QUOTE_DISCLAIMER, type PublicQuote } from '@/lib/quotes';

type Props = {
  quote: Omit<PublicQuote, 'created_at' | 'sent_at' | 'status' | 'responded_at'> & {
    created_at?: string | null;
    sent_at?: string | null;
  };
};

const longDate = (d: string) =>
  new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#E4DACB] last:border-0">
      <div>
        <div className="text-sm text-ink-600">{label}</div>
        {sub && <div className="text-xs text-ink-400">{sub}</div>}
      </div>
      <div className={strong ? 'font-bold text-ink' : 'text-ink'}>{value}</div>
    </div>
  );
}

export function QuoteDocument({ quote: q }: Props) {
  const asset =
    q.asset_description ||
    `${ASSET_CONDITION_LABELS[q.asset_condition]} ${ASSET_TYPE_LABELS[q.asset_type].toLowerCase()}`;
  const issued = q.sent_at ?? q.created_at ?? new Date().toISOString();
  const saving = Number(q.estimated_saving ?? 0);

  return (
    <article className="bg-white text-ink rounded-2xl border border-[#E4DACB] overflow-hidden shadow-sm print:shadow-none print:border-0 print:rounded-none">
      {/* Header */}
      <header className="bg-forest text-white px-6 sm:px-8 py-6 flex items-start justify-between gap-4 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
        <div className="flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              Asset<span className="text-sage">MX</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-sage">Transparent Finance</div>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="uppercase tracking-widest text-sage text-xs">Finance quote</div>
          <div className="font-bold text-lg">{q.quote_number}</div>
          <div className="text-sage-200 text-xs">Issued {longDate(issued)}</div>
        </div>
      </header>

      <div className="px-6 sm:px-8 py-6 space-y-6">
        {/* Prepared for */}
        <section className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">Prepared for</div>
            <div className="font-semibold">{q.customer_name}</div>
            {q.business_name && <div>{q.business_name}</div>}
            {q.abn && <div className="text-ink-600">ABN {q.abn}</div>}
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">Asset</div>
            <div className="font-semibold">{asset}</div>
            <div className="text-ink-600">
              {ASSET_TYPE_LABELS[q.asset_type]} · {ASSET_CONDITION_LABELS[q.asset_condition]}
            </div>
          </div>
        </section>

        {q.message && (
          <p className="text-sm leading-relaxed whitespace-pre-line bg-ivory rounded-xl p-4 border border-[#E4DACB]">
            {q.message}
          </p>
        )}

        {/* Headline */}
        <section className="rounded-2xl bg-sage-100 px-6 py-6 text-center print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="text-xs uppercase tracking-[0.2em] text-forest">Monthly repayment</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-forest-800 my-1">
            {formatCurrency(q.monthly_repayment)}
          </div>
          <div className="text-sm text-ink-600">
            {formatCurrency(q.weekly_repayment)} weekly · {formatCurrency(q.fortnightly_repayment)} fortnightly
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm">
            <span className="text-ink-600">Indicative rate</span>
            <span className="font-bold text-forest">{formatPercentage(q.rate_pct)}</span>
            <span className="text-ink-400">p.a.</span>
          </div>
        </section>

        {/* Breakdown */}
        <section className="grid md:grid-cols-2 gap-x-8">
          <div>
            <h3 className="font-semibold mb-1">Loan</h3>
            <Row label="Asset amount" value={formatCurrency(q.loan_amount)} />
            <Row label="Term" value={`${q.term_months} months`} />
            <Row
              label="Balloon / residual"
              value={Number(q.balloon_amount) > 0 ? formatCurrency(q.balloon_amount) : 'None'}
              sub={Number(q.balloon_amount) > 0 ? `${q.balloon_percentage}% of asset amount, due at end of term` : undefined}
            />
            <Row label="Total amount financed" value={formatCurrency(q.amount_financed)} strong />
          </div>
          <div>
            <h3 className="font-semibold mb-1 mt-4 md:mt-0">Fees &amp; totals</h3>
            <Row
              label="AssetMX fee (flat)"
              value={formatCurrency(q.platform_fee)}
              sub={q.fee_financed ? 'Financed into the loan' : 'Paid upfront at settlement'}
            />
            <Row label="Lender establishment fee" value={formatCurrency(q.establishment_fee)} sub="Financed into the loan" />
            <Row label="Total interest" value={formatCurrency(q.total_interest)} />
            <Row label="Total cost over the term" value={formatCurrency(q.total_cost)} strong />
          </div>
        </section>

        {/* Broker comparison */}
        {saving > 0 && q.broker_rate_pct && (
          <section className="rounded-xl border border-[#E4DACB] bg-ivory px-5 py-4 text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div>
              <div className="font-semibold">No commission in your rate</div>
              <div className="text-ink-600">
                A typical broker rate of {formatPercentage(q.broker_rate_pct)} would cost about{' '}
                {formatCurrency(q.broker_total_cost ?? 0)} over the same term.
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-ink-400">Estimated saving</div>
              <div className="text-xl font-bold text-forest">{formatCurrency(saving)}</div>
            </div>
          </section>
        )}

        <p className="text-sm">
          <span className="font-semibold">Valid until {longDate(q.valid_until)}.</span>{' '}
          <span className="text-ink-600">After this date we'll re-confirm the rate with the lender.</span>
        </p>

        <footer className="pt-4 border-t border-[#E4DACB] text-[11px] leading-relaxed text-ink-400 space-y-2">
          <p>{QUOTE_DISCLAIMER}</p>
          <p>
            {ENTITY.legalName} trading as {ENTITY.brand} · ABN {ENTITY.abn} · Australian Credit Licence {ENTITY.acl} ·{' '}
            {ENTITY.email} · assetmx.com.au
          </p>
        </footer>
      </div>
    </article>
  );
}
