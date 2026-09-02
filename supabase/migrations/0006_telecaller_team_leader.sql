-- Tele Caller / Team Leader workflow
-- A physical register (ledger) is identified by its serial number.
-- New loan applications store the physical register serial. Team Leaders
-- assign those registers to Tele Callers for calling.

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('field_executive','tele_caller','customer','admin','do','team_leader'));

create index if not exists users_team_leader_role_idx on public.users(role) where role = 'team_leader';
create index if not exists users_tele_caller_role_idx on public.users(role) where role = 'tele_caller';

alter table public.loan_applications
  add column if not exists physical_register_serial_no text;

create index if not exists loan_applications_register_serial_idx
  on public.loan_applications(physical_register_serial_no)
  where physical_register_serial_no is not null;

create table if not exists public.telecaller_registers (
  id uuid primary key default gen_random_uuid(),
  register_serial_no text not null unique,
  assigned_telecaller_id uuid references public.users(id) on delete set null,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telecaller_registers_telecaller_idx
  on public.telecaller_registers(assigned_telecaller_id);

create table if not exists public.telecaller_call_logs (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  telecaller_id uuid not null references public.users(id) on delete cascade,
  outcome text not null check (outcome in ('connected','not_connected','callback','interested','not_interested','wrong_number','promise_to_pay','paid','do_not_call')),
  notes text,
  callback_at timestamptz,
  called_at timestamptz not null default now()
);

create index if not exists telecaller_call_logs_loan_idx on public.telecaller_call_logs(loan_application_id);
create index if not exists telecaller_call_logs_user_idx on public.telecaller_call_logs(telecaller_id, called_at desc);

alter table public.telecaller_registers enable row level security;
alter table public.telecaller_call_logs enable row level security;
