// /admin/leads/:id - the lead workspace.
// Stage stepper, contact details, next follow-up, activity log + timeline,
// and the lead's quotes. Modelled on FLWUP's deal workspace.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, format, set } from 'date-fns';
import {
  ArrowLeft, CalendarClock, CheckCircle2, Eye, FileText, Mail, MessageSquare, Phone,
  Plus, Send, StickyNote, Users, XCircle, ArrowRightLeft, Loader2,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import {
  ACTIVITY_LABELS, CALL_OUTCOMES, LEAD_STATUSES, LEAD_STATUS_META, QUOTE_STATUS_META,
  db, followUpState, leadName, timeAgo,
} from '@/lib/crm';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ActivityType, Lead, LeadActivity, LeadStatus, Quote } from '@/types/database';

const ACTIVITY_ICONS: Record<ActivityType, typeof StickyNote> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  status_change: ArrowRightLeft,
  quote_created: FileText,
  quote_sent: Send,
  quote_viewed: Eye,
  quote_accepted: CheckCircle2,
  quote_declined: XCircle,
};

const LOGGABLE: ActivityType[] = ['note', 'call', 'email', 'sms', 'meeting'];

/** "datetime-local" value for a Date (local time, no seconds). */
const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
const at9am = (d: Date) => set(d, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });

