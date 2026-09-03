-- CHFPL Step 11.2 EMI Auto Generation
create table if not exists public.loan_disbursement_events (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid not null,
 amount numeric not null,
 disbursement_date date not null default current_date,
 created_by uuid,
 created_at timestamptz default now()
);

alter table public.emi_schedule
 add column if not exists principal_amount numeric,
 add column if not exists interest_amount numeric,
 add column if not exists opening_balance numeric,
 add column if not exists closing_balance numeric,
 add column if not exists paid_date date,
 add column if not exists days_overdue integer default 0;

create index if not exists idx_emi_due_status on public.emi_schedule(due_date,status);
