-- AssetMX: background business check + Westpac submission fields.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Westpac's minimum documentation (all pathways incl. DriveXpress/Matrix) needs
-- business and director background, the reason for purchase, and privacy consent
-- from all individuals. The chat now collects these; this stores them.

-- 1. Business profiles researched from public sources after the applicant confirms
--    their ABN (edge function business-profile). Cached per ABN so a repeat
--    applicant doesn't trigger a second web search. Service role only: no policies.
create table if not exists public.business_profiles (
  abn          text primary key,
  entity_name  text,
  status       text not null default 'done',   -- done | not_found | failed
  profile      jsonb,                           -- summary, industry, website, key people, ...
  sources      jsonb,                           -- [{url, title}]
  model        text,
  created_at   timestamptz not null default now()
);
alter table public.business_profiles enable row level security;

-- 2. What the applicant confirmed, and the evidence the lender needs
alter table public.applications
  add column if not exists business_profile     jsonb,        -- profile shown + confirmed/corrections
  add column if not exists purchase_reason      text,         -- "what will the asset be used for"
  add column if not exists privacy_consent_at   timestamptz,  -- when they tapped "I agree"
  add column if not exists privacy_consent_text text;         -- the wording they agreed to
