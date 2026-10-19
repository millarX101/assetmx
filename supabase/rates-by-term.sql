-- AssetMX: make the admin Rates page save.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- The Rates page saves one row per term (term_months) with an upsert on
-- term_months, but the table was built for per-asset rates:
--   1. no unique key on term_months  -> "no unique or exclusion constraint
--      matching the ON CONFLICT specification"
--   2. UNIQUE(asset_type, asset_condition) -> every term row is 'all'/'all',
--      so the second term would clash with the first
--   3. only 'editor'/'admin' roles could write; 'super_admin' was locked out
--
-- The old per-asset rows (term_months null) are left alone. Nothing reads
-- them: the calculators and quote engine only use rows with a term_months.

-- 1. One row per term (NULLs stay distinct, so the old rows are unaffected).
-- Must NOT be partial: an earlier "... WHERE term_months IS NOT NULL" index of
-- the same name can't back ON CONFLICT (term_months), so it is replaced.
drop index if exists public.rate_config_term_months_key;
create unique index rate_config_term_months_key
  on public.rate_config (term_months);

-- 2. Drop the per-asset unique constraint, whatever Postgres named it
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.rate_config'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(asset_type, asset_condition)%'
  loop
    execute format('alter table public.rate_config drop constraint %I', c);
  end loop;
end $$;

-- 3. Any admin except a read-only viewer can manage rates and fees
drop policy if exists "Admins can manage rates" on public.rate_config;
create policy "Admins can manage rates" on public.rate_config
  for all
  using (auth.uid() in (select id from public.admin_users where role <> 'viewer'))
  with check (auth.uid() in (select id from public.admin_users where role <> 'viewer'));

drop policy if exists "Admins can manage fees" on public.fee_config;
create policy "Admins can manage fees" on public.fee_config
  for all
  using (auth.uid() in (select id from public.admin_users where role <> 'viewer'))
  with check (auth.uid() in (select id from public.admin_users where role <> 'viewer'));
