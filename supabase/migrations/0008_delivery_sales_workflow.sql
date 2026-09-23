-- Loan -> Delivery -> Sale workflow
alter table public.loan_applications
  add column if not exists dealer_user_id uuid references public.dealer_users(id) on delete set null;

create table if not exists public.delivery_details (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null unique references public.loan_applications(id) on delete cascade,
  dealer_user_id uuid references public.dealer_users(id) on delete set null,
  status text not null default 'locked' check (status in ('locked','delivered','cancelled')),
  delivery_date date,
  vehicle_no text,
  chassis_no text,
  remarks text,
  locked_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_details_dealer_status_idx
  on public.delivery_details(dealer_user_id,status);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint unique references public.loan_applications(id) on delete restrict,
  delivery_id uuid references public.delivery_details(id) on delete set null,
  dealer_user_id uuid references public.dealer_users(id) on delete set null,
  created_by uuid,
  source text not null default 'staff' check (source in ('staff','dealer')),
  sale_status text not null default 'pending' check (sale_status in ('pending','completed','cancelled')),
  loan_used boolean not null default false,
  sale_date date not null default current_date,
  sale_amount numeric,
  customer_name text,
  customer_phone text,
  vehicle_model text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_dealer_status_idx on public.sales(dealer_user_id,sale_status);
create index if not exists sales_pending_idx on public.sales(sale_status) where sale_status='pending';

alter table public.delivery_details enable row level security;
alter table public.sales enable row level security;

-- Prevent an approved loan from being used twice, even under concurrent requests.
create unique index if not exists sales_active_loan_uq
  on public.sales(loan_application_id)
  where loan_application_id is not null and sale_status <> 'cancelled';
