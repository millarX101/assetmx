// Supabase Edge Function: request-quote
//
// Automatic quotes, no human involved: a customer asks for a quote (from the
// chat's "Email me this quote", or any future form), this checks the business
// is eligible, prices it with the shared engine, emails the PDF quote sheet
// and records the lead. Accepting the quote opens the prefilled application.
// Deploy with --no-verify-jwt (public, like abn-lookup).
//
//   POST {
//     name, email, phone?, abn,
//     asset_type: vehicle|truck|equipment, asset_condition, asset_description?,
//     asset_price, deposit?, trade_in?, term_months?, balloon_pct?, fee_financed?,
//     source?: "chat" | "site", website?: ""   // honeypot, must be empty
//   }
//   → { status: "sent", quote_number, monthly_repayment, rate_pct }
//   → { status: "ineligible", reason }   lead saved for FLWUP, no quote sent
//   → { status: "limited" }              too many requests for this email / overall
//
// ELIGIBILITY (same rules as the chat): ABN active, registered 24+ months,
// registered for GST. Checked live against the ABR via the abn-lookup function.
// If the ABR can't be reached we don't quote - the lead goes to FLWUP instead.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, RESEND_API_KEY, APP_URL.

import { aud, corsHeaders, json, quoteUrl, serviceClient } from "../_shared/quote.ts";
import { baseRateFor, computeQuote, evDiscountFor, getMaxBalloon } from "../_shared/quote-engine.ts";
import { deliverQuote } from "../_shared/quote-send.ts";

const db = serviceClient();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PER_EMAIL_PER_DAY = 3;
const GLOBAL_PER_HOUR = 40;
const VALID_DAYS = 14;
const TERMS = [12, 24, 36, 48, 60, 72, 84];
const ASSET_TYPES = ["vehicle", "truck", "equipment"];
const CONDITIONS = ["new", "demo", "used_0_3", "used_4_7", "used_8_plus"];

