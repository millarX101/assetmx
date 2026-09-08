// Supabase Edge Function: flwup-sync
//
// Posts every new AssetMX lead (and contact-page enquiry) into FLWUP, which
// then runs the follow-up cadence — instant touch, email/SMS, reply handling —
// with no human involved.
//
// HOW IT IS CALLED
//   1. A Postgres trigger (supabase/flwup-sync.sql) fires on INSERT to
//      public.leads and public.contact_submissions and POSTs the row here as
//      { type: "INSERT", table, record }.
//   2. Manually, to replay a lead the webhook missed (FLWUP down, secret
//      wrong, function not yet deployed): POST { "lead_id": "<uuid>" } or
//      { "contact_submission_id": "<uuid>" } with the same x-hook-secret.
//      FLWUP dedupes on external_lead_id, so a replay can never create a
//      second deal or a second first-email.
//
// WHY THIS EXISTS AS A HOP
//   AssetMX is a browser app writing straight into its own Supabase. The FLWUP
//   key cannot sit in a public JS bundle, so the table is hooked server-side
//   rather than the three forms that insert into it.
//
// WHAT IT WRITES BACK
//   flwup_deal_id / flwup_status / flwup_synced_at / flwup_error on the source
//   row, so the admin Leads page can show "in FLWUP" or "failed: bad_phone"
//   instead of nothing. Written via the service role; the INSERT-only trigger
//   does not refire on this UPDATE.

import { createClient } from "npm:@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const FLWUP_URL = Deno.env.get("FLWUP_URL") ?? "https://flwup-server.onrender.com/api/v1/leads";
const FLWUP_API_KEY = Deno.env.get("FLWUP_API_KEY");
const HOOK_SECRET = Deno.env.get("FLWUP_HOOK_SECRET");

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Table = "leads" | "contact_submissions";
type Row = Record<string, unknown>;

