-- AssetMX: additional directors complete their own details and privacy consent online.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- The chat creates a request when the applicant adds another director (edge function
-- director-form): the director gets a one-time link (the token is the credential) to
-- /director/<token>. The application's directors JSON carries the token, so the pack
-- and lender exports join these details back by token.

create table if not exists public.director_requests (
  id                    uuid primary key default gen_random_uuid(),
  token                 text not null unique,
  director_email        text not null,
  business_name         text,
  primary_contact_name  text,
  primary_contact_email text,
  status                text not null default 'pending',   -- pending | completed
  details               jsonb,                              -- name, DOB, address, licence, credit declaration
  consent_at            timestamptz,
  consent_text          text,
  created_at            timestamptz not null default now(),
  completed_at          timestamptz
);

create index if not exists idx_director_requests_email on public.director_requests (director_email, created_at desc);

alter table public.director_requests enable row level security;

-- Admins read them (the pack joins them in); everything else goes through the edge function
drop policy if exists "Admins can view director requests" on public.director_requests;
create policy "Admins can view director requests" on public.director_requests
  for select
  using (auth.uid() in (select id from public.admin_users));
