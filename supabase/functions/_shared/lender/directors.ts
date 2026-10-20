// Additional directors complete their own details and consent online (director_requests,
// edge function director-form). The application's directors JSON holds each one's
// requestToken; this joins their submitted details in before toCanonical().

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export async function withDirectorRequests(db: SupabaseClient, app: Row): Promise<Row> {
  const directors: Row[] = Array.isArray(app.directors) ? app.directors : app.directors?.directors || [];
  const tokens = directors.map((d) => d.requestToken).filter(Boolean);
  if (tokens.length === 0) return app;

  const { data } = await db.from("director_requests").select("token, status, details, consent_at, consent_text, director_email").in("token", tokens);
  const byToken = new Map((data ?? []).map((r: Row) => [r.token, r]));

  const merged = directors.map((d) => {
    const r = d.requestToken ? byToken.get(d.requestToken) : null;
    if (!r) return d;
    if (r.status !== "completed" || !r.details) return { ...d, directorRequestStatus: r.status };
    const x = r.details as Row;
    return {
      ...d,
      firstName: x.firstName || d.firstName,
      lastName: x.lastName || d.lastName,
      dateOfBirth: x.dateOfBirth || d.dateOfBirth,
      address: x.residentialAddress || d.address,
      addressMonths: x.addressMonths ?? d.addressMonths,
      phone: x.mobile || d.phone,
      email: d.email || r.director_email,
      licenceNumber: x.licenceNumber || d.licenceNumber,
      licenceState: x.licenceState || d.licenceState,
      licenceExpiry: x.licenceExpiry || d.licenceExpiry,
      creditDeclaration: x.creditDeclaration,
      creditDetails: x.creditDetails,
      privacyConsentAt: r.consent_at,
      privacyConsentText: r.consent_text,
      directorRequestStatus: "completed",
    };
  });
  return { ...app, directors: Array.isArray(app.directors) ? merged : { ...app.directors, directors: merged } };
}
