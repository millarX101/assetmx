-- AssetMX: lender policy checks (Westpac DriveXpress / Metro streamlined).
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Read from the dealer invoice: accessories (DriveXpress caps them at 10% of the
-- invoice) and the identifiers Metro needs (assets must be serial numbered).
-- The policy answers themselves (lender route, exposure, goods fit, ...) live in
-- applications.eligibility_checks.

alter table public.applications
  add column if not exists accessories_amount   numeric,
  add column if not exists asset_vin            text,
  add column if not exists asset_serial_number  text,
  add column if not exists asset_engine_number  text,
  add column if not exists asset_registration   text;
