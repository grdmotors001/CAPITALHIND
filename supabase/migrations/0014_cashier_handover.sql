-- Cashier role, staff profile fields, and FE-to-cashier cash handover ledger.
alter table public.staff_accounts drop constraint if exists staff_accounts_role_check;
alter table public.staff_accounts add constraint staff_accounts_role_check check (role in ('staff','cashier'));
alter table public.staff_accounts add column if not exists dob date;
alter table public.staff_accounts add column if not exists father_name text;
alter table public.staff_accounts add column if not exists address text;
alter table public.staff_accounts add column if not exists profile_photo text;

create table if not exists public.cash_handovers (
  id uuid primary key default gen_random_uuid(),
  handover_no text not null unique,
  fe_user_id uuid not null references public.users(id) on delete restrict,
  cashier_staff_id uuid not null references public.staff_accounts(id) on delete restrict,
  amount numeric not null check (amount > 0),
  handover_date date not null default current_date,
  remarks text,
  created_at timestamptz not null default now()
);
create index if not exists cash_handovers_fe_idx on public.cash_handovers(fe_user_id, created_at desc);
create index if not exists cash_handovers_cashier_idx on public.cash_handovers(cashier_staff_id, created_at desc);
alter table public.cash_handovers enable row level security;