export function LeadDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const canEdit = role !== 'viewer';

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Contact edit
  const [contact, setContact] = useState({ name: '', email: '', phone: '', business_name: '', abn: '' });
  const [contactDirty, setContactDirty] = useState(false);

  // Follow-up
  const [followUpAt, setFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Logger
  const [logType, setLogType] = useState<ActivityType>('note');
  const [logOutcome, setLogOutcome] = useState('spoke');
  const [logBody, setLogBody] = useState('');
  const [logging, setLogging] = useState(false);

  // Lost reason prompt
  const [askLost, setAskLost] = useState(false);
  const [lostReason, setLostReason] = useState('');

  async function load() {
    const [l, a, q] = await Promise.all([
      db.from('leads').select('*').eq('id', id).single(),
      db.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      db.from('quotes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ]);
    if (l.data) {
      const d = l.data;
      setLead(d);
      setContact({
        name: d.name ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        business_name: d.business_name ?? '',
        abn: d.abn ?? '',
      });
      setContactDirty(false);
      setFollowUpAt(d.next_follow_up_at ? toLocalInput(new Date(d.next_follow_up_at)) : '');
      setFollowUpNote(d.next_follow_up_note ?? '');
    }
    setActivities(a.data ?? []);
    setQuotes(q.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (!lead) return <div className="py-12 text-center text-muted-foreground">Lead not found.</div>;

  async function logActivity(type: ActivityType, body: string | null, outcome?: string | null) {
    const { data } = await db
      .from('lead_activities')
      .insert({ lead_id: id, type, body, outcome: outcome ?? null, created_by: user?.id ?? null })
      .select('*')
      .single();
    if (data) setActivities((prev) => [data, ...prev]);
  }

  async function changeStatus(status: LeadStatus, reason?: string) {
    if (!lead || status === lead.status) return;
    const prev = lead.status;
    const patch: Partial<Lead> = { status, ...(status === 'lost' ? { lost_reason: reason || null } : {}) };
    const { error } = await db.from('leads').update(patch as never).eq('id', id);
    if (error) return alert(error.message);
    setLead({ ...lead, ...patch });
    await logActivity(
      'status_change',
      `${LEAD_STATUS_META[prev].label} → ${LEAD_STATUS_META[status].label}${reason ? `: ${reason}` : ''}`,
    );
  }

  async function saveContact() {
    const { error } = await db.from('leads').update(contact as never).eq('id', id);
    if (error) return alert(error.message);
    setLead((l) => (l ? { ...l, ...contact } : l));
    setContactDirty(false);
  }

  async function saveFollowUp(at: string | null, note = followUpNote) {
    const iso = at ? new Date(at).toISOString() : null;
    const { error } = await db
      .from('leads')
      .update({ next_follow_up_at: iso, next_follow_up_note: at ? note || null : null } as never)
      .eq('id', id);
    if (error) return alert(error.message);
    setLead((l) => (l ? { ...l, next_follow_up_at: iso, next_follow_up_note: at ? note || null : null } : l));
    setFollowUpAt(at ?? '');
    if (!at) setFollowUpNote('');
  }

  async function submitLog() {
    if (!logBody.trim() && logType !== 'call') return;
    setLogging(true);
    await logActivity(logType, logBody.trim() || null, logType === 'call' ? logOutcome : null);
    // First touch moves a brand-new lead to Contacted.
    if (lead?.status === 'new' && logType !== 'note') await changeStatus('contacted');
    setLogBody('');
    setLogging(false);
  }

  const fu = followUpState(lead);
  const latestQuote = quotes[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{leadName(lead)}</h1>
            <p className="text-sm text-muted-foreground">
              {[lead.business_name && lead.name ? lead.business_name : null, lead.source, `added ${timeAgo(lead.created_at)}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.phone && (
            <Button variant="outline" asChild>
              <a href={`tel:${lead.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a>
            </Button>
          )}
          {lead.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${lead.email}`}><Mail className="mr-2 h-4 w-4" />Email</a>
            </Button>
          )}
          {canEdit && (
            <Button asChild className="bg-forest hover:bg-forest-700 text-white">
              <Link to={`/admin/quotes/new?lead=${lead.id}`}><Plus className="mr-2 h-4 w-4" />New quote</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => {
              const active = lead.status === s;
              return (
                <button
                  key={s}
                  disabled={!canEdit}
                  onClick={() => (s === 'lost' ? setAskLost(true) : changeStatus(s))}
                  title={LEAD_STATUS_META[s].hint}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                    active
                      ? s === 'lost'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-forest text-white border-forest'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {LEAD_STATUS_META[s].label}
                </button>
              );
            })}
          </div>
          {askLost && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Input
                autoFocus
                placeholder="Why was it lost? (rate, bought outright, declined by lender…)"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
              <Button variant="destructive" onClick={() => { changeStatus('lost', lostReason.trim()); setAskLost(false); }}>
                Mark lost
              </Button>
              <Button variant="ghost" onClick={() => setAskLost(false)}>Cancel</Button>
            </div>
          )}
          {lead.status === 'lost' && lead.lost_reason && (
            <p className="mt-3 text-sm text-red-700">Lost: {lead.lost_reason}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Left column ── */}
        <div className="space-y-6">
          <Card className={cn(fu === 'overdue' && 'border-red-300', fu === 'today' && 'border-amber-300')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />Next follow-up
                {fu === 'overdue' && <Badge variant="destructive">Overdue</Badge>}
                {fu === 'today' && <Badge variant="warning">Today</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} disabled={!canEdit} />
              <Input placeholder="What's the follow-up for?" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} disabled={!canEdit} />
              <div className="flex flex-wrap gap-2">
                {[['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]].map(([label, days]) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => saveFollowUp(toLocalInput(at9am(addDays(new Date(), days as number))))}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={!canEdit || !followUpAt} onClick={() => saveFollowUp(followUpAt)}>Save</Button>
                {lead.next_follow_up_at && (
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => saveFollowUp(null)}>Clear</Button>
                )}
              </div>
              {lead.next_follow_up_at && (
                <p className="text-xs text-muted-foreground">
                  Due {format(new Date(lead.next_follow_up_at), "EEE d MMM 'at' h:mm a")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(['name', 'email', 'phone', 'business_name', 'abn'] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs capitalize">{k.replace('_', ' ')}</Label>
                  <Input
                    value={contact[k]}
                    disabled={!canEdit}
                    onChange={(e) => { setContact({ ...contact, [k]: e.target.value }); setContactDirty(true); }}
                  />
                </div>
              ))}
              {contactDirty && <Button size="sm" onClick={saveContact}>Save contact</Button>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Enquiry</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Detail label="Asset" value={`${lead.asset_type || '—'}${lead.asset_condition ? ` · ${lead.asset_condition.replace(/_/g, ' ')}` : ''}`} />
              <Detail label="Amount" value={lead.loan_amount ? formatCurrency(lead.loan_amount) : '—'} />
              <Detail label="Term" value={lead.term_months ? `${lead.term_months} months` : '—'} />
              <Detail label="Balloon" value={lead.balloon_percentage != null ? `${lead.balloon_percentage}%` : '—'} />
              <Detail label="Indicative rate" value={lead.indicative_rate ? formatPercentage(lead.indicative_rate) : '—'} />
              <Detail label="Repayment" value={lead.monthly_repayment ? `${formatCurrency(lead.monthly_repayment)}/mo` : '—'} />
              {lead.reason && <Detail label="Reason" value={lead.reason} />}
              <Detail label="FLWUP" value={lead.flwup_status ?? 'not synced'} />
              {lead.notes && <p className="pt-2 text-muted-foreground whitespace-pre-line">{lead.notes}</p>}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Quotes */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Quotes</CardTitle>
              {latestQuote && <span className="text-xs text-muted-foreground">{quotes.length} total</span>}
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quotes yet.{' '}
                  {canEdit && <Link className="underline" to={`/admin/quotes/new?lead=${lead.id}`}>Create one</Link>}
                </p>
              ) : (
                <div className="divide-y">
                  {quotes.map((q) => (
                    <Link key={q.id} to={`/admin/quotes/${q.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded">
                      <div>
                        <div className="font-medium text-sm">
                          {q.quote_number} · {formatCurrency(q.monthly_repayment)}/mo
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(q.loan_amount)} · {q.term_months}mo · {formatPercentage(q.rate_pct)}
                          {q.view_count ? ` · viewed ${q.view_count}×` : ''}
                        </div>
                      </div>
                      <Badge variant={QUOTE_STATUS_META[q.status].variant}>{QUOTE_STATUS_META[q.status].label}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logger */}
          {canEdit && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {LOGGABLE.map((t) => {
                    const Icon = ACTIVITY_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setLogType(t)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                          logType === t ? 'bg-forest text-white' : 'text-gray-600 hover:bg-gray-100',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />{ACTIVITY_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
                {logType === 'call' && (
                  <Select value={logOutcome} onValueChange={setLogOutcome}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CALL_OUTCOMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Textarea
                  rows={3}
                  value={logBody}
                  onChange={(e) => setLogBody(e.target.value)}
                  placeholder={logType === 'note' ? 'Add a note…' : `What happened on the ${ACTIVITY_LABELS[logType].toLowerCase()}?`}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={submitLog} disabled={logging || (!logBody.trim() && logType !== 'call')}>
                    {logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Log {ACTIVITY_LABELS[logType].toLowerCase()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing logged yet. FLWUP's automated emails and SMS show in FLWUP, not here.
                </p>
              ) : (
                <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                  {activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] ?? StickyNote;
                    const customer = a.type === 'quote_viewed' || a.type === 'quote_accepted' || a.type === 'quote_declined';
                    return (
                      <li key={a.id} className="ml-6">
                        <span
                          className={cn(
                            'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
                            a.type === 'quote_accepted' ? 'bg-green-100 text-green-700'
                              : a.type === 'quote_declined' ? 'bg-red-100 text-red-700'
                              : customer ? 'bg-amber-100 text-amber-700'
                              : 'bg-sage-100 text-forest',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium">{ACTIVITY_LABELS[a.type]}</span>
                          {a.outcome && <Badge variant="outline">{CALL_OUTCOMES[a.outcome] ?? a.outcome}</Badge>}
                          <time className="text-xs text-muted-foreground" title={format(new Date(a.created_at), 'PPpp')}>
                            {timeAgo(a.created_at)}
                          </time>
                        </div>
                        {a.body && <p className="text-sm text-gray-700 whitespace-pre-line mt-0.5">{a.body}</p>}
                        {a.quote_id && (
                          <Link to={`/admin/quotes/${a.quote_id}`} className="text-xs underline text-muted-foreground">View quote</Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
