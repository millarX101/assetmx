/**
 * Quick start: three questions on the page, then hand off to the chat
 * application with everything pre-filled. Optional ABN lookup against the
 * app's Supabase edge function when PUBLIC_SUPABASE_* are configured;
 * otherwise the ABN is simply passed through and looked up in the chat.
 */
import { useState } from 'react';
import { APP_LINKS, PRICING } from '@/data/entity';

type Asset = 'vehicle' | 'truck' | 'equipment' | 'other';
const ASSETS: { key: Asset; label: string }[] = [
  { key: 'vehicle', label: 'Car or ute' },
  { key: 'truck', label: 'Truck or trailer' },
  { key: 'equipment', label: 'Equipment or machinery' },
  { key: 'other', label: 'Something else' },
];
const AMOUNTS = [20_000, 50_000, 100_000, 250_000];

interface Lookup { entityName: string; abnStatus: string; gstRegistered: boolean; abnRegisteredDate: string }

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

const money = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
const cleanAbn = (s: string) => s.replace(/\D/g, '');
const validAbn = (abn: string) => {
  if (abn.length !== 11) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = abn.split('').reduce((acc, d, i) => acc + (Number(d) - (i === 0 ? 1 : 0)) * w[i], 0);
  return sum % 89 === 0;
};
const monthsSince = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
};

async function lookupAbn(abn: string): Promise<Lookup | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/abn-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ abn }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.found) return null;
    return data as Lookup;
  } catch {
    return null;
  }
}

export default function QuickStart() {
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [abn, setAbn] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null | 'skipped'>(null);
  const [error, setError] = useState<string | null>(null);

  const chosenAmount = amount ?? (Number(cleanAbn(custom)) || null);
  const abnClean = cleanAbn(abn);

  const submitAbn = async () => {
    setError(null);
    if (!validAbn(abnClean)) {
      setError('That does not look like a valid 11-digit ABN.');
      return;
    }
    setBusy(true);
    const result = await lookupAbn(abnClean);
    setLookup(result ?? 'skipped');
    setBusy(false);
    setStep(4);
  };

  const href = (() => {
    const p = new URLSearchParams({ src: 'quickstart' });
    if (asset && asset !== 'other') p.set('asset', asset);
    if (chosenAmount) p.set('amount', String(Math.min(Math.max(chosenAmount, PRICING.minAmount), PRICING.maxAmount)));
    if (abnClean) p.set('abn', abnClean);
    return `${APP_LINKS.quote}?${p.toString()}`;
  })();

  const fit = lookup && lookup !== 'skipped'
    ? { active: lookup.abnStatus === 'Active', gst: lookup.gstRegistered, months: monthsSince(lookup.abnRegisteredDate) }
    : null;
  const fits = fit ? fit.active && fit.gst && fit.months >= PRICING.minAbnMonths : null;

  return (
    <div className="card p-5 md:p-6" id="quickstart">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage text-forest" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 12 L8 3 L13 12 M5 9 H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Quick start</p>
            <p className="mt-1 text-xs text-ink-500">Question {Math.min(step, 3)} of 3</p>
          </div>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-6 rounded-full ${step >= i ? 'bg-forest' : 'bg-ink-200'}`} />)}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {/* Q1 */}
        <div className="rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-sm">Hi. What are you looking to finance?</div>
        {step === 1 ? (
          <div className="flex flex-wrap gap-2">
            {ASSETS.map((a) => (
              <button key={a.key} type="button" onClick={() => { setAsset(a.key); setStep(2); }} className="rounded-pill border border-ink-300 bg-paper px-4 py-2 text-sm font-medium hover:border-forest hover:bg-sage-100">
                {a.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="ml-auto w-fit rounded-2xl rounded-tr-md bg-forest px-4 py-2 text-sm text-canvas">{ASSETS.find((a) => a.key === asset)?.label}</p>
        )}

        {/* Q2 */}
        {step >= 2 && <div className="rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-sm">Roughly how much do you need to finance?</div>}
        {step === 2 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {AMOUNTS.map((v) => (
                <button key={v} type="button" onClick={() => { setAmount(v); setStep(3); }} className="rounded-pill border border-ink-300 bg-paper px-4 py-2 text-sm font-medium hover:border-forest hover:bg-sage-100 num">
                  {money(v)}
                </button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (chosenAmount) { setAmount(chosenAmount); setStep(3); } }}>
              <input inputMode="numeric" placeholder="Or type an amount" value={custom} onChange={(e) => setCustom(e.target.value)} className="min-w-0 flex-1 rounded-pill border border-ink-300 bg-paper px-4 py-2 text-sm focus:border-forest focus:outline-none" aria-label="Amount to finance" />
              <button type="submit" className="btn-ghost py-2">Next</button>
            </form>
          </div>
        )}
        {step >= 3 && <p className="ml-auto w-fit rounded-2xl rounded-tr-md bg-forest px-4 py-2 text-sm text-canvas num">{chosenAmount ? money(chosenAmount) : 'Not sure yet'}</p>}

        {/* Q3 */}
        {step >= 3 && <div className="rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-sm">What is your ABN? We will pre-fill your business details from the register.</div>}
        {step === 3 && (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submitAbn(); }}>
            <div className="flex gap-2">
              <input inputMode="numeric" autoComplete="off" placeholder="11-digit ABN" value={abn} onChange={(e) => setAbn(e.target.value)} className="min-w-0 flex-1 rounded-pill border border-ink-300 bg-paper px-4 py-2 text-sm num focus:border-forest focus:outline-none" aria-label="Australian Business Number" />
              <button type="submit" disabled={busy} className="btn-primary py-2 disabled:opacity-60">{busy ? 'Checking…' : 'Check'}</button>
            </div>
            {error && <p className="text-xs text-red">{error}</p>}
            <p className="text-xs text-ink-500">No credit check. We only read the public Australian Business Register.</p>
          </form>
        )}
        {step === 4 && (
          <>
            <p className="ml-auto w-fit rounded-2xl rounded-tr-md bg-forest px-4 py-2 text-sm text-canvas num">ABN {abnClean.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}</p>
            <div className="rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-sm">
              {fit ? (
                <>
                  <p className="font-semibold">{(lookup as Lookup).entityName}</p>
                  <ul className="mt-2 space-y-1 text-ink-700">
                    <li>{fit.active ? '✓' : '✗'} ABN {fit.active ? 'active' : (lookup as Lookup).abnStatus.toLowerCase()}</li>
                    <li>{fit.gst ? '✓' : '✗'} {fit.gst ? 'Registered for GST' : 'Not registered for GST'}</li>
                    <li>{fit.months >= PRICING.minAbnMonths ? '✓' : '✗'} Trading {Math.floor(fit.months / 12)} years {fit.months % 12} months</li>
                  </ul>
                  <p className="mt-2">
                    {fits
                      ? 'That fits bank low-doc policy. The rest takes about four minutes in chat.'
                      : 'That sits outside bank low-doc policy. You can still continue, and we will say plainly what is possible.'}
                  </p>
                </>
              ) : (
                <p>Thanks. We will confirm your business details in the next step, then it is about four minutes to a full application.</p>
              )}
            </div>
            <a href={href} className="btn-primary w-full">Start application</a>
            <button type="button" onClick={() => { setStep(1); setAsset(null); setAmount(null); setCustom(''); setAbn(''); setLookup(null); }} className="block w-full text-center text-xs text-ink-500 hover:text-ink">Start over</button>
          </>
        )}
      </div>
    </div>
  );
}
