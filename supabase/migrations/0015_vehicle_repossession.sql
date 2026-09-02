-- Vehicle Repo / Repossession process.
-- A Repo is recorded by the assigned Field Executive and moves the loan case
-- to vehicle_seized. Battery name is controlled by an admin master.

create table if not exists public.battery_master (
  id bigserial primary key,
  battery_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_repossessions (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null unique references public.loan_applications(id) on delete restrict,
  repo_date date not null,
  repo_time time not null,
  seized_by_fe_id uuid not null references public.users(id) on delete restrict,
  vehicle_no text not null,
  battery_available boolean not null default false,
  battery_no text,
  battery_master_id bigint references public.battery_master(id) on delete restrict,
  rc_available boolean not null default false,
  charger_available boolean not null default false,
  parked_dealer_id bigint not null references public.dealer_master(id) on delete restrict,
  remarks text,
  created_at timestamptz not null default now(),
  constraint vehicle_repossessions_battery_check check (
    (battery_available = false and battery_no is null and battery_master_id is null)
    or
    (battery_available = true and battery_no is not null and battery_master_id is not null)
  )
);

create index if not exists vehicle_repossessions_fe_idx on public.vehicle_repossessions(seized_by_fe_id, created_at desc);
create index if not exists vehicle_repossessions_dealer_idx on public.vehicle_repossessions(parked_dealer_id, created_at desc);
create index if not exists vehicle_repossessions_loan_idx on public.vehicle_repossessions(loan_application_id);

alter table public.battery_master enable row level security;
alter table public.vehicle_repossessions enable row level security;

