# Quotes: send-quote + quote-public

Admin builds a quote at `/admin/quotes/new` → **send-quote** emails it (Resend) →
customer opens `app.assetmx.com.au/q/<token>` → **quote-public** serves it, counts
views, records accept/decline and emails the team.

## One-time setup

1. Run `supabase/quotes-crm.sql` in the SQL Editor (after `schema.sql` and `flwup-sync.sql`).
2. Secrets (RESEND_API_KEY already exists for send-application-emails):

   ```sh
   supabase secrets set APP_URL=https://app.assetmx.com.au
   supabase secrets set QUOTE_FROM_EMAIL="AssetMX <quotes@assetmx.com.au>"   # must be on a Resend-verified domain
   supabase secrets set ADMIN_EMAIL=info@assetmx.com.au                     # bcc'd on every quote + gets accept/decline notices
   ```

3. Deploy:

   ```sh
   supabase functions deploy send-quote                   # JWT verified: admin session required
   supabase functions deploy quote-public --no-verify-jwt # public: the token is the credential
   ```

## Behaviour

- **send-quote** `POST { quote_id }` with the admin's session JWT. Rejects non-admins and
  `viewer` role. Reply-To is `QUOTE_REPLY_TO` (default info@assetmx.com.au, forwarded by Cloudflare Email Routing), so the thread stays on the AssetMX address.
  Draft → `sent`; a resend never resets `viewed`/`accepted`. Logs `quote_sent` on the lead and
  moves `new`/`contacted` leads to `quoted`.
- **quote-public** `GET ?token=` counts a view (`?preview=1` doesn't), logs the first
  open to the lead timeline. `POST { token, action: accept|decline, reason? }` is
  idempotent; accept is refused after `valid_until`. Accept moves the lead to `qualified`.
- Drafts are never served publicly.

## FLWUP

A quote for a new customer creates a `leads` row (`source = 'admin_quote'`), so the
existing flwup-sync trigger pushes it into FLWUP and its follow-up cadence starts.
Quotes sent to an existing lead aren't re-posted. FLWUP dedupes on
`external_lead_id` and has no update endpoint.
