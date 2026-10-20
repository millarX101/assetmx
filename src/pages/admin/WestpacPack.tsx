import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

// Printable application summary for keying into Westpac DriveOnline, in the order of
// Westpac's "Minimum Documentation Requirements" (items required for all applications,
// including DriveXpress / Matrix). Print or save as PDF from the browser.
// The business check's lender notes show on screen only (print:hidden).

/* eslint-disable @typescript-eslint/no-explicit-any */
type App = Record<string, any>;

const aud = (n: unknown, dp = 2) =>
  n == null || n === '' ? '-' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: dp, maximumFractionDigits: dp }).format(Number(n));
const auDate = (d: unknown) => {
  if (!d) return '-';
  const t = new Date(String(d));
  return isNaN(t.getTime()) ? String(d) : t.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' });
};
const auDateTime = (d: unknown) =>
  d ? new Date(String(d)).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Australia/Sydney' }) + ' (Sydney)' : '-';
const monthsSince = (d: unknown) => {
  const t = new Date(String(d));
  if (!d || isNaN(t.getTime())) return 0;
  const n = new Date();
  return (n.getFullYear() - t.getFullYear()) * 12 + (n.getMonth() - t.getMonth());
};
const reference = (id: string) => `APP-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
const addressDuration = (m: unknown) => {
  const months = Number(m);
  if (!months) return '-';
  return months >= 24 ? '2 years or more' : months >= 12 ? '1-2 years' : months >= 6 ? '6-12 months' : 'Under 6 months';
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-neutral-200 align-top">
      <td className="py-1.5 pr-4 w-[38%] text-neutral-600">{label}</td>
      <td className="py-1.5 font-medium">{value ?? '-'}</td>
    </tr>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="text-base font-bold border-b-2 border-neutral-800 pb-1 mb-2">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function Check({ ok, warn, label, note }: { ok: boolean; warn?: boolean; label: string; note?: string }) {
  const mark = ok ? '✓' : warn ? '!' : '✗';
  const colour = ok ? 'text-green-700' : warn ? 'text-amber-700' : 'text-red-700';
  return (
    <li className="flex gap-2 py-1">
      <span className={`font-bold w-4 ${colour}`}>{mark}</span>
      <span>
        <span className="font-medium">{label}</span>
        {note && <span className={`block text-sm ${ok ? 'text-neutral-600' : colour}`}>{note}</span>}
      </span>
    </li>
  );
}

export function WestpacPack() {
  const { id } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (supabase.from('applications') as any)
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: e }: { data: App | null; error: { message: string } | null }) => {
        if (e || !data) setError(e?.message || 'Application not found');
        else setApp(data);
      });
  }, [id]);

  if (error) return <div className="p-8">Could not load the application: {error}</div>;
  if (!app) return <div className="p-8 text-neutral-500">Loading…</div>;

  const directors: App[] = Array.isArray(app.directors) ? app.directors : app.directors?.directors || [];
  const bp: App = app.business_profile || {};
  const elig: App = app.eligibility_checks || {};
  const abnMonths = monthsSince(app.abn_registered_date);
  const goods = [app.asset_year, app.asset_make, app.asset_model].filter(Boolean).join(' ') || app.asset_description || '-';
  const background = bp.applicantCorrections || bp.applicantDescription || (bp.confirmedByApplicant ? bp.summary : '');
  const primary = directors[app.primary_contact_index || 0] || directors[0] || {};
  const primaryName = [primary.firstName, primary.lastName].filter(Boolean).join(' ');

  const clientOk = !!(primaryName && primary.dateOfBirth && primary.address && background);
  const goodsOk = !!(goods !== '-' && app.purchase_reason);
  const abnOk = abnMonths >= 24 && !!app.gst_registered && String(app.abn_status || 'Active').toLowerCase() === 'active';
  const consentOk = !!app.privacy_consent_at && directors.length <= 1;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="max-w-[820px] mx-auto px-4 pt-4 flex justify-between print:hidden">
        <Link to={`/admin/applications/${app.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-700">
          <ArrowLeft className="h-4 w-4" /> Back to application
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <article className="max-w-[820px] mx-auto my-4 bg-white p-10 shadow print:shadow-none print:p-0 print:my-0 text-[13px] leading-snug text-neutral-900">
        <header className="flex justify-between items-start border-b-2 border-neutral-900 pb-3">
          <div>
            <h1 className="text-xl font-bold">Equipment finance application</h1>
            <p className="text-neutral-600">
              {elig.lenderTrack === 'metro'
                ? 'Prepared for Metro Finance (streamlined product)'
                : 'Prepared for Westpac Equipment Finance (DriveOnline, DriveXpress)'}
            </p>
            {elig.lenderTrack === 'metro' && elig.driveXpressMiss && (
              <p className="text-xs text-neutral-500">Not DriveXpress: {elig.driveXpressMiss}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold">{reference(app.id)}</p>
            <p className="text-neutral-600">Submitted {auDate(app.created_at)}</p>
          </div>
        </header>

        <section className="mt-4 border border-neutral-300 rounded p-3 break-inside-avoid">
          <h2 className="font-bold mb-1">Minimum documentation: required for all applications</h2>
          <ul>
            <Check ok={clientOk} label="Client information, including background of business and directors"
              note={clientOk ? undefined : `Missing: ${[!primaryName && 'name', !primary.dateOfBirth && 'date of birth', !primary.address && 'address', !background && 'business background'].filter(Boolean).join(', ')}`} />
            <Check ok={goodsOk} label="Full description of goods and reason for purchase"
              note={goodsOk ? undefined : `Missing: ${[goods === '-' && 'goods description', !app.purchase_reason && 'reason for purchase'].filter(Boolean).join(', ')}`} />
            <Check ok={abnOk} label="ABN for 2 years and GST registered"
              note={`ABN registered ${auDate(app.abn_registered_date)} (${Math.floor(abnMonths / 12)} years ${abnMonths % 12} months); ${app.gst_registered ? 'GST registered' : 'NOT GST registered'}`} />
            <Check ok={consentOk} warn={!!app.privacy_consent_at && directors.length > 1} label="Privacy consent from all individuals"
              note={!app.privacy_consent_at ? 'No consent record on this application' : directors.length > 1 ? `Applicant consented ${auDateTime(app.privacy_consent_at)}. Other directors/guarantors: consent still to be collected.` : `Consented ${auDateTime(app.privacy_consent_at)}`} />
          </ul>
        </section>

        <Section n={1} title="Business">
          <table className="w-full"><tbody>
            <Row label="Legal name" value={app.entity_name} />
            <Row label="ABN" value={app.abn} />
            {/company/i.test(String(app.entity_type)) && String(app.abn).replace(/\D/g, '').length === 11 && (
              <Row label="ACN" value={String(app.abn).replace(/\D/g, '').slice(2).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} />
            )}
            <Row label="Entity type" value={app.entity_type} />
            <Row label="ABN status / registered" value={`${app.abn_status || 'Active'}, since ${auDate(app.abn_registered_date)}`} />
            <Row label="GST registered" value={app.gst_registered ? `Yes${app.gst_registered_date ? `, since ${auDate(app.gst_registered_date)}` : ''}` : 'No'} />
            {bp.tradingNames?.length > 0 && <Row label="Trading names" value={bp.tradingNames.join(', ')} />}
            <Row label="Location" value={[app.business_address, app.business_state, app.business_postcode].filter(Boolean).join(' ') || '-'} />
            {bp.industry && <Row label="Industry" value={bp.industry} />}
            <Row label="What the business does" value={
              background ? (
                <>
                  {background}
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    {bp.applicantCorrections ? 'In the applicant’s words (corrected our public-source summary)'
                      : bp.applicantDescription ? 'In the applicant’s words'
                      : 'Public-source summary, confirmed by the applicant'}
                  </span>
                </>
              ) : <span className="text-red-700">Not provided</span>
            } />
            {bp.description && bp.description !== background && <Row label="Business profile (public sources)" value={bp.description} />}
            {bp.servicesProducts?.length > 0 && <Row label="Services / products" value={bp.servicesProducts.join(', ')} />}
            {bp.customers && <Row label="Customers" value={bp.customers} />}
            {bp.serviceArea && <Row label="Service area" value={bp.serviceArea} />}
            {bp.locations?.length > 0 && <Row label="Premises" value={bp.locations.join('; ')} />}
            {bp.operatingSince && <Row label="Operating since" value={bp.operatingSince} />}
            {bp.history && <Row label="History" value={bp.history} />}
            {bp.size && <Row label="Size" value={bp.size} />}
            {bp.accreditations?.length > 0 && <Row label="Licences and memberships" value={bp.accreditations.join(', ')} />}
            {bp.website && <Row label="Website" value={bp.website} />}
            {bp.onlinePresence?.length > 0 && <Row label="Online profiles" value={<span className="break-all">{bp.onlinePresence.join(' · ')}</span>} />}
            {bp.reviews && <Row label="Reviews" value={bp.reviews} />}
            {bp.keyPeople?.length > 0 && <Row label="Key people (public sources)" value={bp.keyPeople.map((p: App) => `${p.name} (${p.role})`).join('; ')} />}
          </tbody></table>
          {bp.sources?.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500 break-words">Public sources: {bp.sources.map((s: App) => s.url).join(' · ')}</p>
          )}
          {bp.lenderNotes && (
            <div className="mt-3 border border-amber-300 bg-amber-50 rounded p-3 text-sm print:hidden">
              <p className="font-bold text-amber-800">Internal: business check notes (not printed)</p>
              <p className="mt-1 whitespace-pre-line">{bp.lenderNotes}</p>
            </div>
          )}
        </Section>

        <Section n={2} title={directors.length > 1 ? 'Directors and guarantors' : 'Director / guarantor'}>
          {directors.length === 0 && <p className="text-red-700">No director details on this application.</p>}
          {directors.map((d, i) => {
            const name = [d.firstName, d.lastName].filter(Boolean).join(' ');
            const hasDetails = !!(name && d.dateOfBirth);
            return (
              <div key={i} className="mb-3 break-inside-avoid">
                <p className="font-bold">{name || d.email || `Director ${i + 1}`}{i === (app.primary_contact_index || 0) ? ' (applicant)' : ''}</p>
                {hasDetails ? (
                  <table className="w-full"><tbody>
                    <Row label="Date of birth" value={auDate(d.dateOfBirth)} />
                    <Row label="Residential address" value={d.address} />
                    <Row label="Time at address" value={addressDuration(d.addressMonths)} />
                    {d.previousAddress && <Row label="Previous address" value={d.previousAddress} />}
                    <Row label="Driver licence" value={d.licenceNumber ? `${d.licenceNumber}${d.licenceState ? ` (${d.licenceState})` : ''}${d.licenceExpiry ? `, expires ${auDate(d.licenceExpiry)}` : ''}` : '-'} />
                    <Row label="Mobile" value={d.phone} />
                    <Row label="Email" value={d.email} />
                  </tbody></table>
                ) : (
                  <p className="text-red-700">Details and privacy consent still to be collected{d.email ? ` (email: ${d.email})` : ''}.</p>
                )}
              </div>
            );
          })}
          <table className="w-full"><tbody>
            <Row label="Defaults, judgments or bankruptcies (last 5 years)" value={
              elig.creditDeclaration === 'clear' ? 'None declared'
                : elig.creditDeclaration === 'declare' ? <span className="text-red-700">Declared: {elig.creditDetails || 'no details given'}</span>
                : '-'
            } />
            <Row label="Existing Westpac business customer" value={elig.existingWestpacCustomer === true ? 'Yes' : elig.existingWestpacCustomer === false ? 'No (new to business bank)' : '-'} />
            <Row label="Owns residential property, income 5k+" value={elig.ownsProperty === true ? 'Yes' : elig.ownsProperty === false ? 'No' : elig.existingWestpacCustomer ? 'Not required (existing customer)' : '-'} />
            {elig.lenderTrack === 'metro' && (
              <>
                <Row label="Property position (Metro)" value={elig.propertyStatus === 'own' ? 'In borrower/guarantor name' : elig.propertyStatus === 'spouse' ? "In spouse's name" : elig.propertyStatus === 'none' ? 'Non-property backed' : '-'} />
                <Row label="Comparable credit reference (Metro)" value={elig.creditReference === 'asset_finance' ? 'Vehicle/equipment loan in last 12 months, paid on time (obtain reference)' : elig.creditReference === 'mortgage' ? '12 months home loan statements (obtain)' : '-'} />
                {elig.existingMetroCustomer != null && <Row label="Existing Metro customer (12 months good history)" value={elig.existingMetroCustomer ? 'Yes (higher limits; Metro history is the credit reference)' : 'No'} />}
                {elig.taxiRideshare && <Row label="Use" value="Taxi / rideshare (property-backed)" />}
              </>
            )}
            {elig.existingWestpacCustomer && (
              <Row label="Existing Westpac EF balances (stated)" value={elig.westpacExposure != null ? aud(elig.westpacExposure, 0) : '-'} />
            )}
            {elig.primaryProducer != null && <Row label="Primary producer, 40 ha+ (Metro Agri)" value={elig.primaryProducer ? 'Yes' : 'No'} />}
            <Row label="Tax and BAS current, no ATO payment plan" value={elig.taxUpToDate === true ? 'Yes (verbal, in the online application)' : elig.taxUpToDate === false ? 'No' : '-'} />
          </tbody></table>
        </Section>

        <Section n={3} title="Goods and reason for purchase">
          <table className="w-full"><tbody>
            <Row label="Goods" value={goods} />
            <Row label="Asset type / condition" value={[app.asset_type, app.asset_condition?.replace(/_/g, ' ')].filter(Boolean).join(', ')} />
            <Row label="Supplier" value={[app.supplier_name, app.supplier_abn && `ABN ${app.supplier_abn}`].filter(Boolean).join(', ') || '-'} />
            {app.asset_price_ex_gst ? <Row label="Price ex GST" value={aud(app.asset_price_ex_gst)} /> : null}
            {app.asset_gst ? <Row label="GST" value={aud(app.asset_gst)} /> : null}
            <Row label="Price inc GST" value={aud(app.asset_price_inc_gst)} />
            <Row label="Reason for purchase" value={app.purchase_reason || <span className="text-red-700">Not provided</span>} />
            {elig.goodsFit && (
              <Row label="Suits the business (automatic check)" value={
                <span className={elig.goodsFit === 'yes' ? '' : elig.goodsFit === 'no' ? 'text-red-700' : 'text-amber-700'}>
                  {elig.goodsFit === 'yes' ? 'Yes' : elig.goodsFit === 'no' ? 'No: review' : 'Unclear: review'}{elig.goodsFitNote ? ` - ${elig.goodsFitNote}` : ''}
                </span>
              } />
            )}
            {Number(app.accessories_amount) > 0 && (
              <Row label="Accessories / modifications" value={
                <span className={Number(app.accessories_amount) / Number(app.asset_price_inc_gst || 1) > 0.1 ? 'text-red-700' : ''}>
                  {aud(app.accessories_amount)} ({Math.round((Number(app.accessories_amount) / Number(app.asset_price_inc_gst || 1)) * 100)}% of the invoice; DriveXpress max 10%)
                </span>
              } />
            )}
            {(app.asset_vin || app.asset_serial_number) ? (
              <Row label="VIN / serial" value={[app.asset_vin && `VIN ${app.asset_vin}`, app.asset_serial_number && `Serial ${app.asset_serial_number}`, app.asset_engine_number && `Engine ${app.asset_engine_number}`, app.asset_registration && `Rego ${app.asset_registration}`].filter(Boolean).join(' · ')} />
            ) : (
              <Row label="VIN / serial" value={<span className="text-amber-700">Not on the invoice: obtain before settlement{elig.lenderTrack === 'metro' ? ' (Metro: assets must be serial numbered)' : ''}</span>} />
            )}
            {app.business_use_percentage ? <Row label="Business use" value={`${app.business_use_percentage}%`} /> : null}
          </tbody></table>
        </Section>

        <Section n={4} title="Finance requested">
          <table className="w-full"><tbody>
            <Row label="Amount to finance" value={aud(app.loan_amount)} />
            {Number(app.deposit_amount) > 0 && <Row label="Deposit" value={aud(app.deposit_amount)} />}
            {Number(app.trade_in_amount) > 0 && <Row label="Trade-in" value={aud(app.trade_in_amount)} />}
            <Row label="Term" value={`${app.term_months} months, payments monthly in arrears`} />
            <Row label="Balloon" value={Number(app.balloon_percentage) > 0 ? `${app.balloon_percentage}%${app.balloon_amount ? ` (${aud(app.balloon_amount)})` : ''}` : 'None'} />
            {app.indicative_rate ? <Row label="Indicative rate quoted" value={`${Number(app.indicative_rate).toFixed(2)}% p.a.`} /> : null}
            {app.monthly_repayment ? <Row label="Indicative repayment" value={`${aud(app.monthly_repayment)} per month`} /> : null}
          </tbody></table>
        </Section>

        <Section n={5} title="Privacy consent">
          {app.privacy_consent_at ? (
            <table className="w-full"><tbody>
              <Row label="Consented by" value={primaryName || primary.email || '-'} />
              <Row label="When" value={auDateTime(app.privacy_consent_at)} />
              <Row label="Wording agreed to" value={app.privacy_consent_text || '-'} />
              <Row label="How" value="Tapped “I agree” in the AssetMX online application before submitting" />
            </tbody></table>
          ) : (
            <p className="text-red-700">No consent record on this application (submitted before consent records were kept).</p>
          )}
        </Section>

        <footer className="mt-8 pt-2 border-t border-neutral-300 text-xs text-neutral-500">
          Blackrock Leasing Pty Ltd trading as AssetMX · Australian Credit Licence 569484 · Generated {auDateTime(new Date().toISOString())}
        </footer>
      </article>
    </div>
  );
}
