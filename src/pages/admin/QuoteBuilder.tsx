// /admin/quotes/new            blank quote
// /admin/quotes/new?lead=<id>  quote for an existing lead (prefilled)
// /admin/quotes/new?from=<id>  re-quote: copy an existing quote
// /admin/quotes/new?edit=<id>  edit a draft in place
//
// Left: calculator inputs + customer. Right: the exact document the customer
// will see. Saving without a linked lead creates one (source 'admin_quote'),
// which the flwup-sync trigger pushes into FLWUP like any other lead.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Link2, Loader2, Save, Send, X } from 'lucide-react';
import { fetchRates } from '@/lib/rates';
import { getBaseRate, getMaxBalloon, type QuoteInput } from '@/lib/calculator';
import { quoteFigures, sendQuote } from '@/lib/quotes';
import { ASSET_CONDITION_LABELS, ASSET_TYPE_LABELS, db, leadName } from '@/lib/crm';
import { useAuthStore } from '@/stores/authStore';
import { QuoteDocument } from '@/components/quotes/QuoteDocument';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Lead, Quote } from '@/types/database';

type AssetType = QuoteInput['assetType'];
type Condition = QuoteInput['assetCondition'];

const TERMS = [12, 24, 36, 48, 60, 72, 84];
const VALIDITY = [7, 14, 30];

const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local
};

const LEAD_FIELDS = 'id, name, email, phone, business_name, abn, asset_type, asset_condition, loan_amount, term_months, balloon_percentage';
type LeadPick = Pick<Lead, 'id' | 'name' | 'email' | 'phone' | 'business_name' | 'abn' | 'asset_type' | 'asset_condition' | 'loan_amount' | 'term_months' | 'balloon_percentage'>;

