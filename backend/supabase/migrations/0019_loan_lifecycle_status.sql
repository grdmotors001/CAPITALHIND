-- CHFPL Step 4: Standard loan lifecycle workflow
-- Keeps status transitions consistent for NBFC operations.

alter table public.loan_applications
  add column if not exists lifecycle_status text not null default 'NEW';

alter table public.loan_applications drop constraint if exists loan_applications_lifecycle_status_check;
alter table public.loan_applications add constraint loan_applications_lifecycle_status_check
check (lifecycle_status in (
  'NEW',
  'DOCUMENT_PENDING',
  'FI_PENDING',
  'FI_COMPLETED',
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'CLOSED',
  'REJECTED'
));

create index if not exists loan_applications_lifecycle_status_idx
on public.loan_applications(lifecycle_status);

create table if not exists public.loan_status_history (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.users(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists loan_status_history_loan_idx
on public.loan_status_history(loan_application_id, created_at desc);

alter table public.loan_status_history enable row level security;
