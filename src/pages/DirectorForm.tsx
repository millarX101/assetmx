import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Camera } from 'lucide-react';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { extractInlineDocument, fileToInlineDocument } from '@/lib/doc-extract';

// Additional director's details and privacy consent (link emailed by the director-form
// edge function). The licence scan is optional and, as in the chat, the photo is never
// stored: it is read in the request and dropped.

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const TIME_AT_ADDRESS = [
  { label: 'Less than 6 months', months: 3 },
  { label: '6-12 months', months: 9 },
  { label: '1-2 years', months: 18 },
  { label: '2+ years', months: 30 },
];

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const key = getSupabaseAnonKey() ?? '';
  const res = await fetch(`${getSupabaseUrl()}/functions/v1/director-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data as T;
}

export function DirectorForm() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<{ businessName: string; primaryContactName: string; consentText: string; status: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState({
    firstName: '', lastName: '', dateOfBirth: '', residentialAddress: '', addressMonths: 0,
    mobile: '', licenceNumber: '', licenceState: '', licenceExpiry: '', creditDeclaration: 'clear', creditDetails: '',
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    call<{ businessName: string; primaryContactName: string; consentText: string; status: string }>({ action: 'get', token })
      .then((d) => {
        setInfo(d);
        if (d.status === 'completed') setDone(true);
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: k === 'addressMonths' ? Number(e.target.value) : e.target.value }));

  async function scanLicence(file: File) {
    setScanning(true);
    setScanNote('');
    try {
      const res = await extractInlineDocument('licence', [await fileToInlineDocument(file)]);
      const l = res?.fields as Record<string, string | null> | undefined;
      if (!l || !l.found) {
        setScanNote('Could not read that licence. Please type the details instead.');
        return;
      }
      setF((prev) => ({
        ...prev,
        firstName: l.firstName || prev.firstName,
        lastName: l.lastName || prev.lastName,
        dateOfBirth: l.dateOfBirth || prev.dateOfBirth,
        residentialAddress: l.address || prev.residentialAddress,
        licenceNumber: l.licenceNumber || prev.licenceNumber,
        licenceState: l.state || prev.licenceState,
        licenceExpiry: l.expiry || prev.licenceExpiry,
      }));
      setScanNote('Filled from your licence. Please check each field. The photo was not kept.');
    } catch {
      setScanNote('Could not read that licence. Please type the details instead.');
    } finally {
      setScanning(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) return setError('Please tick the consent box to continue.');
    setSaving(true);
    try {
      await call({ action: 'submit', token, consent: true, details: f });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md"><CardContent className="p-6 text-center">{loadError}. Please check the link in your email, or reply to it for help.</CardContent></Card>
      </div>
    );
  }
  if (!info) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (done) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-700 mx-auto" />
            <p className="text-lg font-semibold">Thanks, your details are in.</p>
            <p className="text-sm text-ink-600">We have added them to the finance application for {info.businessName}. Nothing else is needed from you for now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Director details for {info.businessName}</CardTitle>
          <p className="text-sm text-ink-600">
            {info.primaryContactName} has applied for finance through AssetMX. Every director guarantees the loan, so the lender needs your details and consent. About two minutes.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-lg border border-ink-200 p-3 text-sm">
              <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) void scanLicence(file); e.target.value = ''; }} />
              <Button type="button" variant="outline" className="gap-2" disabled={scanning} onClick={() => fileRef.current?.click()}>
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {scanning ? 'Reading your licence…' : 'Scan my licence (optional)'}
              </Button>
              <p className="mt-2 text-xs text-ink-600">{scanNote || 'Fills the form from a photo of your licence. We do not keep the photo.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="fn">Given name(s)</Label><Input id="fn" value={f.firstName} onChange={set('firstName')} required /></div>
              <div className="space-y-1"><Label htmlFor="ln">Surname</Label><Input id="ln" value={f.lastName} onChange={set('lastName')} required /></div>
            </div>
            <div className="space-y-1"><Label htmlFor="dob">Date of birth</Label><Input id="dob" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} required /></div>
            <div className="space-y-1"><Label htmlFor="addr">Residential address</Label><Input id="addr" value={f.residentialAddress} onChange={set('residentialAddress')} placeholder="e.g. 12 Smith St, Richmond VIC 3121" required /></div>
            <div className="space-y-1">
              <Label htmlFor="tim">Time at this address</Label>
              <select id="tim" value={f.addressMonths || ''} onChange={set('addressMonths')} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="" disabled>Select…</option>
                {TIME_AT_ADDRESS.map((t) => <option key={t.months} value={t.months}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="mob">Mobile</Label><Input id="mob" type="tel" value={f.mobile} onChange={set('mobile')} placeholder="04XX XXX XXX" required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1"><Label htmlFor="lic">Licence no.</Label><Input id="lic" value={f.licenceNumber} onChange={set('licenceNumber')} /></div>
              <div className="space-y-1">
                <Label htmlFor="lst">State</Label>
                <select id="lst" value={f.licenceState} onChange={set('licenceState')} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">-</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="lex">Expiry</Label><Input id="lex" type="date" value={f.licenceExpiry} onChange={set('licenceExpiry')} /></div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Any defaults, judgments or bankruptcies against you in the last five years?</legend>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="credit" checked={f.creditDeclaration === 'clear'} onChange={() => setF((p) => ({ ...p, creditDeclaration: 'clear' }))} /> No, all clear</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="credit" checked={f.creditDeclaration === 'declare'} onChange={() => setF((p) => ({ ...p, creditDeclaration: 'declare' }))} /> Yes, something to declare</label>
              {f.creditDeclaration === 'declare' && (
                <textarea value={f.creditDetails} onChange={set('creditDetails')} placeholder="Tell us briefly what happened" className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} />
              )}
            </fieldset>

            <label className="flex items-start gap-2 text-sm rounded-lg bg-ink-50 p-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              <span>{info.consentText}</span>
            </label>

            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I agree, submit my details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
