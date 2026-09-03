-- Step 6: KYC document security foundation

alter table if exists public.kyc_documents
  add column if not exists verification_status text default 'UPLOADED',
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text;

alter table if exists public.kyc_documents
  add constraint kyc_documents_verification_status_check
  check (verification_status in ('UPLOADED','VERIFIED','REJECTED'));

create index if not exists idx_kyc_documents_status
on public.kyc_documents(verification_status);

-- Keep storage private. Create bucket kyc-documents as private in Supabase dashboard.
