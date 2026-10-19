// Email a quote (with its PDF quote sheet) and record it: quote status, the
// lead timeline, and the lead's stage. Shared by send-quote (an admin presses
// Send) and request-quote (automatic quotes), so both behave identically.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  ADMIN_EMAIL,
  QUOTE_REPLY_TO,
  assetLabel,
  aud,
  quoteUrl,
  renderQuoteEmail,
  sendEmail,
  type Row,
} from "./quote.ts";
import { pdfFilename, renderQuotePdf, toBase64 } from "./quote-pdf.ts";

export async function deliverQuote(
  db: SupabaseClient,
  quote: Row,
  opts: { actorId?: string | null; bccAdmin?: boolean } = {},
): Promise<{ ok: true; public_url: string; email_id: string } | { ok: false; error: string }> {
  if (!quote.customer_email) return { ok: false, error: "Quote has no customer email" };

  const pdf = await renderQuotePdf(quote);
  const result = await sendEmail({
    to: [quote.customer_email],
    subject: `Your AssetMX quote ${quote.quote_number}: ${aud(quote.monthly_repayment)}/month for ${assetLabel(quote)}`,
    html: renderQuoteEmail(quote),
    replyTo: QUOTE_REPLY_TO,
    bcc: opts.bccAdmin !== false && ADMIN_EMAIL && ADMIN_EMAIL !== quote.customer_email ? [ADMIN_EMAIL] : undefined,
    tags: [{ name: "kind", value: "quote" }],
    attachments: [{ filename: pdfFilename(quote), content: toBase64(pdf) }],
  });
  if (!result.ok) return { ok: false, error: `Email failed: ${result.error}` };

  const now = new Date().toISOString();
  const resend = (quote.sent_count ?? 0) > 0;
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
      body: `${resend ? "Re-sent" : "Sent"} ${quote.quote_number}${opts.actorId ? "" : " automatically"} to ${quote.customer_email}: ${aud(quote.amount_financed, 0)} financed over ${quote.term_months} months at ${Number(quote.rate_pct).toFixed(2)}%, ${aud(quote.monthly_repayment)}/month`,
      created_by: opts.actorId ?? null,
    });
    // Advance early-stage leads to "quoted"; never move a lead backwards.
    await db.from("leads").update({ status: "quoted" }).eq("id", quote.lead_id).in("status", ["new", "contacted"]);
  }

  return { ok: true, public_url: quoteUrl(quote), email_id: result.id };
}
