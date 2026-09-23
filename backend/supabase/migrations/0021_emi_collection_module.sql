-- CHFPL Step 7: EMI and Collection foundation

create table if not exists public.emi_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  emi_no integer not null,
  due_date date not null,
  emi_amount numeric(12,2) not null default 0,
  principal_amount numeric(12,2) default 0,
  interest_amount numeric(12,2) default 0,
  paid_amount numeric(12,2) default 0,
  status text not null default 'PENDING',
  paid_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  customer_id uuid,
  amount numeric(12,2) not null,
  payment_mode text not null default 'CASH',
  receipt_no text,
  collected_by uuid,
  remarks text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_emi_schedule_loan on public.emi_schedule(loan_id);
create index if not exists idx_emi_schedule_status on public.emi_schedule(status);
create index if not exists idx_collection_loan on public.collection_entries(loan_id);

alter table public.emi_schedule enable row level security;
alter table public.collection_entries enable row level security;
