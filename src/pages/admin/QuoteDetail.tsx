// /admin/quotes/:id - one quote: engagement, send/resend, link, re-quote.

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Copy, Copy as Duplicate, ExternalLink, Eye, FileDown, Loader2, Pencil, Send, Trash2, User } from 'lucide-react';
import { downloadQuotePdf, publicQuoteUrl, sendQuote } from '@/lib/quotes';
import { QUOTE_STATUS_META, db, timeAgo } from '@/lib/crm';
import { useAuthStore } from '@/stores/authStore';
import { QuoteDocument } from '@/components/quotes/QuoteDocument';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Quote } from '@/types/database';

const when = (iso: string | null) => (iso ? format(new Date(iso), 'd MMM yyyy, h:mm a') : '—');

export function QuoteDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuthStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [flash, setFlash] = useState<{ text: string; tone: 'ok' | 'error' } | null>(() => {
    const s = location.state as { flash?: string; tone?: 'ok' | 'error' } | null;
    return s?.flash ? { text: s.flash, tone: s.tone ?? 'ok' } : null;
  });

  async function load() {
    const { data } = await db.from('quotes').select('*').eq('id', id).single();
    setQuote(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Clear router state so a refresh doesn't replay the banner
    window.history.replaceState({}, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (!quote) return <div className="py-12 text-center text-muted-foreground">Quote not found.</div>;

  const url = publicQuoteUrl(quote.public_token);
  const canEdit = role !== 'viewer';

  async function send() {
    if (!quote) return;
    setSending(true);
    try {
      await sendQuote(quote.id);
      setFlash({ text: `${quote.sent_count ? 'Re-sent' : 'Sent'} to ${quote.customer_email}`, tone: 'ok' });
      await load();
    } catch (e) {
      setFlash({ text: (e as Error).message, tone: 'error' });
    } finally {
      setSending(false);
    }
  }

  async function downloadPdf() {
    if (!quote) return;
    setDownloading(true);
    try {
      await downloadQuotePdf(quote);
    } catch (e) {
      setFlash({ text: (e as Error).message, tone: 'error' });
    } finally {
      setDownloading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setFlash({ text: 'Customer link copied', tone: 'ok' });
  }

  async function remove() {
    if (!quote || !confirm(`Delete draft ${quote.quote_number}?`)) return;
    await db.from('quotes').delete().eq('id', quote.id);
    navigate(quote.lead_id ? `/admin/leads/${quote.lead_id}` : '/admin/quotes');
  }

  const meta = QUOTE_STATUS_META[quote.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.customer_name}
              {quote.business_name ? ` · ${quote.business_name}` : ''} · created {timeAgo(quote.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quote.lead_id && (
            <Button variant="outline" asChild>
              <Link to={`/admin/leads/${quote.lead_id}`}>
                <User className="mr-2 h-4 w-4" />Lead
              </Link>
            </Button>
          )}
          {quote.status === 'draft' && canEdit && (
            <>
              <Button variant="outline" onClick={remove}>
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/admin/quotes/new?edit=${quote.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />Edit
                </Link>
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" asChild>
              <Link to={`/admin/quotes/new?from=${quote.id}`}>
                <Duplicate className="mr-2 h-4 w-4" />Re-quote
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
          {quote.status !== 'draft' && (
            <>
              <Button variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />Copy link
              </Button>
              <Button variant="outline" asChild>
                <a href={`${url}?preview=1`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />Customer page
                </a>
              </Button>
            </>
          )}
          {canEdit && (
            <Button className="bg-forest hover:bg-forest-700 text-white" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {quote.sent_count ? 'Resend' : 'Send'} to customer
            </Button>
          )}
        </div>
      </div>

      {flash && (
        <div
          className={
            flash.tone === 'ok'
              ? 'rounded-lg bg-green-50 text-green-800 px-4 py-3 text-sm'
              : 'rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm'
          }
        >
          {flash.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <QuoteDocument quote={quote} />

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <Stat label="Sent to" value={quote.customer_email} />
              <Stat label="Last sent" value={when(quote.sent_at)} />
              <Stat label="Times sent" value={String(quote.sent_count)} />
              <Stat label="Views" value={String(quote.view_count)} />
              <Stat label="First opened" value={when(quote.first_viewed_at)} />
              <Stat label="Last opened" value={when(quote.last_viewed_at)} />
              <Stat
                label={quote.status === 'declined' ? 'Declined' : 'Accepted'}
                value={quote.status === 'accepted' || quote.status === 'declined' ? when(quote.responded_at) : '—'}
              />
              {quote.decline_reason && (
                <div className="rounded-md bg-red-50 p-2 text-red-900">“{quote.decline_reason}”</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-xs text-muted-foreground space-y-1">
              <p>Valid until {format(new Date(`${quote.valid_until}T00:00:00`), 'd MMM yyyy')}</p>
              <p className="break-all">Link: {url}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}
