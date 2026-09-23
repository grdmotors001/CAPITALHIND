-- Business workflow: CIBIL gate, approval validity, loan-entry fields,
-- case tracking, manual receipts and payment/incentive vouchers.

alter table public.loan_applications
  add column if not exists cibil_score integer,
  add column if not exists cibil_checked_at timestamptz,
  add column if not exists approval_valid_until date,
  add column if not exists approved_at timestamptz,
  add column if not exists vehicle_no text,
  add column if not exists chassis_no text,
  add column if not exists ledger_no text,
  add column if not exists file_no text,
  add column if not exists cheques_qty integer not null default 0,
  add column if not exists file_record_no text,
  add column if not exists case_status text not null default 'active',
  add column if not exists suit_filed_at timestamptz,
  add column if not exists vehicle_seized_at timestamptz,
  add column if not exists disbursement_date date,
  add column if not exists disbursed_amount numeric,
  add column if not exists receipt_entry_manual boolean not null default false;

alter table public.loan_applications drop constraint if exists loan_applications_case_status_check;
alter table public.loan_applications add constraint loan_applications_case_status_check
  check (case_status in ('active','suit_filed','vehicle_seized','closed','written_off'));

create index if not exists loan_applications_cibil_idx on public.loan_applications(cibil_score);
create index if not exists loan_applications_approval_validity_idx on public.loan_applications(approval_valid_until);
create index if not exists loan_applications_case_status_idx on public.loan_applications(case_status);
create index if not exists loan_applications_seized_idx on public.loan_applications(vehicle_seized_at) where vehicle_seized_at is not null;

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
create index if not exists loan_receipts_loan_idx on public.loan_receipts(loan_application_id, receipt_date desc);

create table if not exists public.loan_payment_vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_no text not null unique,
  loan_application_id bigint references public.loan_applications(id) on delete set null,
  recipient_user_id uuid references public.users(id) on delete set null,
  recipient_name text,
  recipient_role text,
  voucher_type text not null default 'incentive' check (voucher_type in ('incentive','field_visit','telecalling','collection','expense','other')),
  amount numeric not null check (amount > 0),
  voucher_date date not null default current_date,
  narration text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loan_payment_vouchers_loan_idx on public.loan_payment_vouchers(loan_application_id, voucher_date desc);
create index if not exists loan_payment_vouchers_recipient_idx on public.loan_payment_vouchers(recipient_user_id, voucher_date desc);

alter table public.loan_receipts enable row level security;
alter table public.loan_payment_vouchers enable row level security;
