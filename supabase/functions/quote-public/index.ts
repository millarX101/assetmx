// Supabase Edge Function: quote-public
//
// The customer's side of a quote. No login - the 48-hex-char public_token in
// the /q/<token> link is the credential. Deploy with --no-verify-jwt.
//
//   GET  ?token=<t>[&preview=1]           → customer-safe quote fields
//        Counts a view (and logs the first one to the lead timeline) unless
//        preview=1, which the admin "Preview" button passes.
//   POST { token, action: "accept" | "decline", reason? }
//        Records the response once, logs it, advances the lead on accept and
//        emails ADMIN_EMAIL (plus the quote's creator).
//
// Env: RESEND_API_KEY, ADMIN_EMAIL, APP_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import {
  ADMIN_EMAIL,
  corsHeaders,
  json,
  renderResponseNotice,
  sendEmail,
  serviceClient,
  type Row,
} from "../_shared/quote.ts";
import { pdfFilename, renderQuotePdf } from "../_shared/quote-pdf.ts";

const db = serviceClient();

// Never return internal columns (lead_id, created_by, email_id, view counts).
const PUBLIC_FIELDS = [
  "quote_number", "created_at", "sent_at", "status", "responded_at", "valid_until",
  "customer_name", "business_name", "abn",
  "asset_type", "asset_condition", "asset_description",
  "loan_amount", "term_months", "balloon_percentage", "fee_financed",
  "rate_pct", "monthly_repayment", "weekly_repayment", "fortnightly_repayment",
  "balloon_amount", "amount_financed", "total_repayments", "total_interest", "total_cost",
  "platform_fee", "establishment_fee", "broker_rate_pct", "broker_total_cost", "estimated_saving",
  "message",
];

const pick = (q: Row) => {
  const out: Row = Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, q[k]]));
  out.expired = isExpired(q);
  return out;
};

// valid_until is a date; the quote is good through the end of that day (Sydney).
function isExpired(q: Row) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return q.valid_until < today;
}

const TOKEN_RE = /^[0-9a-f]{48}$/;

async function load(token: string | null | undefined) {
  if (!token || !TOKEN_RE.test(token)) return null;
  const { data } = await db.from("quotes").select("*").eq("public_token", token).neq("status", "draft").maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── View ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const quote = await load(url.searchParams.get("token"));
    if (!quote) return json({ error: "Quote not found" }, 404);

    // PDF quote sheet download. Not counted as a view.
    if (url.searchParams.get("format") === "pdf") {
      return new Response((await renderQuotePdf(quote)) as unknown as BodyInit, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdfFilename(quote)}"`,
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    if (url.searchParams.get("preview") !== "1") {
      const now = new Date().toISOString();
      const first = !quote.first_viewed_at;
      await db
        .from("quotes")
        .update({
          view_count: (quote.view_count ?? 0) + 1,
          first_viewed_at: quote.first_viewed_at ?? now,
          last_viewed_at: now,
          status: quote.status === "sent" ? "viewed" : quote.status,
        })
        .eq("id", quote.id);
      if (first && quote.lead_id) {
        await db.from("lead_activities").insert({
          lead_id: quote.lead_id,
          quote_id: quote.id,
          type: "quote_viewed",
          body: `${quote.customer_name} opened ${quote.quote_number}`,
        });
      }
      if (quote.status === "sent") quote.status = "viewed";
    }
    return json({ quote: pick(quote) });
  }

  // ── Accept / decline ───────────────────────────────────────────────────────
  if (req.method === "POST") {
    let body: { token?: string; action?: string; reason?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const action = body.action === "accept" ? "accepted" : body.action === "decline" ? "declined" : null;
    if (!action) return json({ error: "action must be accept or decline" }, 400);

    const quote = await load(body.token);
    if (!quote) return json({ error: "Quote not found" }, 404);

    // Idempotent: a second click (or a second device) returns the first answer.
    if (quote.status === "accepted" || quote.status === "declined") return json({ quote: pick(quote) });
    if (action === "accepted" && isExpired(quote)) {
      return json({ error: "This quote has expired. Reply to the quote email and we'll re-issue it at today's rate." }, 409);
    }

    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) || null : null;
    const now = new Date().toISOString();
    const { data: updated } = await db
      .from("quotes")
      .update({ status: action, responded_at: now, decline_reason: action === "declined" ? reason : null })
      .eq("id", quote.id)
      .select("*")
      .single();

    if (quote.lead_id) {
      await db.from("lead_activities").insert({
        lead_id: quote.lead_id,
        quote_id: quote.id,
        type: action === "accepted" ? "quote_accepted" : "quote_declined",
        body: `${quote.customer_name} ${action} ${quote.quote_number}${reason ? `: "${reason}"` : ""}`,
      });
      if (action === "accepted") {
        await db.from("leads").update({ status: "qualified" }).eq("id", quote.lead_id).in("status", ["new", "contacted", "quoted"]);
      }
    }

    // Tell the team. Failure here must not fail the customer's response.
    const to = new Set([ADMIN_EMAIL]);
    if (quote.created_by) {
      const { data: creator } = await db.from("admin_users").select("email").eq("id", quote.created_by).maybeSingle();
      if (creator?.email) to.add(creator.email);
    }
    const notice = await sendEmail({
      to: [...to],
      subject: `${action === "accepted" ? "✅ Accepted" : "Declined"}: ${quote.quote_number} - ${quote.customer_name}`,
      html: renderResponseNotice(updated ?? quote, action, reason),
      replyTo: quote.customer_email,
    });
    if (!notice.ok) console.error("[quote-public] notice email failed:", notice.error);

    return json({ quote: pick(updated ?? quote) });
  }

  return json({ error: "Method not allowed" }, 405);
});
