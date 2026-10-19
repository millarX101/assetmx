-- AssetMX quotes v2: deposit, trade-in, finance type, both fee options.
-- Run once in the Supabase SQL Editor after quotes-crm.sql. Idempotent.
--
-- loan_amount now means "amount to finance before fees"
--   = asset_price - deposit_amount - trade_in_amount.
-- Quotes saved before this keep asset_price null; the app treats
-- asset_price null as asset_price = loan_amount with no deposit or trade-in.

alter table public.quotes
  add column if not exists asset_price           numeric,
  add column if not exists deposit_amount        numeric not null default 0,
  add column if not exists trade_in_amount       numeric not null default 0,
  add column if not exists finance_type          text not null default 'chattel_mortgage',
  add column if not exists prepared_by           text,     -- "Quoted by" on the sheet
  add column if not exists alt_monthly_repayment numeric,  -- the other AssetMX-fee option
  add column if not exists effective_rate_pct    numeric;  -- rate including the AssetMX fee when added to the loan

alter table public.quotes drop constraint if exists quotes_finance_type_check;
alter table public.quotes add constraint quotes_finance_type_check
  check (finance_type in ('chattel_mortgage', 'finance_lease', 'hire_purchase'));
