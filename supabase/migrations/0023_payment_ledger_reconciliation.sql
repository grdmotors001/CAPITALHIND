-- Step 9: Payment webhook reconciliation and loan ledger foundation

create table if not exists public.loan_ledger (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  customer_id uuid,
  transaction_date timestamptz default now(),
  particular text not null,
  amount numeric(12,2) not null,
  entry_type text not null check (entry_type in ('DEBIT','CREDIT')),
  reference_type text,
  reference_id text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_loan_ledger_loan_id on public.loan_ledger(loan_id);
create index if not exists idx_loan_ledger_date on public.loan_ledger(transaction_date);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  event_id text unique,
  transaction_id text,
  payload jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);
