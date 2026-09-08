/**
 * One of two client islands on the public site (with QuickStart).
 * Instant, transparent quote: lender base rate by term + flat $800 fee,
 * with a like-for-like broker comparison. Hands off to the app with the
 * inputs in the query string (cross-origin, so no localStorage).
 */
import { useMemo, useState } from 'react';
import { calculateQuote } from '@/lib/calculator';
import { RATES, maxBalloon } from '@/data/rates';
import { PRICING, APP_LINKS } from '@/data/entity';

const money = (n: number, dp = 0) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);
const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

const TERMS = [12, 24, 36, 48, 60];
type Freq = 'weekly' | 'fortnightly' | 'monthly';

export default function QuoteCalculator({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState(50_000);
  const [term, setTerm] = useState(60);
  const [balloonPct, setBalloonPct] = useState(20);
  const [financeFee, setFinanceFee] = useState(true);
  const [freq, setFreq] = useState<Freq>('monthly');

  const cap = maxBalloon(term);
  const balloon = Math.min(balloonPct, cap);

  const q = useMemo(
    () => calculateQuote({ amount, termMonths: term, balloonPct: balloon, financePlatformFee: financeFee }),
    [amount, term, balloon, financeFee],
  );

  const repay = q[freq];
  const brokerRepay = freq === 'monthly' ? q.brokerMonthly : freq === 'weekly' ? (q.brokerMonthly * 12) / 52 : (q.brokerMonthly * 12) / 26;

  const applyHref = `${APP_LINKS.quote}?amount=${amount}&term=${term}&balloon=${balloon}&fee=${financeFee ? 'financed' : 'upfront'}&src=site`;

  return (
    <div className="card p-5 md:p-6 text-ink" id="quote">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-lg font-semibold">Your indicative quote</h2>
        <span className="pill">Rates verified {longDate(RATES.verifiedOn)}</span>
      </div>

      {/* Amount */}
      <label className="mt-5 block">
        <span className="flex justify-between text-sm font-medium">
          <span>Amount to finance</span>
          <span className="num font-semibold">{money(amount)}</span>
        </span>
        <input
          type="range"
          className="mt-2 w-full accent-[#3D472B]"
          min={PRICING.minAmount}
          max={PRICING.maxAmount}
          step={5_000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Amount to finance"
        />
        <span className="flex justify-between text-xs text-ink-500">
          <span>{money(PRICING.minAmount)}</span>
          <span>{money(PRICING.maxAmount)}</span>
        </span>
      </label>

      {/* Term */}
      <div className="mt-5">
        <span className="text-sm font-medium">Term</span>
        <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Loan term">
          {TERMS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={term === t}
              onClick={() => setTerm(t)}
              className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                term === t ? 'border-forest bg-forest text-canvas' : 'border-ink-300 bg-paper hover:border-forest'
              }`}
            >
              {t / 12} yr
            </button>
          ))}
        </div>
      </div>

      {/* Balloon */}
      <label className="mt-5 block">
        <span className="flex justify-between text-sm font-medium">
          <span>Balloon / residual</span>
          <span className="num font-semibold">
            {balloon}% <span className="text-ink-500 font-normal">({money(q.balloon)})</span>
          </span>
        </span>
        <input
          type="range"
          className="mt-2 w-full accent-[#3D472B]"
          min={0}
          max={cap}
          step={5}
          value={balloon}
          onChange={(e) => setBalloonPct(Number(e.target.value))}
          aria-label="Balloon percentage"
        />
        <span className="flex justify-between text-xs text-ink-500">
          <span>0%</span>
          <span>Max {cap}% for this term</span>
        </span>
      </label>

      {/* Fee toggle */}
      <label className="mt-5 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#3D472B]"
          checked={financeFee}
          onChange={(e) => setFinanceFee(e.target.checked)}
        />
        <span>
          Finance the {money(PRICING.platformFee)} AssetMX fee into the loan
          <span className="block text-xs text-ink-500">Untick to pay it upfront instead. Either way it is the same {money(PRICING.platformFee)}.</span>
        </span>
      </label>

      {/* Result */}
      <div className="mt-6 rounded-card bg-forest text-canvas p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.12em] text-sage">Repayment</span>
          <div className="flex gap-1 rounded-lg bg-white/10 p-0.5 text-xs" role="radiogroup" aria-label="Repayment frequency">
            {(['weekly', 'fortnightly', 'monthly'] as Freq[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={freq === f}
                onClick={() => setFreq(f)}
                className={`rounded-md px-2 py-1 capitalize ${freq === f ? 'bg-canvas text-forest' : 'text-sage-200 hover:text-canvas'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <p className="num mt-2 text-4xl font-semibold leading-none">{money(repay, 2)}</p>
        <p className="mt-2 text-sm text-sage-200">
          Lender base rate <span className="num font-semibold text-canvas">{q.ratePct.toFixed(2)}% p.a.</span> · no margin added
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-canvas/15 pt-4 text-sm">
          <dt className="text-sage-200">Amount financed</dt>
          <dd className="num text-right">{money(q.amountFinanced)}</dd>
          <dt className="text-sage-200">Lender establishment fee</dt>
          <dd className="num text-right">{money(q.lenderEstablishmentFee)}</dd>
          <dt className="text-sage-200">AssetMX flat fee</dt>
          <dd className="num text-right">{money(q.platformFee)} {financeFee ? '' : '(upfront)'}</dd>
          <dt className="text-sage-200">Total interest</dt>
          <dd className="num text-right">{money(q.totalInterest)}</dd>
          <dt className="text-sage-200">Total cost of credit</dt>
          <dd className="num text-right font-semibold text-canvas">{money(q.totalCost)}</dd>
        </dl>
      </div>

      {!compact && (
        <div className="mt-4 card-sand p-4 text-sm">
          <p className="font-semibold">Same deal through a typical broker</p>
          <p className="mt-1 text-ink-700">
            Brokers typically build about {PRICING.typicalBrokerMarginPct.toFixed(0)}% commission into the rate. At{' '}
            <span className="num font-semibold text-ink">{q.brokerRatePct.toFixed(2)}%</span> the {freq} repayment would be about{' '}
            <span className="num font-semibold text-ink">{money(brokerRepay, 2)}</span>, and the total cost about{' '}
            <span className="num font-semibold text-ink">{money(q.brokerTotalCost)}</span>.
          </p>
          <p className="mt-2 text-forest font-semibold num">
            Estimated difference: {money(q.saving)} over {term / 12} years.
          </p>
        </div>
      )}

      <a href={applyHref} className="btn-primary mt-5 w-full" rel="noopener">
        Continue with this quote
      </a>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Indicative only. Repayments in advance, balloon calculated on the asset value, lender establishment fee financed. Your
        rate and approval are set by the lender after a formal application. No credit check is run for this quote. Rates verified{' '}
        {longDate(RATES.verifiedOn)}.
      </p>
    </div>
  );
}
