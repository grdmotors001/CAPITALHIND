-- Loan ledger extensions: NOC charges and loan-specific expenses.
-- These entries are printed in the loan ledger together with receipts.

create table if not exists public.expense_master (
  id bigserial primary key,
  expense_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_expenses (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  expense_master_id bigint not null references public.expense_master(id) on delete restrict,
  expense_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  remarks text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_charges (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  charge_type text not null default 'noc' check (charge_type in ('noc')),
  charge_name text not null default 'NOC Charges',
  charge_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  remarks text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loan_expenses_loan_idx on public.loan_expenses(loan_application_id, expense_date desc, created_at desc);
create index if not exists loan_expenses_master_idx on public.loan_expenses(expense_master_id);
create index if not exists loan_charges_loan_idx on public.loan_charges(loan_application_id, charge_date desc, created_at desc);

alter table public.expense_master enable row level security;
alter table public.loan_expenses enable row level security;
alter table public.loan_charges enable row level security;

-- Useful starter masters; duplicates are ignored.
insert into public.expense_master (expense_name) values
  ('Legal Charges'), ('Field Visit Expense'), ('Documentation Charges'), ('Parking / Yard Charges'), ('Other Expense')
on conflict (expense_name) do nothing;
