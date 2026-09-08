-- =============================================================================
-- FLWUP sync — wires supabase/functions/flwup-sync to every new lead and
-- contact enquiry, so FLWUP picks up the follow-up with nobody retyping.
--
-- Apply with:
--   npx supabase db query --linked --project-ref <PROJECT_REF> -f <this file, placeholders filled>
-- or paste into the SQL editor. Replace first:
--   <PROJECT_REF>  — the AssetMX Supabase project ref (the bit before .supabase.co)
--   <HOOK_SECRET>  — the same value given to `supabase secrets set FLWUP_HOOK_SECRET=...`
--
-- WHY pg_net DIRECTLY rather than the dashboard's Database Webhooks. The
-- dashboard wraps pg_net in supabase_functions.http_request(), which only
-- exists once someone has clicked "Enable webhooks" — this project never had.
-- Calling net.http_post from our own trigger function needs nothing enabled by
-- hand, is versioned here, and the payload shape is explicit instead of implied.
--
-- Idempotent — safe to re-run.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columns the app already writes but schema.sql never declared.
--
-- Measured on prod 2026-09-08: name / source / reason / consent_to_share were
-- already there (added by hand at some point); lead_type was NOT, so every
-- NovatedLeaseModal insert has been failing with an undefined-column error the
-- UI only console.errors. Adding it is the fix.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists name              text,
  add column if not exists source            text,
  add column if not exists lead_type         text,
  add column if not exists reason            text,
  add column if not exists consent_to_share  boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FLWUP tracking. Written by the edge function via the service role.
--
-- flwup_status: created | duplicate | skipped | error. A null means the trigger
-- never reached the function — that is the row to replay by hand.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists flwup_deal_id   text,
  add column if not exists flwup_status    text,
  add column if not exists flwup_synced_at timestamptz,
  add column if not exists flwup_error     text;

alter table public.contact_submissions
  add column if not exists flwup_deal_id   text,
  add column if not exists flwup_status    text,
  add column if not exists flwup_synced_at timestamptz,
  add column if not exists flwup_error     text;

comment on column public.leads.flwup_deal_id is
  'FLWUP deal id returned by POST /api/v1/leads. Null until synced; FLWUP dedupes on our leads.id so a replay is safe.';
comment on column public.leads.flwup_status is
  'created | duplicate | skipped | error — outcome of the last flwup-sync attempt. Null = trigger never fired; replay it.';

-- The admin "what has not made it to FLWUP" query.
create index if not exists idx_leads_flwup_pending
  on public.leads (created_at desc)
  where flwup_status is null or flwup_status = 'error';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. pg_net — async HTTP from Postgres. The insert never waits on the call.
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      execute 'create extension pg_net with schema extensions';
    exception when others then
      execute 'create extension pg_net';
    end;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. The trigger function.
--
-- SECURITY DEFINER so the call runs with the owner's rights: the row is
-- inserted by the anon role from the browser, and anon has no business calling
-- net.* directly. search_path is pinned for the same reason.
--
-- Same payload shape as a dashboard webhook — { type, table, schema, record,
-- old_record } — so the edge function does not care which produced it.
--
-- A failure to enqueue must never fail the insert that caused it: a lead is
-- worth more than its notification, and flwup_status stays null so it is
-- visible in admin and replayable.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.flwup_sync_notify()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  perform net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/flwup-sync',
    body    := jsonb_build_object(
                 'type',       TG_OP,
                 'table',      TG_TABLE_NAME,
                 'schema',     TG_TABLE_SCHEMA,
                 'record',     to_jsonb(new),
                 'old_record', null),
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-hook-secret', '<HOOK_SECRET>'),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'flwup_sync_notify: % (row % left with flwup_status null)', sqlerrm, new.id;
  return new;
end
$$;

revoke all on function public.flwup_sync_notify() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Triggers. INSERT only: the function UPDATEs the same row with flwup_*
-- afterwards and an INSERT trigger does not refire on that, so no loop.
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists flwup_sync_on_lead_insert on public.leads;
create trigger flwup_sync_on_lead_insert
  after insert on public.leads
  for each row execute function public.flwup_sync_notify();

drop trigger if exists flwup_sync_on_contact_insert on public.contact_submissions;
create trigger flwup_sync_on_contact_insert
  after insert on public.contact_submissions
  for each row execute function public.flwup_sync_notify();

do $$ begin
  raise notice 'flwup-sync wired: leads + contact_submissions INSERT → functions/v1/flwup-sync via pg_net.';
end $$;
