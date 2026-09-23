-- Hardening for FE cash receipts and Repo register.
-- Safe to run after 0008/0009/0015; all objects/columns are IF NOT EXISTS.

create table if not exists public.loan_receipts (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  receipt_no text not null unique,
  receipt_date date not null default current_date,
  amount numeric not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash','upi','bank','cheque','other')),
  reference_no text,
  remarks text,
  entered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.loan_receipts add column if not exists collection_source text not null default 'manual';
alter table public.loan_receipts add column if not exists collected_at timestamptz;

create index if not exists loan_receipts_entered_by_idx on public.loan_receipts(entered_by, created_at desc);
create index if not exists loan_receipts_collection_source_idx on public.loan_receipts(collection_source, created_at desc);
create index if not exists vehicle_repossessions_repo_date_idx on public.vehicle_repossessions(repo_date desc, repo_time desc);

alter table public.loan_receipts enable row level security;
alter table public.vehicle_repossessions enable row level security;
