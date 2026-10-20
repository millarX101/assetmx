# lender-export

Turns an application into a lender's format and (once a lender offers an API) sends it.
Admin only: the caller's Supabase session JWT must belong to a row in `admin_users`.

## Calls

All `POST` with `Authorization: Bearer <admin session JWT>`:

| Body | Returns |
|---|---|
| `{ "action": "lenders" }` | `{ schema, lenders: [{ id, name, description, canSubmit }] }` |
| `{ "action": "export", "application_id": "<uuid>", "lender": "westpac" }` | `{ lender, schema, payload }` |
| `{ "action": "submit", "application_id": "<uuid>", "lender": "<id>" }` | `{ ok, externalRef, response }` (only for adapters with `submit`) |

Every export and submit is written to `lender_submissions` (`supabase/lender-submissions.sql`):
who, when, lender, schema version, the exact payload, and the lender's response.

## How it fits together

```
applications row ──toCanonical()──> AssetMX standard (assetmx.application/v1)
                                      │
                                      ├── adapters.canonical.map()  -> the standard itself (internal notes removed)
                                      ├── adapters.westpac.map()    -> Westpac minimum documentation layout
                                      └── adapters.<next>.map()     -> next lender's API payload  ── submit() ──> lender API
```

- `_shared/lender/canonical.ts`: the standard schema and the only code that reads the raw row.
  Bump `SCHEMA_VERSION` on a breaking change.
- `_shared/lender/adapters.ts`: one adapter per lender.

## Adding a lender API

1. In `adapters.ts`, write `{ id, name, description, map, submit }`.
   - `map(app)` builds the lender's payload from the standard application: field names, enums
     (e.g. their asset codes, entity types), date formats.
   - `submit(payload)` POSTs to the lender and returns `{ ok, externalRef, response }`.
     Read credentials from Supabase secrets (`Deno.env.get("LENDERNAME_API_KEY")`).
2. Add it to `ADAPTERS`.
3. Deploy: `npx supabase functions deploy lender-export --project-ref wumrxteaxlensfufueof`.

The admin "Export for lender" picker lists it automatically. A "Submit to lender" button can be
added to the admin page for adapters where `canSubmit` is true.

`lenderNotes` from the business check are internal: adapters must not send them to a lender.
