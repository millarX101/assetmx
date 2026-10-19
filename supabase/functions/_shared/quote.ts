// Shared by send-quote and quote-public: entity details, formatting, the
// customer quote email and the admin "customer responded" notice.
//
// Entity details mirror site/src/data/entity.ts (ENTITY / PRICING). Keep them
// byte-identical - the quote is a credit document and the ABN/ACL on it must
// match the website.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const ENTITY = {
  brand: "AssetMX",
  legalName: "Blackrock Leasing Pty Ltd",
  abn: "15 681 267 818",
  acl: "569484",
  email: "info@assetmx.com.au",
  siteUrl: "https://assetmx.com.au",
};

export const APP_URL = (Deno.env.get("APP_URL") ?? "https://app.assetmx.com.au").replace(/\/$/, "");
export const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? ENTITY.email;
export const FROM_EMAIL = Deno.env.get("QUOTE_FROM_EMAIL") ?? "AssetMX <quotes@assetmx.com.au>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// deno-lint-ignore no-explicit-any
export type Row = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

export const aud = (n: number, dp = 2) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(Number(n));

export const pct = (n: number) => `${Number(n).toFixed(2)}%`;

export const longDate = (d: string) =>
  new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });

const ASSET_TYPE: Record<string, string> = {
  vehicle: "Vehicle",
  truck: "Truck / trailer",
  equipment: "Equipment / machinery",
};
const CONDITION: Record<string, string> = {
  new: "New",
  demo: "Demo",
  used_0_3: "Used (0-3 yrs)",
  used_4_7: "Used (4-7 yrs)",
  used_8_plus: "Used (8+ yrs)",
};

export const assetLabel = (q: Row) =>
  q.asset_description ||
  `${CONDITION[q.asset_condition] ?? q.asset_condition} ${(ASSET_TYPE[q.asset_type] ?? q.asset_type).toLowerCase()}`;

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const firstName = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";

export const quoteUrl = (q: Row) => `${APP_URL}/q/${q.public_token}`;

export const DISCLAIMER =
  "This is an indicative quote, not an offer or approval of credit. The rate, fees and repayments are " +
  "subject to the lender's credit assessment, verification of your information and the asset, and may change " +
  "before settlement. Finance is for business purposes only. Repayments are calculated in advance, with the " +
  "first payment due at settlement.";

export const LICENCE_LINE =
  `${ENTITY.legalName} trading as ${ENTITY.brand} · ABN ${ENTITY.abn} · Australian Credit Licence ${ENTITY.acl}`;

// ─────────────────────────────────────────────────────────────────────────────
// Email templates (inline styles only - email clients strip <style>)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  forest: "#3D472B",
  forestDark: "#272E1B",
  sage: "#CCDBB2",
  sageLight: "#F0FAE1",
  sand: "#EBDDC5",
  ivory: "#F9F4ED",
  ink: "#201E1D",
  muted: "#6B655F",
  line: "#E4DACB",
};

function shell(inner: string, preheader: string) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AssetMX</title></head>
<body style="margin:0;padding:0;background:${C.ivory};font-family:Figtree,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.ink};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ivory};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.forest};padding:22px 28px;">
  <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Asset<span style="color:${C.sage};">MX</span></span>
  <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.sage};margin-top:2px;">Transparent Finance</div>
</td></tr>
${inner}
<tr><td style="padding:18px 28px;background:${C.ivory};border-top:1px solid ${C.line};font-size:11px;line-height:1.6;color:${C.muted};">
  ${esc(LICENCE_LINE)}<br>
  <a href="${ENTITY.siteUrl}" style="color:${C.forest};">assetmx.com.au</a> · <a href="mailto:${ENTITY.email}" style="color:${C.forest};">${ENTITY.email}</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function row(label: string, value: string, strong = false) {
  return `<tr>
<td style="padding:7px 0;font-size:14px;color:${C.muted};">${esc(label)}</td>
<td align="right" style="padding:7px 0;font-size:14px;${strong ? "font-weight:700;" : ""}color:${C.ink};">${esc(value)}</td>
</tr>`;
}

