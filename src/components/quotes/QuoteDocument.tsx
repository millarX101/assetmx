// The quote as the customer sees it on the web - the same four sections as the
// PDF quote sheet (supabase/functions/_shared/quote-pdf.ts): Payments, Finance
// calculation, Interest rate, Fees. Rendered on /q/:token, in the admin
// builder preview and on the admin quote page.

import type { ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { formatCurrency } from '@/lib/calculator';
import { ASSET_CONDITION_LABELS, ASSET_TYPE_LABELS } from '@/lib/crm';
import { ENTITY, FINANCE_TYPE_LABELS, QUOTE_DISCLAIMER, type PublicQuote } from '@/lib/quotes';
import { cn } from '@/lib/utils';

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

const pct = (n: number) => `${Number(n).toFixed(2)}%`;
const printExact = 'print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 border-b-2 border-forest pb-1.5 mb-3">
        <span className={cn('h-5 w-5 rounded-full bg-forest text-white text-xs font-bold grid place-items-center', printExact)}>
          {n}
        </span>
        <span className="font-bold text-forest-800">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function Line({ label, value, note, strong, muted, rule }: {
  label: string; value: string; note?: string; strong?: boolean; muted?: boolean; rule?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1 text-sm', rule && 'border-t border-ink mt-1 pt-2', muted && 'text-ink-500')}>
      <span className={strong ? 'font-bold' : undefined}>
        {label}
        {note && <span className="ml-2 text-xs text-ink-400 font-normal">{note}</span>}
      </span>
      <span className={cn('tabular-nums whitespace-nowrap', strong && 'font-bold')}>{value}</span>
    </div>
  );
}

export function QuoteDocument({ quote: q }: Props) {
  const asset =
    q.asset_description ||
    `${ASSET_CONDITION_LABELS[q.asset_condition]} ${ASSET_TYPE_LABELS[q.asset_type].toLowerCase()}`;
  const issued = q.sent_at ?? q.created_at ?? new Date().toISOString();

  // Legacy quotes (before deposit/trade-in) have no asset_price.
  const price = Number(q.asset_price ?? q.loan_amount);
  const deposit = Number(q.deposit_amount ?? 0);
  const tradeIn = Number(q.trade_in_amount ?? 0);
  const balloon = Number(q.balloon_amount);
  const eff = q.effective_rate_pct != null ? Number(q.effective_rate_pct) : null;
  const alt = q.alt_monthly_repayment != null ? Number(q.alt_monthly_repayment) : null;
  const options = [
    { title: 'Pay AssetMX fee upfront', sub: `${formatCurrency(q.platform_fee)} paid at settlement`, monthly: q.fee_financed ? alt : q.monthly_repayment, rate: q.rate_pct, chosen: !q.fee_financed },
    { title: 'Add AssetMX fee to the loan', sub: 'Nothing to pay upfront', monthly: q.fee_financed ? q.monthly_repayment : alt, rate: eff, chosen: q.fee_financed },
  ];

  const details: [string, ReactNode][] = [
    ['Quote for', <strong key="n">{q.customer_name}</strong>],
    ...(q.business_name ? [['Business', q.business_name] as [string, ReactNode]] : []),
    ...(q.abn ? [['ABN', q.abn] as [string, ReactNode]] : []),
    ['Quoted by', q.prepared_by || 'AssetMX'],
    ['Date', longDate(issued)],
    ['Valid until', longDate(q.valid_until)],
  ];
  const details2: [string, ReactNode][] = [
    ['Finance type', FINANCE_TYPE_LABELS[q.finance_type ?? 'chattel_mortgage']],
    ['Goods', <strong key="g">{asset}</strong>],
    ['Asset type', `${ASSET_TYPE_LABELS[q.asset_type]}, ${ASSET_CONDITION_LABELS[q.asset_condition]}`],
    ['Term', `${q.term_months} months`],
  ];

  return (
    <article className="bg-white text-ink rounded-2xl border border-[#E4DACB] overflow-hidden shadow-sm print:shadow-none print:border-0 print:rounded-none">
      <header className={cn('bg-forest text-white px-6 sm:px-8 py-4 flex items-center justify-between gap-4', printExact)}>
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div>
            <div className="text-xl font-extrabold tracking-tight">
              Asset<span className="text-sage">MX</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-sage">Transparent Finance</div>
          </div>
        </div>
        <div className="text-right">
          <div className="uppercase tracking-widest text-sage text-[10px]">Finance quote</div>
          <div className="font-bold text-lg">{q.quote_number}</div>
        </div>
      </header>

      <div className="px-6 sm:px-8 py-6 space-y-6">
        {/* Details */}
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {[details, details2].map((col, i) => (
            <div key={i} className="space-y-1">
              {col.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[88px_1fr] gap-2">
                  <dt className="text-ink-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </div>
          ))}
        </dl>

        {q.message && (
          <p className="text-sm leading-relaxed whitespace-pre-line bg-ivory border-l-4 border-sage px-4 py-3">{q.message}</p>
        )}

        <Section n={1} title="Your payments">
          <div className={cn('bg-sage-100 px-5 py-4 flex flex-wrap items-baseline justify-between gap-2', printExact)}>
            <div>
              <span className="text-3xl font-extrabold text-forest-800 tabular-nums">{formatCurrency(q.monthly_repayment)}</span>
              <span className="ml-2 text-forest">per month</span>
            </div>
            <div className="text-sm text-ink-600 text-right">
              <div>{formatCurrency(q.fortnightly_repayment)} per fortnight (equivalent)</div>
              <div>{formatCurrency(q.weekly_repayment)} per week (equivalent)</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-xs text-ink-500 border-b border-[#E4DACB]">
                  <th className="text-left font-semibold py-1.5">Payments</th>
                  <th className="text-left font-semibold">Frequency</th>
                  <th className="text-right font-semibold">Amount</th>
                  <th className="text-left font-semibold pl-6">From</th>
                  <th className="text-left font-semibold">To</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>
                  <td className="py-1.5">{q.term_months}</td>
                  <td>Monthly</td>
                  <td className="text-right font-bold">{formatCurrency(q.monthly_repayment)}</td>
                  <td className="pl-6 text-ink-600">Month 1 (1 month after settlement)</td>
                  <td className="text-ink-600">Month {q.term_months}</td>
                </tr>
                {balloon > 0 && (
                  <tr>
                    <td className="py-1.5">1</td>
                    <td>Balloon</td>
                    <td className="text-right font-bold">{formatCurrency(balloon)}</td>
                    <td className="pl-6 text-ink-600">With the final monthly payment</td>
                    <td className="text-ink-600">Month {q.term_months}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-400 mt-1 border-t border-[#E4DACB] pt-1.5">
            Payments are monthly in arrears. No GST is charged on the repayments.
          </p>
        </Section>

        <Section n={2} title="Finance calculation">
          <Line label="Asset price" value={formatCurrency(price)} />
          {deposit > 0 && <Line label="Less deposit" value={`-${formatCurrency(deposit)}`} />}
          {tradeIn > 0 && <Line label="Less trade-in" value={`-${formatCurrency(tradeIn)}`} />}
          {(deposit > 0 || tradeIn > 0) && <Line label="Amount to finance" value={formatCurrency(q.loan_amount)} strong />}
          <Line label="Plus lender establishment fee" note="charged by the lender" value={formatCurrency(q.establishment_fee)} />
          {q.fee_financed ? (
            <Line label="Plus AssetMX fee" note="added to the loan, see section 4" value={formatCurrency(q.platform_fee)} />
          ) : (
            <Line label="AssetMX fee" note={`${formatCurrency(q.platform_fee)} at settlement, not financed`} value="Paid upfront" muted />
          )}
          <Line label="Total amount financed" value={formatCurrency(q.amount_financed)} strong rule />
          {balloon > 0 && (
            <Line label="Balloon / residual" note={`${q.balloon_percentage}% of asset price, due at end of term`} value={formatCurrency(balloon)} />
          )}
        </Section>

        <Section n={3} title="Interest rate">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <div>
              <span className="text-2xl font-extrabold text-forest-800">{pct(q.rate_pct)} p.a.</span>
              <span className="ml-2 text-sm text-ink-500">fixed for {q.term_months} months</span>
            </div>
            {eff != null && (
              <div className="text-right text-sm">
                {q.fee_financed ? (
                  <>
                    <div className="font-bold text-forest">Effective rate with the AssetMX fee added: {pct(eff)} p.a.</div>
                    <div className="text-xs text-ink-500">Adding the fee to the loan means you pay interest on it.</div>
                  </>
                ) : (
                  <>
                    <div className="text-ink-600">Fee paid upfront, so no interest is charged on it.</div>
                    <div className="text-xs text-ink-400">(If added to the loan, the effective rate would be {pct(eff)} p.a.)</div>
                  </>
                )}
              </div>
            )}
          </div>
          <Line label="Total interest over the term" value={formatCurrency(q.total_interest)} />
          <Line label={`Total repayments${balloon > 0 ? ' incl. balloon' : ''}`} value={formatCurrency(q.total_repayments)} />
          <Line label={`Total cost${q.fee_financed ? '' : ' incl. AssetMX fee paid upfront'}`} value={formatCurrency(q.total_cost)} strong />
        </Section>

        <Section n={4} title="Fees">
          <div className="grid sm:grid-cols-2 gap-3">
            {options.map((o) => (
              <div
                key={o.title}
                className={cn('rounded-lg border px-4 py-3', o.chosen ? 'border-forest border-2 bg-sage-100' : 'border-[#E4DACB]', printExact)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{o.title}</span>
                  {o.chosen && <span className="text-[10px] font-bold tracking-wider text-forest">THIS QUOTE</span>}
                </div>
                <div className="text-xs text-ink-500">{o.sub}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-bold tabular-nums">{o.monthly != null ? `${formatCurrency(o.monthly)} per month` : '-'}</span>
                  {o.rate != null && <span className="text-xs text-ink-500">effective rate {pct(o.rate)} p.a.</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-500 mt-3">
            AssetMX fee: {formatCurrency(q.platform_fee)} flat (incl. GST), only payable if your finance settles. We take no
            commission from the lender. Lender establishment fee: {formatCurrency(q.establishment_fee)}, charged by the lender
            and added to the amount financed.
          </p>
        </Section>

        <footer className="pt-4 border-t border-[#E4DACB] text-[11px] leading-relaxed text-ink-400 space-y-1.5">
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
