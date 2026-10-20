// Westpac SIMPLE+ application form (WBC0261), pre-filled. Admin only.
//
//   POST { application_id }  ->  the filled PDF (application/pdf)
//
// SIMPLE+ is the pathway for deals outside DriveXpress. The form is an Adobe XFA form:
// its fields live in an XML "datasets" packet, which we fill and Adobe Reader renders.
// Editing the data voids Westpac's Reader-extensions signature (/Perms UR3), so that is
// removed; current Adobe Reader still fills and saves the form.
//
// Not fillable from data (unbound in Westpac's design): the "Equipment Finance" tick
// box and the text columns of the owners / liabilities tables. Staff complete those in
// Reader, plus anything the applicant hasn't given us (assets, liabilities, expenses).
// The blank form lives in the private `lender-forms` storage bucket.

import { PDFArray, PDFDocument, PDFName, decodePDFRawStream } from 'npm:pdf-lib@1.17.1';
import { XMLBuilder, XMLParser } from 'npm:fast-xml-parser@4.5.0';
import { corsHeaders, json, serviceClient } from '../_shared/quote.ts';
import { toCanonical, type CanonicalApplication } from '../_shared/lender/canonical.ts';

const db = serviceClient();
const FORM_PATH = 'westpac-simple-plus.pdf';

const aud = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(n) || 0);
const money = (n: number | null | undefined) => (n == null ? '' : String(Math.round(Number(n) * 100) / 100));

type Node = Record<string, unknown>;
const XML_OPTS = { ignoreAttributes: false, attributeNamePrefix: '@_', preserveOrder: true, textNodeName: '#text', parseTagValue: false, trimValues: false };

