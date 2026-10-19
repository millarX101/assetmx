// Customer quote page: /q/:token
// Opened from the quote email. View, print/save as PDF, accept or decline.
// ?preview=1 is the admin preview and does not count as a customer view.

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Printer, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { QuoteDocument } from '@/components/quotes/QuoteDocument';
import { SEO } from '@/components/SEO';
import { applyUrl, ENTITY, fetchPublicQuote, respondToQuote, type PublicQuote } from '@/lib/quotes';

export function QuoteView() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchPublicQuote(token, preview)
      .then(setQuote)
      .catch((e: Error) => setError(e.message));
  }, [token, preview]);

  async function respond(action: 'accept' | 'decline') {
    setBusy(true);
    setError(null);
    try {
      setQuote(await respondToQuote(token, action, action === 'decline' ? reason : undefined));
      setDeclining(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        {error ? (
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold mb-2">We couldn't find that quote</h1>
            <p className="text-ink-600">
              The link may be incomplete. Reply to your quote email or contact{' '}
              <a className="underline" href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
            </p>
          </div>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-forest" />
        )}
      </div>
    );
  }

  const responded = quote.status === 'accepted' || quote.status === 'declined';

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <SEO title={`Quote ${quote.quote_number} | AssetMX`} description="Your AssetMX finance quote" />

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 print:p-0 print:max-w-none">
        {preview && (
          <div className="print:hidden mb-4 rounded-lg bg-amber-100 text-amber-900 px-4 py-2 text-sm">
            Admin preview — this visit isn't counted as a customer view.
          </div>
        )}

        <QuoteDocument quote={quote} />

        {/* Actions */}
        <div className="print:hidden mt-6 rounded-2xl bg-white border border-[#E4DACB] p-5 sm:p-6">
          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

          {quote.status === 'accepted' ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-10 w-10 text-forest mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Quote accepted, thanks {quote.customer_name.split(' ')[0]}</h2>
                <p className="text-ink-600 mt-1">
                  We've been notified. The next step is your application. It takes about 10 minutes and these
                  figures are already filled in.
                </p>
              </div>
              <Button asChild size="lg" className="bg-forest hover:bg-forest-700 text-white rounded-full">
                <Link to={applyUrl(quote)}>
                  Start my application <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : quote.status === 'declined' ? (
            <div className="text-center">
              <XCircle className="h-8 w-8 text-ink-400 mx-auto mb-2" />
              <p className="text-ink-600">
                You declined this quote. If anything changes, reply to the quote email and we'll re-quote.
              </p>
            </div>
          ) : quote.expired ? (
            <p className="text-center text-ink-600">
              This quote has expired. Reply to the quote email and we'll re-issue it at today's rate.
            </p>
          ) : declining ? (
            <div className="space-y-3">
              <label className="font-semibold block" htmlFor="reason">
                Mind telling us why? <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. found a better rate, bought outright, not buying anymore"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setDeclining(false)} disabled={busy}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => respond('decline')} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Decline quote
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <div>
                <h2 className="font-bold text-lg">Happy with this quote?</h2>
                <p className="text-sm text-ink-600">
                  Accepting isn't a credit application. It tells us to get started.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" onClick={() => setDeclining(true)} disabled={busy || preview}>
                  Decline
                </Button>
                <Button
                  size="lg"
                  className="bg-forest hover:bg-forest-700 text-white rounded-full"
                  onClick={() => respond('accept')}
                  disabled={busy || preview}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Accept quote
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[#E4DACB] flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink-600">
              Questions? <a className="underline" href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>
            </span>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              {responded ? 'Print / save PDF' : 'Print / save as PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
