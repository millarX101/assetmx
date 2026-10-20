-- AssetMX: private bucket for lenders' blank application forms (filled server-side).
-- Run once in the Supabase SQL Editor. Idempotent. No storage policies: only the
-- service role (edge functions) can read it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lender-forms', 'lender-forms', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
