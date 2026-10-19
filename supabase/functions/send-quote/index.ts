// Supabase Edge Function: send-quote
//
// Emails a quote to the customer and records it on the lead timeline.
// Admin only: the caller's Supabase JWT must belong to a row in admin_users.
//
//   POST { quote_id }                 →  { ok, public_url, email_id }
//        Emails the quote with the PDF quote sheet (quote + terms) attached.
//        Reply-To is QUOTE_REPLY_TO (default info@assetmx.com.au).
//   POST { quote_id, action: "pdf" }  →  application/pdf
//        The same quote sheet for download, any status (drafts included).
//
// Re-sending is allowed (sent_count increments). A quote the customer has
// already viewed/accepted keeps that status - a resend must not reset it.
//
// Env: RESEND_API_KEY, APP_URL (default https://app.assetmx.com.au),
//      QUOTE_FROM_EMAIL (default "AssetMX <quotes@assetmx.com.au>"),
//      ADMIN_EMAIL (bcc'd on every quote), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { corsHeaders, json, serviceClient } from "../_shared/quote.ts";
import { pdfFilename, renderQuotePdf } from "../_shared/quote-pdf.ts";
import { deliverQuote } from "../_shared/quote-send.ts";

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

  if (body.action === "pdf") {
    const pdf = await renderQuotePdf(quote);
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(quote)}"`,
      },
    });
  }

  if (adminUser.role === "viewer") return json({ error: "Viewers cannot send quotes" }, 403);

  const sent = await deliverQuote(db, quote, { actorId: auth.user.id });
  if (!sent.ok) return json({ error: sent.error }, 502);
  return json({ ok: true, public_url: sent.public_url, email_id: sent.email_id });
});