export function renderQuoteEmail(q: Row, senderName?: string | null) {
  const url = quoteUrl(q);
  const fee = q.fee_financed ? "financed into the loan" : "paid upfront";
  const message = q.message
    ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;white-space:pre-line;">${esc(q.message)}</p>`
    : "";

  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(firstName(q.customer_name))},</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">
    Here's your finance quote for the <strong>${esc(assetLabel(q))}</strong>${q.business_name ? ` for ${esc(q.business_name)}` : ""}.
    It's the lender's rate with no commission added - our only fee is a flat ${aud(q.platform_fee, 0)}.
  </p>
  ${message}
</td></tr>
<tr><td style="padding:0 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sageLight};border-radius:12px;">
  <tr><td style="padding:20px 22px;" align="center">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.forest};">Monthly repayment</div>
    <div style="font-size:36px;font-weight:800;color:${C.forestDark};margin:4px 0;">${aud(q.monthly_repayment)}</div>
    <div style="font-size:13px;color:${C.muted};">${aud(q.weekly_repayment)} weekly · ${aud(q.fortnightly_repayment)} fortnightly</div>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Quote", q.quote_number)}
    ${row("Amount", aud(q.loan_amount, 0))}
    ${row("Term", `${q.term_months} months`)}
    ${row("Indicative rate", pct(q.rate_pct), true)}
    ${Number(q.balloon_amount) > 0 ? row(`Balloon (${q.balloon_percentage}%)`, aud(q.balloon_amount)) : ""}
    ${row("AssetMX fee", `${aud(q.platform_fee, 0)} ${fee}`)}
    ${row("Valid until", longDate(q.valid_until))}
  </table>
</td></tr>
<tr><td style="padding:20px 28px 8px;" align="center">
  <a href="${url}" style="display:inline-block;background:${C.forest};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 30px;border-radius:999px;">View &amp; accept your quote</a>
  <p style="margin:12px 0 0;font-size:12px;color:${C.muted};">Full cost breakdown, printable PDF and one-click acceptance.</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;">
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Any questions, just reply to this email.</p>
  <p style="margin:0;font-size:15px;">Cheers,<br><strong>${esc(senderName || "The AssetMX team")}</strong><br><span style="color:${C.muted};font-size:13px;">AssetMX</span></p>
  <p style="margin:22px 0 0;font-size:11px;line-height:1.6;color:${C.muted};">${esc(DISCLAIMER)}</p>
</td></tr>`;

  return shell(inner, `Your ${aud(q.monthly_repayment)}/month quote at ${pct(q.rate_pct)} - ${q.quote_number}`);
}

export function renderResponseNotice(q: Row, action: "accepted" | "declined", reason?: string | null) {
  const accepted = action === "accepted";
  const inner = `
<tr><td style="padding:28px;">
  <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:${accepted ? C.forest : "#8A4A1F"};">
    ${accepted ? "Quote accepted" : "Quote declined"} - ${esc(q.quote_number)}
  </p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">
    <strong>${esc(q.customer_name)}</strong>${q.business_name ? ` (${esc(q.business_name)})` : ""} ${action} their quote for
    ${esc(assetLabel(q))}: ${aud(q.loan_amount, 0)} over ${q.term_months} months at ${pct(q.rate_pct)}, ${aud(q.monthly_repayment)}/month.
  </p>
  ${reason ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;"><strong>Reason given:</strong> ${esc(reason)}</p>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0">
    ${row("Email", q.customer_email)}
    ${q.customer_phone ? row("Phone", q.customer_phone) : ""}
  </table>
  <p style="margin:22px 0 0;">
    <a href="${APP_URL}/admin/quotes/${q.id}" style="display:inline-block;background:${C.forest};color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">Open in AssetMX admin</a>
  </p>
</td></tr>`;
  return shell(inner, `${q.customer_name} ${action} ${q.quote_number}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resend
// ─────────────────────────────────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  bcc?: string[];
  tags?: { name: string; value: string }[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
      bcc: opts.bcc,
      tags: opts.tags,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let error = `Resend ${res.status}`;
    try {
      error = JSON.parse(text).message ?? error;
    } catch { /* keep status */ }
    return { ok: false, error };
  }
  return { ok: true, id: JSON.parse(text).id };
}
