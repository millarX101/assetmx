# flwup-sync — AssetMX leads → FLWUP

Every row inserted into `leads` or `contact_submissions` is posted to FLWUP's
lead feed (`POST /api/v1/leads`). FLWUP assigns it, sends the first touch and
runs the cadence. Nothing on the FLWUP side changes for this — it is the same
door an OEM feed uses, documented in `dealflow/docs/integration-api.md`.

## One-time setup

### 1. FLWUP: a rooftop with a rep

The ingested lead is assigned to the least-loaded rep at the rooftop, and
tenancy comes from that rep's profile. A rooftop with no users rejects every
lead with `no_reps`. Before the feed goes live, set that rooftop's brand voice,
signature and cadence — step 3 starts sending the moment a lead lands.

### 2. FLWUP: mint a dealership-scoped key

There is no screen for this; it is a super-admin endpoint. Log in to
flwup.com.au as a super-admin, open DevTools → Network, click any `/api/`
request and copy the `Authorization: Bearer …` value (that is your Supabase
session token). Then:

```bash
curl -X POST https://flwup.com.au/api/admin/api-keys \
  -H "Authorization: Bearer <your-session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"AssetMX website","dealership_id":"<rooftop uuid>","scopes":["leads:write"]}'
```

The response carries `api_key` **once**. FLWUP stores only a hash; if it is
lost, revoke (`DELETE /api/admin/api-keys/:id`) and reissue.

Prove it — this must list exactly that rooftop:

```bash
curl https://flwup-server.onrender.com/api/v1/ping \
  -H "Authorization: Bearer flwup_live_..."
```

### 3. AssetMX: deploy the function

```bash
cd C:/DEV/assetmx
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>

npx supabase@latest secrets set \
  FLWUP_API_KEY=flwup_live_... \
  FLWUP_HOOK_SECRET=<long random string>

npx supabase@latest functions deploy flwup-sync --no-verify-jwt
```

`--no-verify-jwt` because the caller is Postgres, not a logged-in user; the
`x-hook-secret` header is the authentication instead.

### 4. AssetMX: wire the triggers

Open `supabase/flwup-sync.sql`, replace `<PROJECT_REF>` and `<HOOK_SECRET>`,
then either paste into the SQL editor or run it from the CLI (Management API,
no DB password needed):

```bash
npx supabase@latest db query --linked --project-ref <PROJECT_REF> -f flwup-sync.filled.sql
```

It is idempotent. It installs `pg_net`, creates the `flwup_sync_notify()`
trigger function, adds the `flwup_*` tracking columns, and adds the `name` /
`source` / `lead_type` / `reason` / `consent_to_share` columns the app already
writes but `schema.sql` never declared. Don't commit the filled copy — it
carries the hook secret.

### 5. Test with a personal address

Your own email is on FLWUP's internal-senders list, so a test under a millarX
or assetmx address is filed as staff mail, not a customer. Submit the quote
form with a personal Gmail and an AU mobile, then:

```sql
select id, created_at, email, flwup_status, flwup_deal_id, flwup_error
from leads order by created_at desc limit 5;
```

`created` → it is on the FLWUP Today board and the first email is on its way.
Read that first email before switching on real traffic: the cadence drafter is
car-shaped and, with no vehicle on the lead, writes generic follow-ups. The
`Context:` line in the comments tells it this is asset finance, not a car sale.

## Day to day

| `flwup_status` | Meaning |
|---|---|
| `created` | New deal in FLWUP, `flwup_deal_id` set |
| `duplicate` | That email/phone already has an open deal at the rooftop — joined it |
| `skipped` | Row has neither email nor phone (a chat lead who bailed early). Nothing to do |
| `error` | FLWUP refused it — `flwup_error` has the code (`bad_phone` = non-AU number, `no_reps`, …) |
| `null` | The webhook never reached the function. Replay it |

### Replay a missed lead

A Supabase database webhook fires once and does not retry. If FLWUP was down
when the lead landed, or the function was not yet deployed, replay by hand.
FLWUP dedupes on `external_lead_id` (= our `leads.id`), so this is always safe:

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/flwup-sync \
  -H "x-hook-secret: <HOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"<uuid>"}'
```

(or `{"contact_submission_id":"<uuid>"}`). The response is FLWUP's answer.

Find everything that needs replaying:

```sql
select id, created_at, email, phone, flwup_error
from leads
where flwup_status is null or flwup_status = 'error'
order by created_at desc;
```

## Gotchas

- Phones are normalised as Australian. A non-AU number is rejected `bad_phone`.
- A lead with an email but no phone is worked by email; phone-only is worked by
  SMS (FLWUP picks the channel the lead can actually receive).
- Contact-page enquiries carry `external_lead_id = contact_<id>` so they can
  never collide with a quote lead's id.
