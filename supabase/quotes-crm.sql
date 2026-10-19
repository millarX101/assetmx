-- AssetMX quotes + lead workspace
--
-- Run once in the Supabase SQL Editor, after schema.sql and flwup-sync.sql.
-- Idempotent: safe to re-run.
--
-- WHAT THIS ADDS
--   quotes            A sent/sendable quote: the calculator inputs, a frozen
--                     snapshot of its outputs (so a later rate change never
--                     rewrites what the customer was shown), and a public token
--                     for the customer's /q/<token> page.
--   lead_activities   The lead timeline: notes, calls, emails, status changes,
--                     and quote events (sent / viewed / accepted / declined).
--   leads.*           Follow-up fields so the Leads page can show "due today".
--
-- ACCESS
--   Admin-only RLS on both tables. Customers never query these tables: the
--   quote-public edge function reads by token with the service role and returns
--   only customer-safe fields. No anon policy exists on purpose.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- leads: follow-up fields
-- status now also uses 'quoted' (new → contacted → quoted → qualified →
-- converted | lost). status is plain text, so no enum change is needed.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists last_activity_at   timestamptz,
  add column if not exists next_follow_up_at  timestamptz,
  add column if not exists next_follow_up_note text,
  add column if not exists lost_reason        text;

create index if not exists idx_leads_next_follow_up
  on public.leads (next_follow_up_at)
  where next_follow_up_at is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- quotes
-- ─────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.quote_number_seq start 1001;

create table if not exists public.quotes (
  id              uuid primary key default gen_random_uuid(),
  quote_number    text not null unique default ('AMX-' || nextval('public.quote_number_seq')),
  lead_id         uuid references public.leads(id) on delete set null,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Customer (copied from the lead at creation, editable per quote)
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  business_name   text,
  abn             text,

  -- Calculator inputs
  asset_type         text not null,          -- vehicle | truck | equipment
  asset_condition    text not null,          -- new | demo | used_0_3 | used_4_7 | used_8_plus
  asset_description  text,                   -- "2025 Toyota HiLux SR5"
  loan_amount        numeric not null,
  term_months        integer not null,
  balloon_percentage numeric not null default 0,
  fee_financed       boolean not null default true,

  -- Frozen calculator outputs (QuoteOutput from src/lib/calculator.ts)
  rate_pct           numeric not null,
  monthly_repayment  numeric not null,
  weekly_repayment   numeric not null,
  fortnightly_repayment numeric not null,
  balloon_amount     numeric not null,
  amount_financed    numeric not null,
  total_repayments   numeric not null,
  total_interest     numeric not null,
  total_cost         numeric not null,
  platform_fee       numeric not null,
  establishment_fee  numeric not null,
  broker_rate_pct    numeric,
  broker_total_cost  numeric,
  estimated_saving   numeric,

  -- Presentation
  message            text,                   -- personal note shown on the quote
  valid_until        date not null default (current_date + 14),

  -- Lifecycle
  status          text not null default 'draft'
                  check (status in ('draft','sent','viewed','accepted','declined')),
  public_token    text not null unique default encode(gen_random_bytes(24), 'hex'),
  sent_at         timestamptz,
  sent_count      integer not null default 0,
  email_id        text,                      -- Resend message id of the last send
  first_viewed_at timestamptz,
  last_viewed_at  timestamptz,
  view_count      integer not null default 0,
  responded_at    timestamptz,
  decline_reason  text
);

create index if not exists idx_quotes_lead on public.quotes (lead_id);
create index if not exists idx_quotes_created on public.quotes (created_at desc);
create index if not exists idx_quotes_status on public.quotes (status);

alter table public.quotes enable row level security;

drop policy if exists "Admins can view quotes" on public.quotes;
create policy "Admins can view quotes" on public.quotes
  for select using (auth.uid() in (select id from public.admin_users));

drop policy if exists "Admins can insert quotes" on public.quotes;
create policy "Admins can insert quotes" on public.quotes
  for insert with check (auth.uid() in (select id from public.admin_users));

drop policy if exists "Admins can update quotes" on public.quotes;
create policy "Admins can update quotes" on public.quotes
  for update using (auth.uid() in (select id from public.admin_users));

drop policy if exists "Admins can delete draft quotes" on public.quotes;
create policy "Admins can delete draft quotes" on public.quotes
  for delete using (status = 'draft' and auth.uid() in (select id from public.admin_users));

-- ─────────────────────────────────────────────────────────────────────────────
-- lead_activities: the timeline
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  quote_id    uuid references public.quotes(id) on delete set null,
  type        text not null check (type in (
                'note','call','email','sms','meeting','status_change',
                'quote_created','quote_sent','quote_viewed','quote_accepted','quote_declined'
              )),
  outcome     text,          -- calls: no_answer | left_voicemail | spoke | booked_meeting
  body        text,
  created_by  uuid references auth.users(id),   -- null = system / customer
  created_at  timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead
  on public.lead_activities (lead_id, created_at desc);

alter table public.lead_activities enable row level security;

drop policy if exists "Admins can view lead activities" on public.lead_activities;
create policy "Admins can view lead activities" on public.lead_activities
  for select using (auth.uid() in (select id from public.admin_users));

drop policy if exists "Admins can insert lead activities" on public.lead_activities;
create policy "Admins can insert lead activities" on public.lead_activities
  for insert with check (auth.uid() in (select id from public.admin_users));

drop policy if exists "Admins can delete own notes" on public.lead_activities;
create policy "Admins can delete own notes" on public.lead_activities
  for delete using (type = 'note' and created_by = auth.uid());

-- Keep leads.last_activity_at current so the list can sort by "gone quiet".
create or replace function public.lead_activity_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.leads set last_activity_at = new.created_at where id = new.lead_id;
  return new;
end $$;

drop trigger if exists lead_activities_touch on public.lead_activities;
create trigger lead_activities_touch
  after insert on public.lead_activities
  for each row execute function public.lead_activity_touch();

create or replace function public.quotes_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.quotes_set_updated_at();