/** Fill the form's datasets XML from the standard application. */
function fillDatasets(xml: string, app: CanonicalApplication): string {
  const tree = new XMLParser(XML_OPTS).parse(xml) as Node[];
  const child = (nodes: Node[], name: string): Node[] => {
    let n = nodes.find((x) => x[name] !== undefined);
    if (!n) {
      n = { [name]: [] };
      nodes.push(n);
    }
    return n[name] as Node[];
  };
  const set = (path: string[], value: unknown) => {
    if (value == null || value === '') return;
    let nodes = tree;
    for (const name of ['xfa:datasets', 'xfa:data', 'form1', 'flo', 'ScaleUp', ...path]) nodes = child(nodes, name);
    nodes.length = 0;
    nodes.push({ '#text': String(value) });
  };

  const b = app.borrower, g = app.goods, f = app.finance;
  // The form opens on the SIMPLE+ branch
  {
    let nodes = tree;
    for (const name of ['xfa:datasets', 'xfa:data', 'form1', 'flo', 'BankUseOnly', 'ScaleUp']) nodes = child(nodes, name);
    nodes.length = 0;
    nodes.push({ '#text': 'Scale Up / SIMPLE+' });
  }

  // Business entity
  set(['BusinessEntity', 'BusinessType', 'BW'], 'Borrower');
  if (/company/i.test(b.entityType || '')) set(['BusinessEntity', 'BusinessStructure', 'Prop'], 'Proprietary company');
  else if (/individual|sole/i.test(b.entityType || '')) set(['BusinessEntity', 'BusinessStructure', 'ST'], 'Sole trader/Individual');
  else if (/partnership/i.test(b.entityType || '')) set(['BusinessEntity', 'BusinessStructure', 'PJ'], 'Partnership/Joint');
  set(['BusinessEntity', 'LegalNameB'], b.legalName);
  set(['BusinessEntity', 'ABN_1'],
    b.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4') + (b.acn ? ` / ACN ${b.acn.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}` : ''));
  if (app.declarations.existingWestpacCustomer != null) {
    set(['BusinessEntity', 'BorrowerExisting', 'Prompt', app.declarations.existingWestpacCustomer ? 'Yes' : 'No'], app.declarations.existingWestpacCustomer ? 'Yes' : 'No');
  }

  // Business loan requirements
  const contribution = (f.deposit || 0) + (f.tradeIn || 0);
  set(['BusinessLoanReq', 'Calculation', 'BusAmount', 'Field'], money(g.priceIncGst ?? f.amountFinanced + contribution));
  set(['BusinessLoanReq', 'Calculation', 'Contribution', 'Field'], money(contribution));
  set(['BusinessLoanReq', 'Calculation', 'Total', 'Field'], money(f.amountFinanced));
  set(['BusinessLoanReq', 'Purpose'], [
    `Equipment finance (chattel mortgage) to purchase ${g.condition ? g.condition.replace(/_/g, ' ') + ' ' : ''}${g.description || 'asset'}${g.supplier?.name ? ` from ${g.supplier.name}` : ''}, price ${aud(g.priceIncGst)} inc GST.`,
    `Amount financed ${aud(f.amountFinanced)} over ${f.termMonths} months, monthly repayments in arrears${f.balloonPercent ? `, ${f.balloonPercent}% balloon (${aud(f.balloonAmount)})` : ''}.`,
    contribution ? `Own contribution ${aud(contribution)}${f.deposit ? ` (deposit ${aud(f.deposit)})` : ''}${f.tradeIn ? ` (trade-in ${aud(f.tradeIn)})` : ''}.` : '',
    `Reason for purchase: ${g.purposeOfPurchase || 'to be confirmed'}.`,
    'Repayments from business trading income.',
  ].filter(Boolean).join(' '));
  set(['BusinessLoanReq', 'History'], [
    b.description || '',
    `ABN registered ${b.abnRegisteredDate || 'n/a'}${b.gstRegistered ? `, GST registered${b.gstRegisteredDate ? ` from ${b.gstRegisteredDate}` : ''}` : ''}.`,
    b.tradingNames?.length ? `Trading names: ${b.tradingNames.join(', ')}.` : '',
    b.website ? `Website: ${b.website}.` : '',
  ].filter(Boolean).join(' '));
  set(['BusinessLoanReq', 'BrokerLoan', 'Yes'], 'Yes');
  set(['BusinessLoanReq', 'BrokerLoan', 'OptionalSF', 'BrokerName'], `${app.broker.name} (ACL ${app.broker.acl})`);
  set(['BusinessLoanReq', 'BrokerLoan', 'OptionalSF', 'BrokerEmail'], app.broker.email);

  // People: two blocks on the main page; the rest go in the "additional applicants" pages
  app.individuals.slice(0, 2).forEach((p, i) => {
    const P = (...x: string[]) => ['PersonalDetailsSF', `PersonalDetails${i + 1}`, ...x];
    set(P('GS'), 'Guarantor/Signatory');
    set(P('GivenName'), p.firstName);
    set(P('Surname'), p.lastName);
    set(P('Driver'), [p.driverLicence?.number, p.driverLicence?.state].filter(Boolean).join(' '));
    set(P('Phone', 'NumberSF', 'Number'), p.mobile);
    set(P('Email'), p.email);
    set(['Signature', 'SignatureApp', `Border${i + 1}`, `App${i + 1}`, 'NameSF', 'Name'], [p.firstName, p.lastName].filter(Boolean).join(' '));
  });
  const extra = Math.max(0, app.individuals.length - 2);
  const [key, label] = extra === 0 ? ['No', 'No additional applicants']
    : extra <= 2 ? ['TwoAdded', 'Up to 2 additional applicants']
    : extra <= 4 ? ['FourAdded', 'Up to 4 additional applicants']
    : ['SixAdded', 'Up to 6 additional applicants'];
  set(['AddApplicants', key], label);

  return new XMLBuilder({ ...XML_OPTS, format: false, suppressEmptyNode: true }).build(tree);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Admin only
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Not signed in' }, 401);
  const { data: auth, error: authError } = await db.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: 'Not signed in' }, 401);
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', auth.user.id).maybeSingle();
  if (!adminUser) return json({ error: 'Admin access required' }, 403);

  let body: { application_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body.application_id) return json({ error: 'application_id is required' }, 400);

  const { data: row } = await db.from('applications').select('*').eq('id', body.application_id).maybeSingle();
  if (!row) return json({ error: 'Application not found' }, 404);
  const app = toCanonical(row);

  const { data: blank, error: dlError } = await db.storage.from('lender-forms').download(FORM_PATH);
  if (dlError || !blank) return json({ error: 'Blank SIMPLE+ form not found in lender-forms storage' }, 500);

  try {
    const doc = await PDFDocument.load(new Uint8Array(await blank.arrayBuffer()), { ignoreEncryption: true, updateMetadata: false });
    const acro = doc.catalog.lookup(PDFName.of('AcroForm'));
    // deno-lint-ignore no-explicit-any
    const xfa = (acro as any).lookup(PDFName.of('XFA'), PDFArray) as PDFArray;
    let dsIndex = -1;
    // deno-lint-ignore no-explicit-any
    for (let i = 0; i < xfa.size(); i += 2) if ((xfa.lookup(i) as any).decodeText() === 'datasets') dsIndex = i + 1;
    if (dsIndex < 0) throw new Error('Form has no XFA datasets packet');
    const dsRef = xfa.get(dsIndex);
    // deno-lint-ignore no-explicit-any
    const dsXml = new TextDecoder().decode(decodePDFRawStream(doc.context.lookup(dsRef) as any).decode());

    doc.context.assign(dsRef as never, doc.context.flateStream(fillDatasets(dsXml, app)));
    doc.catalog.delete(PDFName.of('Perms')); // Westpac's Reader-extensions signature: void once edited
    const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });

    await db.from('lender_submissions').insert({
      application_id: row.id, lender: 'westpac_simple_plus', action: 'export', schema_version: 'WBC0261-xfa',
      payload: { reference: app.reference, form: FORM_PATH }, status: 'ok', created_by: auth.user.id,
    });

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${app.reference}-westpac-simple-plus.pdf"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (e) {
    console.error('simple-plus-form error', e);
    return json({ error: `Could not fill the form: ${(e as Error).message}` }, 500);
  }
});
