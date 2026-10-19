// Supabase Edge Function: send-quote
//
// Emails a quote to the customer and records it on the lead timeline.
// Admin only: the caller's Supabase JWT must belong to a row in admin_users.
//
//   POST { quote_id }                 →  { ok, public_url, email_id }
//        Emails the quote with the PDF quote sheet (quote + terms) attached.
//   POST { quote_id, action: "pdf" }  →  application/pdf
//        The same quote sheet for download, any status (drafts included).
//
// Re-sending is allowed (sent_count increments). A quote the customer has
// already viewed/accepted keeps that status - a resend must not reset it.
//
// Env: RESEND_API_KEY, APP_URL (default https://app.assetmx.com.au),
//      QUOTE_FROM_EMAIL (default "AssetMX <quotes@assetmx.com.au>"),
//      ADMIN_EMAIL (bcc'd on every quote), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import {
  ADMIN_EMAIL,
  assetLabel,
  aud,
  corsHeaders,
  json,
  quoteUrl,
  renderQuoteEmail,
  sendEmail,
  serviceClient,
} from "../_shared/quote.ts";
import { pdfFilename, renderQuotePdf, toBase64 } from "../_shared/quote-pdf.ts";

const db = serviceClient();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Who is calling ─────────────────────────────────────────────────────────
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not signed in" }, 401);
  const { data: auth, error: authError } = await db.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: "Not signed in" }, 401);

  const { data: adminUser } = await db
    .from("admin_users")
    .select("id, email, role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!adminUser) return json({ error: "Admin access required" }, 403);
  // ── Load the quote ─────────────────────────────────────────────────────────
  let body: { quote_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.quote_id) return json({ error: "quote_id is required" }, 400);

  const { data: quote, error: qErr } = await db.from("quotes").select("*").eq("id", body.quote_id).maybeSingle();
  if (qErr || !quote) return json({ error: "Quote not found" }, 404);

  const pdf = await renderQuotePdf(quote);

  if (body.action === "pdf") {
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(quote)}"`,
      },
    });
  }

  if (adminUser.role === "viewer") return json({ error: "Viewers cannot send quotes" }, 403);
  if (!quote.customer_email) return json({ error: "Quote has no customer email" }, 422);

  // ── Send ───────────────────────────────────────────────────────────────────
  const senderEmail = auth.user.email ?? adminUser.email;
  const senderName =
    (auth.user.user_metadata?.full_name as string | undefined) ??
    (auth.user.user_metadata?.name as string | undefined) ??
    null;

  const result = await sendEmail({
    to: [quote.customer_email],
    subject: `Your AssetMX quote ${quote.quote_number}: ${aud(quote.monthly_repayment)}/month for ${assetLabel(quote)}`,
    html: renderQuoteEmail(quote, senderName),
    replyTo: senderEmail ?? ADMIN_EMAIL,
    bcc: ADMIN_EMAIL && ADMIN_EMAIL !== quote.customer_email ? [ADMIN_EMAIL] : undefined,
    tags: [{ name: "kind", value: "quote" }],
    attachments: [{ filename: pdfFilename(quote), content: toBase64(pdf) }],
  });
  if (!result.ok) return json({ error: `Email failed: ${result.error}` }, 502);

  // ── Record ─────────────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const resend = quote.sent_count > 0;
  await db
    .from("quotes")
    .update({
      status: quote.status === "draft" ? "sent" : quote.status,
      sent_at: now,
      sent_count: (quote.sent_count ?? 0) + 1,
      email_id: result.id,
    })
    .eq("id", quote.id);

  if (quote.lead_id) {
    await db.from("lead_activities").insert({
      lead_id: quote.lead_id,
      quote_id: quote.id,
      type: "quote_sent",
      body: `${resend ? "Re-sent" : "Sent"} ${quote.quote_number} to ${quote.customer_email}: ${aud(quote.loan_amount, 0)} over ${quote.term_months} months at ${Number(quote.rate_pct).toFixed(2)}%, ${aud(quote.monthly_repayment)}/month`,
      created_by: auth.user.id,
    });
    // Advance early-stage leads to "quoted"; never move a lead backwards.
    await db.from("leads").update({ status: "quoted" }).eq("id", quote.lead_id).in("status", ["new", "contacted"]);
  }

  return json({ ok: true, public_url: quoteUrl(quote), email_id: result.id });
});
