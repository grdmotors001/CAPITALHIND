-- Tele Caller NBFC CRM: PTP tracking and indexes.
create table if not exists public.telecaller_ptp (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  telecaller_id uuid not null references public.users(id) on delete cascade,
  promised_date date not null,
  promised_amount numeric(12,2) not null check (promised_amount > 0),
  status text not null default 'open' check (status in ('open','kept','broken','cancelled')),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists telecaller_ptp_user_date_idx on public.telecaller_ptp(telecaller_id,promised_date,status);
create index if not exists telecaller_ptp_loan_idx on public.telecaller_ptp(loan_application_id,created_at desc);
alter table public.telecaller_ptp enable row level security;