export function QuoteBuilder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const editId = params.get('edit');

  // Customer
  const [lead, setLead] = useState<LeadPick | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [business, setBusiness] = useState('');
  const [abn, setAbn] = useState('');

  // Quote
  const [assetType, setAssetType] = useState<AssetType>('vehicle');
  const [condition, setCondition] = useState<Condition>('new');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('50000');
  const [term, setTerm] = useState(60);
  const [balloon, setBalloon] = useState('0');
  const [feeFinanced, setFeeFinanced] = useState(true);
  const [rateOverride, setRateOverride] = useState('');
  const [validDays, setValidDays] = useState(14);
  const [message, setMessage] = useState('');

  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lead search
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LeadPick[]>([]);

  useEffect(() => {
    fetchRates().finally(() => setRatesLoaded(true));
  }, []);

  function applyLead(l: LeadPick, withLoan: boolean) {
    setLead(l);
    setName(l.name ?? '');
    setEmail(l.email ?? '');
    setPhone(l.phone ?? '');
    setBusiness(l.business_name ?? '');
    setAbn(l.abn ?? '');
    if (withLoan) {
      if (l.asset_type in ASSET_TYPE_LABELS) setAssetType(l.asset_type as AssetType);
      if (l.asset_condition in ASSET_CONDITION_LABELS) setCondition(l.asset_condition as Condition);
      if (l.loan_amount >= 5000) setAmount(String(l.loan_amount));
      if (TERMS.includes(l.term_months)) setTerm(l.term_months);
      if (l.balloon_percentage != null) setBalloon(String(l.balloon_percentage));
    }
    setSearch('');
    setResults([]);
  }

  function applyQuote(q: Quote, keepMeta: boolean) {
    setName(q.customer_name);
    setEmail(q.customer_email);
    setPhone(q.customer_phone ?? '');
    setBusiness(q.business_name ?? '');
    setAbn(q.abn ?? '');
    setAssetType(q.asset_type);
    setCondition(q.asset_condition);
    setDescription(q.asset_description ?? '');
    setAmount(String(q.loan_amount));
    setTerm(q.term_months);
    setBalloon(String(q.balloon_percentage));
    setFeeFinanced(q.fee_financed);
    if (keepMeta) setMessage(q.message ?? '');
  }

  // Prefill from ?lead / ?from / ?edit
  useEffect(() => {
    const leadId = params.get('lead');
    const sourceId = editId ?? params.get('from');
    (async () => {
      if (sourceId) {
        const { data: q } = await db.from('quotes').select('*').eq('id', sourceId).single();
        if (q) {
          applyQuote(q, true);
          // Carry a non-table rate through a re-quote
          if (Number(q.rate_pct) !== getBaseRate(q.term_months)) setRateOverride(String(q.rate_pct));
          if (q.lead_id) {
            const { data: l } = await db.from('leads').select(LEAD_FIELDS).eq('id', q.lead_id).single();
            if (l) setLead(l as LeadPick);
          }
        }
      } else if (leadId) {
        const { data: l } = await db.from('leads').select(LEAD_FIELDS).eq('id', leadId).single();
        if (l) applyLead(l as LeadPick, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = search.trim().replace(/[%,()]/g, '');
    if (t.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await db
        .from('leads')
        .select(LEAD_FIELDS)
        .or(`name.ilike.%${t}%,business_name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`)
        .order('created_at', { ascending: false })
        .limit(8);
      setResults((data as LeadPick[]) ?? []);
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const maxBalloon = getMaxBalloon(term);
  const input: QuoteInput = {
    assetType,
    assetCondition: condition,
    loanAmount: Number(amount),
    termMonths: term,
    balloonPercentage: Math.min(Number(balloon) || 0, maxBalloon),
    financePlatformFee: feeFinanced,
    rateOverride: rateOverride.trim() ? Number(rateOverride) : undefined,
  };

  const calc = useMemo(() => {
    try {
      if (input.rateOverride !== undefined && !(input.rateOverride > 0 && input.rateOverride < 40)) {
        throw new Error('Rate must be between 0 and 40%');
      }
      return { figures: quoteFigures(input), error: null };
    } catch (e) {
      return { figures: null, error: (e as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input), ratesLoaded]);

  const validUntil = plusDays(validDays);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSave = !!calc.figures && name.trim().length > 0 && emailValid && role !== 'viewer';

  async function save(send: boolean) {
    if (!calc.figures) return;
    setSaving(send ? 'send' : 'draft');
    setError(null);
    try {
      const f = calc.figures;

      // 1. Lead: link or create
      let leadId = lead?.id ?? null;
      if (!leadId) {
        const { data: newLead, error: leadErr } = await db
          .from('leads')
          .insert({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            business_name: business.trim(),
            abn: abn.replace(/\s/g, ''),
            asset_type: assetType,
            asset_condition: condition,
            loan_amount: input.loanAmount,
            term_months: term,
            balloon_percentage: input.balloonPercentage,
            indicative_rate: f.rate_pct,
            monthly_repayment: f.monthly_repayment,
            total_cost: f.total_cost,
            estimated_saving: f.estimated_saving,
            status: 'new',
            source: 'admin_quote',
            assigned_to: user?.id ?? null,
          } as never)
          .select('id')
          .single();
        if (leadErr) throw leadErr;
        leadId = (newLead as { id: string }).id;
      }

      // 2. Quote
      const row = {
        lead_id: leadId,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || null,
        business_name: business.trim() || null,
        abn: abn.trim() || null,
        asset_type: assetType,
        asset_condition: condition,
        asset_description: description.trim() || null,
        loan_amount: input.loanAmount,
        term_months: term,
        balloon_percentage: input.balloonPercentage,
        fee_financed: feeFinanced,
        message: message.trim() || null,
        valid_until: validUntil,
        ...f,
      };

      let quoteId: string;
      if (editId) {
        const { error: upErr } = await db.from('quotes').update(row).eq('id', editId);
        if (upErr) throw upErr;
        quoteId = editId;
      } else {
        const { data: q, error: qErr } = await db
          .from('quotes')
          .insert({ ...row, created_by: user?.id ?? null })
          .select('id, quote_number')
          .single();
        if (qErr) throw qErr;
        quoteId = q.id;
        await db.from('lead_activities').insert({
          lead_id: leadId,
          quote_id: q.id,
          type: 'quote_created',
          body: `Created ${q.quote_number}: ${input.loanAmount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })} over ${term} months at ${f.rate_pct.toFixed(2)}%`,
          created_by: user?.id ?? null,
        });
      }

      // 3. Send
      if (send) {
        try {
          await sendQuote(quoteId);
        } catch (e) {
          navigate(`/admin/quotes/${quoteId}`, {
            state: { flash: `Saved, but the email failed: ${(e as Error).message}`, tone: 'error' },
          });
          return;
        }
      }
      navigate(`/admin/quotes/${quoteId}`, {
        state: { flash: send ? `Quote sent to ${email.trim()}` : 'Draft saved', tone: 'ok' },
      });
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Could not save the quote');
    } finally {
      setSaving(null);
    }
  }

  const preview = calc.figures && {
    quote_number: editId ? 'Draft' : 'AMX-####',
    valid_until: validUntil,
    customer_name: name || 'Customer name',
    business_name: business || null,
    abn: abn || null,
    asset_type: assetType,
    asset_condition: condition,
    asset_description: description || null,
    loan_amount: input.loanAmount,
    term_months: term,
    balloon_percentage: input.balloonPercentage,
    fee_financed: feeFinanced,
    message: message || null,
    ...calc.figures,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Edit draft quote' : 'New quote'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!canSave || !!saving} onClick={() => save(false)}>
            {saving === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button
            className="bg-forest hover:bg-forest-700 text-white"
            disabled={!canSave || !!saving}
            onClick={() => save(true)}
          >
            {saving === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {emailValid ? `Send to ${email.trim()}` : 'Send quote'}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* ── Inputs ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead ? (
                <div className="flex items-center justify-between rounded-lg bg-sage-100 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-forest" />
                    Linked to lead{' '}
                    <Link to={`/admin/leads/${lead.id}`} className="font-semibold underline">
                      {leadName(lead)}
                    </Link>
                  </span>
                  {!editId && (
                    <button onClick={() => setLead(null)} className="text-ink-500 hover:text-ink" title="Unlink">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Find an existing lead (name, business, email, phone)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg max-h-72 overflow-auto">
                      {results.map((r) => (
                        <button
                          key={r.id}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => applyLead(r, true)}
                        >
                          <div className="font-medium">{leadName(r)}</div>
                          <div className="text-xs text-muted-foreground">
                            {[r.business_name, r.email, r.phone].filter(Boolean).join(' · ')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Or fill in the details below. A new lead is created on save and synced to FLWUP.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name *" value={name} onChange={setName} />
                <Field label="Email *" value={email} onChange={setEmail} type="email" />
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field label="ABN" value={abn} onChange={setAbn} />
                <div className="col-span-2">
                  <Field label="Business name" value={business} onChange={setBusiness} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Finance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Asset type</Label>
                  <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_CONDITION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field
                label="Asset description"
                value={description}
                onChange={setDescription}
                placeholder="e.g. 2025 Toyota HiLux SR5 dual cab"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount ($)" value={amount} onChange={setAmount} type="number" />
                <div>
                  <Label className="text-xs">Term</Label>
                  <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TERMS.map((t) => (
                        <SelectItem key={t} value={String(t)}>{t} months ({t / 12} yr)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label={`Balloon % (max ${maxBalloon}%)`}
                  value={balloon}
                  onChange={setBalloon}
                  type="number"
                />
                <Field
                  label={`Rate override (table ${getBaseRate(term).toFixed(2)}%)`}
                  value={rateOverride}
                  onChange={setRateOverride}
                  type="number"
                  placeholder="Lender rate %"
                />
              </div>
              {Number(balloon) > maxBalloon && (
                <p className="text-xs text-amber-700">Balloon capped at {maxBalloon}% for this term.</p>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={feeFinanced} onCheckedChange={(v) => setFeeFinanced(v === true)} />
                Finance the $800 AssetMX fee into the loan
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Message &amp; validity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Personal note (shown on the quote and in the email)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Great chatting today. Here's the quote on the HiLux, based on the 5-year term we discussed…"
                  rows={4}
                />
              </div>
              <div>
                <Label className="text-xs">Valid for</Label>
                <Select value={String(validDays)} onValueChange={(v) => setValidDays(Number(v))}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALIDITY.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Preview ── */}
        <div className="xl:sticky xl:top-6 self-start">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Customer preview</div>
          {preview ? (
            <QuoteDocument quote={preview} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-red-700">{calc.error}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
