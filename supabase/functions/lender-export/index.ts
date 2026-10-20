// Lender export / submission API. Admin only.
//
//   POST { action: "lenders" }                                   -> available adapters
//   POST { action: "export", application_id, lender }            -> the lender's payload
//   POST { action: "submit", application_id, lender }            -> sends it via the adapter's API
//
// Every export and submission is recorded in lender_submissions (who, when, lender,
// exact payload, the lender's response). Adapters live in _shared/lender/adapters.ts.

import { corsHeaders, json, serviceClient } from "../_shared/quote.ts";
import { SCHEMA_VERSION, toCanonical } from "../_shared/lender/canonical.ts";
import { ADAPTERS, listAdapters } from "../_shared/lender/adapters.ts";

const db = serviceClient();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Who is calling ─────────────────────────────────────────────────────────
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not signed in" }, 401);
  const { data: auth, error: authError } = await db.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: "Not signed in" }, 401);
  const { data: adminUser } = await db.from("admin_users").select("id, role").eq("id", auth.user.id).maybeSingle();
  if (!adminUser) return json({ error: "Admin access required" }, 403);

  let body: { action?: string; application_id?: string; lender?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action || "export";
  if (action === "lenders") return json({ schema: SCHEMA_VERSION, lenders: listAdapters() });
  if (action !== "export" && action !== "submit") return json({ error: "action must be lenders, export or submit" }, 400);

  const adapter = ADAPTERS[body.lender || "canonical"];
  if (!adapter) return json({ error: `Unknown lender. Available: ${Object.keys(ADAPTERS).join(", ")}` }, 400);
  if (!body.application_id) return json({ error: "application_id is required" }, 400);

  const { data: app, error: appError } = await db.from("applications").select("*").eq("id", body.application_id).maybeSingle();
  if (appError || !app) return json({ error: "Application not found" }, 404);

  const payload = adapter.map(toCanonical(app));
  const record = {
    application_id: app.id,
    lender: adapter.id,
    schema_version: SCHEMA_VERSION,
    payload,
    created_by: auth.user.id,
  };

  if (action === "export") {
    await db.from("lender_submissions").insert({ ...record, action: "export", status: "ok" });
    return json({ lender: adapter.id, schema: SCHEMA_VERSION, payload });
  }

  // submit
  if (!adapter.submit) return json({ error: `${adapter.name} has no API connection yet. Use export.` }, 400);
  if (adminUser.role === "viewer") return json({ error: "Viewers cannot submit to lenders" }, 403);
  try {
    const result = await adapter.submit(payload);
    await db.from("lender_submissions").insert({
      ...record, action: "submit", status: result.ok ? "sent" : "error", response: result.response, external_ref: result.externalRef ?? null,
    });
    return json({ lender: adapter.id, ok: result.ok, externalRef: result.externalRef ?? null, response: result.response }, result.ok ? 200 : 502);
  } catch (e) {
    const message = (e as Error).message;
    await db.from("lender_submissions").insert({ ...record, action: "submit", status: "error", response: { error: message } });
    return json({ error: `Submission failed: ${message}` }, 502);
  }
});