interface Outcome {
  status: "created" | "duplicate" | "skipped" | "error";
  deal_id?: string;
  code?: string;
  error?: string;
  http?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Trimmed string or null. The chat flow inserts '' for fields a bailed lead never gave. */
function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// Mapping: AssetMX row → FLWUP POST /v1/leads body
//
// FLWUP accepts the nested { customer } shape and a free-text `comments`. The
// comments are what the follow-up drafter has to work with, so every number we
// know goes in — a follow-up that says "your $120k at 6.89% over 60 months" is
// the whole point of feeding it a quote rather than a name.
// ─────────────────────────────────────────────────────────────────────────────

function mapLead(r: Row) {
  const amount = num(r.loan_amount);
  const term = num(r.term_months);
  const balloon = num(r.balloon_percentage);
  const rate = num(r.indicative_rate);
  const monthly = num(r.monthly_repayment);
  const saving = num(r.estimated_saving);
  const business = str(r.business_name);
  const abn = str(r.abn);
  const condition = str(r.asset_condition);

  const lines = [
    "Context: business asset finance enquiry via the AssetMX website. Not a vehicle sale — there is no showroom, stock or test drive.",
    business && `Business: ${business}${abn ? ` (ABN ${abn})` : ""}`,
    !business && abn && `ABN: ${abn}`,
    str(r.lead_type) && `Enquiry type: ${str(r.lead_type)}`,
    str(r.asset_type) && `Asset: ${str(r.asset_type)}${condition ? `, ${condition.replace(/_/g, " ")}` : ""}`,
    amount && `Amount: ${aud(amount)}`,
    term && `Term: ${term} months${balloon ? `, ${balloon}% balloon` : ""}`,
    rate && `Indicative rate quoted: ${pct(rate)} (lender base rate, $800 flat AssetMX fee, no commission)`,
    monthly && `Indicative repayment: ${aud(monthly)}/month`,
    saving && `Estimated saving vs typical broker: ${aud(saving)}`,
    str(r.reason) && `Reason: ${str(r.reason)}`,
    str(r.notes),
  ].filter(Boolean);

  return {
    external_lead_id: String(r.id),
    received_at: str(r.created_at),
    source: "website",
    source_detail: str(r.source) ?? "assetmx_quote",
    lead_type: "internet",
    customer: {
      full_name: str(r.name) ?? business,
      email: str(r.email),
      phone: str(r.phone),
    },
    comments: lines.join("\n"),
  };
}

function mapContactSubmission(r: Row) {
  const lines = [
    "Context: general enquiry via the AssetMX contact page (business asset finance). Not a vehicle sale.",
    str(r.subject) && `Subject: ${str(r.subject)}`,
    str(r.message) && `Message:\n${str(r.message)}`,
    str(r.notes),
  ].filter(Boolean);

  return {
    external_lead_id: `contact_${String(r.id)}`,
    received_at: str(r.created_at),
    source: "website",
    source_detail: "assetmx_contact",
    lead_type: "internet",
    customer: {
      full_name: str(r.name),
      email: str(r.email),
      phone: str(r.phone),
    },
    comments: lines.join("\n"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The sync
// ─────────────────────────────────────────────────────────────────────────────

async function postToFlwup(body: unknown): Promise<Outcome> {
  const res = await fetch(FLWUP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${FLWUP_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error body — the raw text goes into `error` below
  }

  if (res.status === 201) return { status: "created", deal_id: String(json.deal_id), http: 201 };
  if (res.status === 200) return { status: "duplicate", deal_id: String(json.deal_id), http: 200 };
  return {
    status: "error",
    http: res.status,
    code: typeof json.code === "string" ? json.code : `http_${res.status}`,
    error: typeof json.error === "string" ? json.error : text.slice(0, 500),
  };
}

async function writeBack(table: Table, id: string, o: Outcome): Promise<void> {
  const failed = o.status === "error" || o.status === "skipped";
  const { error } = await admin
    .from(table)
    .update({
      flwup_deal_id: o.deal_id ?? null,
      flwup_status: o.status,
      flwup_synced_at: new Date().toISOString(),
      flwup_error: failed ? `${o.code ?? ""}${o.error ? `: ${o.error}` : ""}`.trim() : null,
    })
    .eq("id", id);
  if (error) console.error(`flwup-sync: write-back failed for ${table}/${id}:`, error.message);
}

async function syncRow(table: Table, record: Row): Promise<Outcome> {
  const id = String(record.id);
  const body = table === "leads" ? mapLead(record) : mapContactSubmission(record);

  // No way to reach them → FLWUP would 422 with no_contact_method. Say so
  // locally and skip the round trip; the row is still recorded as skipped so
  // the admin can see the lead existed and why nothing happened.
  if (!body.customer.email && !body.customer.phone) {
    const o: Outcome = { status: "skipped", code: "no_contact_method", error: "no email or phone on the row" };
    await writeBack(table, id, o);
    return o;
  }

  let outcome: Outcome;
  try {
    outcome = await postToFlwup(body);
  } catch (err) {
    outcome = { status: "error", code: "network", error: err instanceof Error ? err.message : String(err) };
  }

  console.log(
    `flwup-sync ${table}/${id} → ${outcome.status}` +
      (outcome.deal_id ? ` deal ${outcome.deal_id}` : "") +
      (outcome.code ? ` ${outcome.code}` : ""),
  );
  await writeBack(table, id, outcome);
  return outcome;
}

async function fetchRow(table: Table, id: string): Promise<Row | null> {
  const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row | null) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────────────────────────────────────────

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  if (!HOOK_SECRET || req.headers.get("x-hook-secret") !== HOOK_SECRET) {
    return json(403, { error: "forbidden" });
  }
  if (!FLWUP_API_KEY) {
    console.error("flwup-sync: FLWUP_API_KEY is not set");
    return json(500, { error: "FLWUP_API_KEY not configured" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "body must be JSON" });
  }

  // Manual replay. Awaited, so the caller sees FLWUP's answer directly.
  const leadId = str(payload.lead_id);
  const contactId = str(payload.contact_submission_id);
  if (leadId || contactId) {
    const table: Table = leadId ? "leads" : "contact_submissions";
    const id = (leadId ?? contactId) as string;
    try {
      const row = await fetchRow(table, id);
      if (!row) return json(404, { error: `${table}/${id} not found` });
      return json(200, await syncRow(table, row));
    } catch (err) {
      return json(500, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Database webhook. pg_net gives the call a few seconds before it gives up,
  // and FLWUP on Render can take longer than that to wake. So acknowledge
  // immediately and do the work after the response — the Supabase runtime
  // keeps the function alive for a waitUntil'd promise.
  const type = str(payload.type);
  const table = str(payload.table);
  const record = payload.record;
  if (
    type !== "INSERT" ||
    (table !== "leads" && table !== "contact_submissions") ||
    !record ||
    typeof record !== "object"
  ) {
    return json(200, { ignored: true, type, table });
  }

  const work = syncRow(table as Table, record as Row).catch((err) =>
    console.error("flwup-sync: unhandled", err),
  );

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
    return json(202, { accepted: true, table, id: (record as Row).id });
  }
  // Local `supabase functions serve` has no waitUntil — run inline.
  return json(200, await work);
});
