import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/calculator';
import { LEAD_STATUSES, LEAD_STATUS_META, db, followUpState, leadName, timeAgo } from '@/lib/crm';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Search, Download, Clock, Plus, LayoutList, Columns3, CalendarClock, Inbox, FileText, CheckCircle2 } from 'lucide-react';
import type { FlwupStatus, Lead, LeadStatus, QuoteStatus } from '@/types/database';

// Whether FLWUP has this lead. A null status means the database webhook never
// reached the sync function — that row needs replaying, and hiding it behind a
// dash would make the one failure that matters look like nothing happened.
const flwupBadge: Record<FlwupStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  created: { label: 'In FLWUP', variant: 'success' },
  duplicate: { label: 'In FLWUP (existing)', variant: 'secondary' },
  skipped: { label: 'No contact details', variant: 'warning' },
  error: { label: 'FLWUP rejected', variant: 'destructive' },
};

type View = 'table' | 'board';
const VIEW_KEY = 'assetmx_admin_leads_view';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'table';
  } catch {
    return 'table';
  }
}

export function AdminLeads() {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quoteStats, setQuoteStats] = useState<{ status: QuoteStatus; responded_at: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [dueOnly, setDueOnly] = useState(false);
  const [view, setView] = useState<View>(readView);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    fetchLeads();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* per-viewer convenience only */
    }
  }, [view]);

  async function fetchLeads() {
    try {
      const [l, q] = await Promise.all([
        db.from('leads').select('*').order('created_at', { ascending: false }),
        db.from('quotes').select('status, responded_at'),
      ]);
      if (l.error) throw l.error;
      setLeads(l.data || []);
      setQuoteStats((q.data as typeof quoteStats) || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLeads = useMemo(() => {
    let filtered = leads;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((lead) =>
        [lead.name, lead.business_name, lead.email, lead.abn, lead.phone]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(term)),
      );
    }
    if (statusFilter === 'open') filtered = filtered.filter((l) => l.status !== 'converted' && l.status !== 'lost');
    else if (statusFilter !== 'all') filtered = filtered.filter((l) => l.status === statusFilter);
    if (dueOnly) {
      filtered = filtered
        .filter((l) => {
          const s = followUpState(l);
          return s === 'overdue' || s === 'today';
        })
        .sort((a, b) => a.next_follow_up_at!.localeCompare(b.next_follow_up_at!));
    }
    return filtered;
  }, [leads, searchTerm, statusFilter, dueOnly]);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      due: leads.filter((l) => {
        const s = followUpState(l);
        return s === 'overdue' || s === 'today';
      }).length,
      fresh: leads.filter((l) => l.status === 'new').length,
      awaiting: quoteStats.filter((q) => q.status === 'sent' || q.status === 'viewed').length,
      accepted: quoteStats.filter(
        (q) => q.status === 'accepted' && q.responded_at && new Date(q.responded_at) >= monthStart,
      ).length,
    };
  }, [leads, quoteStats]);

  async function moveLead(lead: Lead, status: LeadStatus) {
    const { error } = await db.from('leads').update({ status } as never).eq('id', lead.id);
    if (error) return alert(error.message);
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    await db.from('lead_activities').insert({
      lead_id: lead.id,
      type: 'status_change',
      body: `${LEAD_STATUS_META[lead.status].label} → ${LEAD_STATUS_META[status].label}`,
      created_by: user?.id ?? null,
    });
  }

  function exportToCSV() {
    const headers = ['Date', 'Name', 'Business Name', 'Email', 'Phone', 'ABN', 'Asset Type', 'Condition',
      'Loan Amount', 'Term (months)', 'Balloon %', 'Rate', 'Monthly Repayment', 'Status', 'Next follow-up', 'Source'];
    const cell = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredLeads.map((lead) => [
      new Date(lead.created_at).toLocaleDateString(), lead.name, lead.business_name, lead.email, lead.phone,
      lead.abn, lead.asset_type, lead.asset_condition, lead.loan_amount, lead.term_months,
      lead.balloon_percentage, lead.indicative_rate, lead.monthly_repayment, lead.status,
      lead.next_follow_up_at ?? '', lead.source ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assetmx-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground">Set up Supabase to see and manage leads.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = role !== 'viewer';
  const boardStatuses = statusFilter === 'all' ? LEAD_STATUSES
    : statusFilter === 'open' ? LEAD_STATUSES.filter((s) => s !== 'converted' && s !== 'lost')
    : [statusFilter as LeadStatus];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />Export CSV
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/quotes/new"><FileText className="mr-2 h-4 w-4" />New quote</Link>
              </Button>
              <Button size="sm" className="bg-forest hover:bg-forest-700 text-white" onClick={() => setShowNew(true)}>
                <Plus className="mr-2 h-4 w-4" />New lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Today strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={CalendarClock}
          label="Follow-ups due"
          value={stats.due}
          tone={stats.due ? 'alert' : undefined}
          onClick={() => { setDueOnly(true); setStatusFilter('open'); }}
        />
        <StatTile icon={Inbox} label="New, not contacted" value={stats.fresh} onClick={() => { setDueOnly(false); setStatusFilter('new'); }} />
        <StatTile icon={FileText} label="Quotes awaiting reply" value={stats.awaiting} onClick={() => navigate('/admin/quotes')} />
        <StatTile icon={CheckCircle2} label="Accepted this month" value={stats.accepted} onClick={() => navigate('/admin/quotes')} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, business, email, ABN, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open leads</SelectItem>
                <SelectItem value="all">All leads</SelectItem>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={dueOnly ? 'default' : 'outline'} onClick={() => setDueOnly(!dueOnly)} className="gap-2">
              <CalendarClock className="h-4 w-4" />Due only
            </Button>
            <div className="flex rounded-md border overflow-hidden">
              <button
                className={cn('px-3 flex items-center', view === 'table' ? 'bg-gray-100' : 'bg-white')}
                onClick={() => setView('table')}
                title="Table"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                className={cn('px-3 flex items-center border-l', view === 'board' ? 'bg-gray-100' : 'bg-white')}
                onClick={() => setView('board')}
                title="Board"
              >
                <Columns3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {boardStatuses.map((s) => {
            const col = filteredLeads.filter((l) => l.status === s);
            return (
              <div key={s} className="w-72 shrink-0 rounded-xl bg-gray-100/70 p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-semibold text-sm">{LEAD_STATUS_META[s].label}</span>
                  <span className="text-xs text-muted-foreground">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} canEdit={canEdit} onMove={(st) => moveLead(lead, st)} />
                  ))}
                  {col.length === 0 && <p className="text-xs text-muted-foreground px-1">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{filteredLeads.length} Lead{filteredLeads.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {leads.length ? 'No leads match your filters.' : 'No leads yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Enquiry</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead>FLWUP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                        <TableCell>
                          <p className="font-medium">{leadName(lead)}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.name && lead.business_name ? `${lead.business_name} · ` : ''}
                            {new Date(lead.created_at).toLocaleDateString()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{lead.email}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{lead.loan_amount ? formatCurrency(lead.loan_amount) : '—'}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {lead.asset_type || '—'}{lead.term_months ? ` / ${lead.term_months}mo` : ''}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={LEAD_STATUS_META[lead.status]?.variant ?? 'outline'}>
                            {LEAD_STATUS_META[lead.status]?.label ?? lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell><FollowUp lead={lead} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {timeAgo(lead.last_activity_at ?? lead.created_at)}
                        </TableCell>
                        <TableCell>
                          {lead.flwup_status ? (
                            <Badge
                              variant={flwupBadge[lead.flwup_status].variant}
                              title={lead.flwup_error ?? lead.flwup_deal_id ?? undefined}
                            >
                              {flwupBadge[lead.flwup_status].label}
                            </Badge>
                          ) : (
                            <Badge variant="warning" title="Webhook never fired — replay via flwup-sync">Not synced</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <NewLeadDialog open={showNew} onClose={() => setShowNew(false)} onCreated={(id) => navigate(`/admin/leads/${id}`)} />
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, tone, onClick,
}: { icon: typeof Clock; label: string; value: number; tone?: 'alert'; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className={cn('hover:shadow-md transition-shadow', tone === 'alert' && 'border-red-300 bg-red-50/50')}>
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <Icon className={cn('h-5 w-5', tone === 'alert' ? 'text-red-600' : 'text-forest')} />
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function FollowUp({ lead }: { lead: Lead }) {
  const s = followUpState(lead);
  if (!s) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span
      className={cn('text-sm whitespace-nowrap', s === 'overdue' && 'text-red-600 font-medium', s === 'today' && 'text-amber-700 font-medium')}
      title={lead.next_follow_up_note ?? undefined}
    >
      {s === 'today' ? `Today ${format(new Date(lead.next_follow_up_at!), 'h:mm a')}` : format(new Date(lead.next_follow_up_at!), 'd MMM')}
    </span>
  );
}

function LeadCard({ lead, canEdit, onMove }: { lead: Lead; canEdit: boolean; onMove: (s: LeadStatus) => void }) {
  return (
    <div className="rounded-lg bg-white border p-3 shadow-sm">
      <Link to={`/admin/leads/${lead.id}`} className="block">
        <div className="font-medium text-sm truncate">{leadName(lead)}</div>
        <div className="text-xs text-muted-foreground truncate">
          {lead.loan_amount ? formatCurrency(lead.loan_amount) : 'No amount'} · {timeAgo(lead.last_activity_at ?? lead.created_at)}
        </div>
        <div className="mt-1"><FollowUp lead={lead} /></div>
      </Link>
      {canEdit && (
        <Select value={lead.status} onValueChange={(v) => onMove(v as LeadStatus)}>
          <SelectTrigger className="h-7 mt-2 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>Move to {LEAD_STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function NewLeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuthStore();
  const empty = { name: '', email: '', phone: '', business_name: '', abn: '', loan_amount: '', notes: '' };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await db
      .from('leads')
      .insert({
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        business_name: f.business_name.trim(),
        abn: f.abn.replace(/\s/g, ''),
        asset_type: '',
        asset_condition: '',
        loan_amount: Number(f.loan_amount) || 0,
        term_months: 0,
        balloon_percentage: 0,
        notes: f.notes.trim() || null,
        status: 'new',
        source: 'admin_manual',
        assigned_to: user?.id ?? null,
      } as never)
      .select('id')
      .single();
    setBusy(false);
    if (err) return setError(err.message);
    setF(empty);
    onClose();
    onCreated((data as { id: string }).id);
  }

  const valid = f.name.trim() && (f.email.trim() || f.phone.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['name', 'Name *'], ['email', 'Email'], ['phone', 'Phone'], ['abn', 'ABN'],
            ['business_name', 'Business name'], ['loan_amount', 'Amount ($)'],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input value={f[k]} type={k === 'loan_amount' ? 'number' : 'text'} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="What are they after?" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Name plus an email or phone. The lead is synced to FLWUP automatically.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={!valid || busy} className="bg-forest hover:bg-forest-700 text-white">Create lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
