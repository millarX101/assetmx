-- AssetMX: record of every application export / submission to a lender.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Written by the lender-export edge function (service role). Exactly what was sent,
-- to whom, by which admin, and what the lender said back: the audit trail for
-- lender API integrations as they are added.

create table if not exists public.lender_submissions (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  lender          text not null,                 -- adapter id, e.g. 'canonical', 'westpac'
  action          text not null,                 -- 'export' | 'submit'
  schema_version  text,                          -- e.g. 'assetmx.application/v1'
  payload         jsonb not null,                -- exactly what was produced / sent
  status          text not null default 'ok',    -- ok | sent | error
  response        jsonb,                         -- the lender's reply, for 'submit'
  external_ref    text,                          -- the lender's application number, once known
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_lender_submissions_application
  on public.lender_submissions (application_id, created_at desc);

alter table public.lender_submissions enable row level security;

drop policy if exists "Admins can view lender submissions" on public.lender_submissions;
create policy "Admins can view lender submissions" on public.lender_submissions
  for select
  using (auth.uid() in (select id from public.admin_users));
