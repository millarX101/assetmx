// Quote terms and conditions on the web. The same clauses as page 2 of the
// PDF quote sheet - both read supabase/functions/_shared/quote-terms.ts.

import { QUOTE_TERMS_VERSION, quoteTerms } from '../../../supabase/functions/_shared/quote-terms';
import type { PublicQuote } from '@/lib/quotes';

type Props = { quote: Pick<PublicQuote, 'quote_number' | 'valid_until' | 'fee_financed' | 'rate_pct' | 'broker_rate_pct'> };

export function QuoteTerms({ quote }: Props) {
  return (
    <section
      id="quote-terms"
      className="bg-white rounded-2xl border border-[#E4DACB] px-6 sm:px-8 py-6 print:border-0 print:break-before-page"
    >
      <h2 className="text-lg font-bold">Quote terms and conditions</h2>
      <p className="text-xs text-ink-500 mb-4">
        These terms apply to quote {quote.quote_number}. Version {QUOTE_TERMS_VERSION}.
      </p>
      <ol className="space-y-4 text-sm leading-relaxed">
        {quoteTerms(quote).map((c, i) => (
          <li key={c.heading}>
            <h3 className="font-semibold">
              {i + 1}. {c.heading}
            </h3>
            {c.paragraphs.map((p) => (
              <p key={p} className="text-ink-700 mt-1">{p}</p>
            ))}
            {c.bullets && (
              <ul className="list-disc pl-5 mt-1 text-ink-700">
                {c.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
