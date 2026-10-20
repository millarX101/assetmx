// Additional directors: details and privacy consent, collected online.
//
//   POST { action: "create", directorEmail, businessName, primaryContactName, primaryContactEmail }
//        -> { token }   (emails the director a one-time link to /director/<token>)
//   POST { action: "get", token }      -> { status, businessName, primaryContactName, consentText }
//   POST { action: "submit", token, details, consent: true }  -> { ok }
//
// Westpac DriveXpress needs privacy consent from all individuals and every director
// guarantees; Metro needs every guarantor. The token is the credential, as with quote
// links. Details join back to the application by token (applications.directors[].requestToken).

import { ADMIN_EMAIL, APP_URL, C, QUOTE_REPLY_TO, corsHeaders, esc, json, row, sendEmail, serviceClient, shell } from '../_shared/quote.ts';

const db = serviceClient();
const MAX_REQUESTS_PER_EMAIL_PER_DAY = 3;

const DIRECTOR_CONSENT_TEXT =
  'I am a director of the business and will guarantee this loan. I consent to AssetMX sharing my identity details, and the information I have provided, with its lender panel and with credit reporting bodies for the assessment of this application. A credit enquiry will be made.';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function requestEmail(link: string, businessName: string, primaryName: string) {
  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 14px;font-size:16px;">Hi,</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
    ${esc(primaryName)} has applied for finance for <strong>${esc(businessName)}</strong> through AssetMX and listed you as a director.
    Every director guarantees the loan, so the lender needs your details and your privacy consent.
  </p>
  <p style="margin:0 0 6px;font-size:15px;line-height:1.6;">It takes about two minutes: name, date of birth, address, driver licence and a consent tick.</p>
</td></tr>
<tr><td style="padding:16px 28px 8px;">
  <a href="${link}" style="display:inline-block;background:${C.forest};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 30px;border-radius:999px;">Add my details</a>
  <p style="margin:12px 0 0;font-size:12px;color:${C.muted};">This link is just for you. Please don't forward it.</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;">
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.muted};">Questions? Reply to this email.</p>
  <p style="margin:0;font-size:15px;"><strong>AssetMX</strong></p>
</td></tr>`;
  return shell(inner, `${businessName}: add your director details`);
}

function completedEmail(r: Record<string, unknown>, d: Record<string, unknown>) {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ');
  const inner = `
<tr><td style="padding:28px;">
  <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:${C.forest};">Director details received</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>${esc(name)}</strong> completed their details and privacy consent for <strong>${esc(r.business_name)}</strong>.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row('Email', String(r.director_email))}
    ${row('Credit declaration', d.creditDeclaration === 'declare' ? `Declared: ${String(d.creditDetails || '')}` : 'None declared', d.creditDeclaration === 'declare')}
    ${row('Applicant', String(r.primary_contact_name || ''))}
  </table>
  <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">Their details appear in the application's Westpac pack and lender exports.</p>
</td></tr>`;
  return shell(inner, `Director details received: ${name}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // ── create ────────────────────────────────────────────────────────────────
  if (b.action === 'create') {
    const directorEmail = str(b.directorEmail).toLowerCase();
    if (!isEmail(directorEmail)) return json({ error: 'A valid director email is required' }, 400);
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await db.from('director_requests').select('id', { count: 'exact', head: true })
      .eq('director_email', directorEmail).gte('created_at', since);
    if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_DAY) return json({ error: 'Too many requests for this email today' }, 429);

    const token = newToken();
    const businessName = str(b.businessName) || 'the business';
    const primaryName = str(b.primaryContactName) || 'A director';
    const { error } = await db.from('director_requests').insert({
      token, director_email: directorEmail, business_name: businessName,
      primary_contact_name: primaryName, primary_contact_email: str(b.primaryContactEmail).toLowerCase() || null,
    });
    if (error) return json({ error: 'Could not create the request' }, 500);

    const sent = await sendEmail({
      to: [directorEmail],
      subject: `${businessName}: add your director details`,
      html: requestEmail(`${APP_URL}/director/${token}`, businessName, primaryName),
      replyTo: QUOTE_REPLY_TO,
    });
    return json({ token, emailed: sent.ok });
  }

  // ── get / submit (token is the credential) ────────────────────────────────
  const token = str(b.token, 64);
  if (!token) return json({ error: 'token is required' }, 400);
  const { data: r } = await db.from('director_requests').select('*').eq('token', token).maybeSingle();
  if (!r) return json({ error: 'This link is not valid' }, 404);

  if (b.action === 'get') {
    return json({ status: r.status, businessName: r.business_name, primaryContactName: r.primary_contact_name, consentText: DIRECTOR_CONSENT_TEXT });
  }

  if (b.action === 'submit') {
    if (r.status === 'completed') return json({ error: 'These details have already been submitted' }, 409);
    if (b.consent !== true) return json({ error: 'Privacy consent is required' }, 400);
    const d = (b.details || {}) as Record<string, unknown>;
    const details = {
      firstName: str(d.firstName, 80),
      lastName: str(d.lastName, 80),
      dateOfBirth: str(d.dateOfBirth, 10),
      residentialAddress: str(d.residentialAddress, 200),
      addressMonths: Number(d.addressMonths) || null,
      mobile: str(d.mobile, 20),
      licenceNumber: str(d.licenceNumber, 20),
      licenceState: str(d.licenceState, 3),
      licenceExpiry: str(d.licenceExpiry, 10),
      creditDeclaration: d.creditDeclaration === 'declare' ? 'declare' : 'clear',
      creditDetails: str(d.creditDetails, 500) || null,
    };
    if (!details.firstName || !details.lastName || !/^\d{4}-\d{2}-\d{2}$/.test(details.dateOfBirth) || !details.residentialAddress || !details.mobile) {
      return json({ error: 'Name, date of birth, address and mobile are required' }, 400);
    }
    const { error } = await db.from('director_requests').update({
      details, status: 'completed', consent_at: new Date().toISOString(), consent_text: DIRECTOR_CONSENT_TEXT, completed_at: new Date().toISOString(),
    }).eq('id', r.id).eq('status', 'pending');
    if (error) return json({ error: 'Could not save your details' }, 500);

    await sendEmail({
      to: [ADMIN_EMAIL],
      subject: `Director details received: ${details.firstName} ${details.lastName} (${r.business_name})`,
      html: completedEmail(r, details),
      replyTo: r.director_email,
    });
    return json({ ok: true });
  }

  return json({ error: 'action must be create, get or submit' }, 400);
});