/** Exact, case-insensitive match: escape LIKE wildcards in the address. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const monthsSince = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
};

async function checkAbn(abn: string): Promise<{ ok: true; entityName: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/abn-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ abn }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok || !r.found) return { ok: false, reason: "ABN not found on the ABR" };
    if (String(r.abnStatus).toLowerCase() !== "active") return { ok: false, reason: `ABN status is ${r.abnStatus}` };
    if (monthsSince(r.abnRegisteredDate) < 24) return { ok: false, reason: "ABN registered less than 24 months" };
    if (!r.gstRegistered) return { ok: false, reason: "Not registered for GST" };
    return { ok: true, entityName: r.entityName || "" };
  } catch (e) {
    return { ok: false, reason: `ABR check unavailable (${(e as Error).message})` };
  }
}

async function termRates(): Promise<Record<number, number>> {
  const { data } = await db.from("rate_config").select("term_months, base_rate").eq("is_active", true).not("term_months", "is", null);
  const rates: Record<number, number> = {};
  for (const row of data ?? []) rates[row.term_months] = Number(row.base_rate);
  return rates;
}

/** Most recent lead for this email in the last 60 days, so a repeat request doesn't create a second FLWUP deal. */
async function findLead(email: string) {
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data } = await db
    .from("leads")
    .select("id, notes")
    .ilike("email", likeEscape(email))
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot: bots fill every field. Pretend success, do nothing.
  if (str(b.website)) return json({ status: "sent" });

  // ── Validate ───────────────────────────────────────────────────────────────
  const name = str(b.name, 120);
  const email = str(b.email, 200).toLowerCase();
  const phone = str(b.phone, 40);
  const abn = str(b.abn, 20).replace(/\D/g, "");
  const assetType = ASSET_TYPES.includes(str(b.asset_type)) ? str(b.asset_type) : "vehicle";
  const condition = CONDITIONS.includes(str(b.asset_condition)) ? str(b.asset_condition) : "new";
  const description = str(b.asset_description, 160) || null;
  const price = num(b.asset_price);
  const deposit = num(b.deposit ?? 0) || 0;
  const tradeIn = num(b.trade_in ?? 0) || 0;
  const term = TERMS.includes(num(b.term_months)) ? num(b.term_months) : 60;
  const balloonPct = Math.min(Math.max(num(b.balloon_pct ?? 0) || 0, 0), getMaxBalloon(term));
  const feeFinanced = b.fee_financed !== false;
  const source = str(b.source, 20) || "chat";
  const evDiscount = evDiscountFor(b.is_ev === true && assetType === "vehicle");

  if (!name) return json({ error: "Name is required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email is required" }, 400);
  if (abn.length !== 11) return json({ error: "A valid 11-digit ABN is required" }, 400);
  if (!(price > 0)) return json({ error: "Asset price is required" }, 400);

  // ── Rate limits ────────────────────────────────────────────────────────────
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const hourAgo = new Date(Date.now() - 36e5).toISOString();
  const [{ count: perEmail }, { count: global }] = await Promise.all([
    db.from("quotes").select("id", { count: "exact", head: true }).is("created_by", null).ilike("customer_email", likeEscape(email)).gte("created_at", dayAgo),
    db.from("quotes").select("id", { count: "exact", head: true }).is("created_by", null).gte("created_at", hourAgo),
  ]);
  if ((perEmail ?? 0) >= PER_EMAIL_PER_DAY || (global ?? 0) >= GLOBAL_PER_HOUR) return json({ status: "limited" }, 429);

  // ── Price it first (cheap; rejects bad numbers before the ABR call) ────────
  let figures;
  try {
    figures = computeQuote({
      assetPrice: price,
      deposit,
      tradeIn,
      termMonths: term,
      balloonPct,
      feeFinanced,
      ratePct: baseRateFor(term, await termRates()) - evDiscount,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 422);
  }

  // ── Eligibility ────────────────────────────────────────────────────────────
  const elig = await checkAbn(abn);
  const existing = await findLead(email);

  if (!elig.ok) {
    // No quote. Keep the enquiry as a lead so FLWUP follows it up.
    const note = `Automatic quote not sent: ${elig.reason}. Asked for ${aud(figures.loan_amount, 0)} over ${term} months.`;
    if (existing) {
      await db.from("leads").update({ notes: [existing.notes, note].filter(Boolean).join("\n") }).eq("id", existing.id);
    } else {
      await db.from("leads").insert({
        name, email, phone, abn, business_name: "",
        asset_type: assetType, asset_condition: condition,
        loan_amount: figures.loan_amount, term_months: term, balloon_percentage: balloonPct,
        status: "new", source: `auto_quote_${source}`, reason: elig.reason, notes: note,
      });
    }
    return json({ status: "ineligible", reason: elig.reason });
  }

  // ── Create the quote ───────────────────────────────────────────────────────
  const validUntil = new Date(Date.now() + VALID_DAYS * 864e5).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const { data: quote, error: qErr } = await db
    .from("quotes")
    .insert({
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      business_name: elig.entityName || null,
      abn,
      asset_type: assetType,
      asset_condition: condition,
      asset_description: description,
      finance_type: "chattel_mortgage",
      prepared_by: "AssetMX",
      term_months: term,
      balloon_percentage: balloonPct,
      fee_financed: feeFinanced,
      valid_until: validUntil,
      created_by: null,
      ...figures,
    })
    .select("*")
    .single();
  if (qErr || !quote) return json({ error: `Could not create quote: ${qErr?.message}` }, 500);

  // ── Lead (reuse a recent one; the note gives FLWUP the quote link) ─────────
  const note = `Automatic quote ${quote.quote_number} emailed: ${aud(quote.monthly_repayment)}/month at ${Number(quote.rate_pct).toFixed(2)}%${evDiscount ? ` (incl. ${evDiscount}% EV/PHEV discount)` : ""}. ${quoteUrl(quote)}`;
  let leadId: string;
  if (existing) {
    leadId = existing.id;
    await db.from("leads").update({ notes: [existing.notes, note].filter(Boolean).join("\n") }).eq("id", leadId);
  } else {
    const { data: lead, error: lErr } = await db
      .from("leads")
      .insert({
        name, email, phone, abn, business_name: elig.entityName || "",
        asset_type: assetType, asset_condition: condition,
        loan_amount: figures.loan_amount, term_months: term, balloon_percentage: balloonPct,
        indicative_rate: figures.rate_pct, monthly_repayment: figures.monthly_repayment, total_cost: figures.total_cost,
        status: "new", source: `auto_quote_${source}`, notes: note,
      })
      .select("id")
      .single();
    if (lErr || !lead) return json({ error: `Could not save lead: ${lErr?.message}` }, 500);
    leadId = lead.id;
  }
  await db.from("quotes").update({ lead_id: leadId }).eq("id", quote.id);
  quote.lead_id = leadId;
  await db.from("lead_activities").insert({
    lead_id: leadId,
    quote_id: quote.id,
    type: "quote_created",
    body: `Created ${quote.quote_number} automatically from the ${source}`,
  });

  // ── Send ───────────────────────────────────────────────────────────────────
  const sent = await deliverQuote(db, quote, { actorId: null });
  if (!sent.ok) return json({ error: sent.error }, 502);

  return json({
    status: "sent",
    quote_number: quote.quote_number,
    monthly_repayment: quote.monthly_repayment,
    rate_pct: quote.rate_pct,
  });
});
