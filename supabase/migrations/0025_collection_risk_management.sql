-- CHFPL Step 11.5 - Collection & Risk Management
-- (Numbered 0025 to fill the gap left between 0024_emi_auto_generation.sql
--  and 0026_telecaller_collection_crm.sql.)
--
-- Adds:
--  1. Fix for emi_schedule / collection_entries / loan_disbursement_events
--     .loan_id (was uuid, loan_applications.id is bigint)
--  2. Penal interest + bounce charge tracking on emi_schedule
--  3. risk_config — single-row configurable rates & NPA ageing thresholds
--  4. loan_dpd / loan_npa_status views — days-past-due + IRAC-style ageing bucket per loan
--  5. loan_restructure_requests — restructure / part-payment / foreclosure workflow

-- 1. Fix loan_id column type. Safety guard: abort if any of the three tables
--    already has rows, so we never silently null out real collection data.
do $$
begin
  if exists (select 1 from public.emi_schedule limit 1) then
    raise exception 'emi_schedule has existing rows — review this migration manually before altering loan_id type.';
  end if;
  if exists (select 1 from public.collection_entries limit 1) then
    raise exception 'collection_entries has existing rows — review this migration manually before altering loan_id type.';
  end if;
  if exists (select 1 from public.loan_disbursement_events limit 1) then
    raise exception 'loan_disbursement_events has existing rows — review this migration manually before altering loan_id type.';
  end if;
end $$;

alter table public.emi_schedule
  alter column loan_id type bigint using null;
alter table public.emi_schedule
  add constraint emi_schedule_loan_fk foreign key (loan_id) references public.loan_applications(id) on delete cascade;

alter table public.collection_entries
  alter column loan_id type bigint using null;
alter table public.collection_entries
  add constraint collection_entries_loan_fk foreign key (loan_id) references public.loan_applications(id) on delete cascade;

alter table public.loan_disbursement_events
  alter column loan_id type bigint using null;
alter table public.loan_disbursement_events
  add constraint loan_disbursement_events_loan_fk foreign key (loan_id) references public.loan_applications(id) on delete cascade;

-- 2. Penal interest + bounce charge tracking (days_overdue already added by 0024)
alter table public.emi_schedule
  add column if not exists penal_interest_amount numeric(12,2) not null default 0,
  add column if not exists bounce_charge_amount numeric(12,2) not null default 0,
  add column if not exists is_bounced boolean not null default false,
  add column if not exists bounce_date date;

-- 3. Risk configuration (single row — editable by admin)
create table if not exists public.risk_config (
  id smallint primary key default 1,
  penal_interest_rate_per_day numeric(6,3) not null default 0.05, -- % per day on overdue EMI
  bounce_charge_flat numeric(10,2) not null default 500,
  sma1_start_days int not null default 1,
  sma2_start_days int not null default 31,
  npa_start_days int not null default 91,
  doubtful_start_days int not null default 181,
  loss_start_days int not null default 361,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint risk_config_single_row check (id = 1)
);
insert into public.risk_config (id) values (1) on conflict (id) do nothing;
alter table public.risk_config enable row level security;

-- 4. Days-past-due per loan (based on unpaid/partially paid EMIs)
create or replace view public.loan_dpd as
select
  loan_id,
  max(current_date - due_date) as days_past_due,
  sum(emi_amount - coalesce(paid_amount, 0)) as overdue_amount,
  count(*) as overdue_emi_count
from public.emi_schedule
where status <> 'PAID' and due_date < current_date
group by loan_id;

-- NPA / ageing bucket classification per loan, IRAC-style buckets
create or replace view public.loan_npa_status as
select
  la.id as loan_id,
  la.loan_account_no,
  la.application_no,
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  coalesce(d.days_past_due, 0) as days_past_due,
  coalesce(d.overdue_amount, 0) as overdue_amount,
  coalesce(d.overdue_emi_count, 0) as overdue_emi_count,
  case
    when coalesce(d.days_past_due, 0) < rc.sma2_start_days then 'STANDARD'
    when d.days_past_due < rc.npa_start_days then 'SMA'
    when d.days_past_due < rc.doubtful_start_days then 'SUB_STANDARD'
    when d.days_past_due < rc.loss_start_days then 'DOUBTFUL'
    else 'LOSS'
  end as npa_bucket
from public.loan_applications la
join public.customer_profiles cp on cp.id = la.customer_id
left join public.loan_dpd d on d.loan_id = la.id
cross join public.risk_config rc
where la.lifecycle_status in ('ACTIVE', 'DISBURSED');

-- 5. Restructure / part-payment / foreclosure requests
create table if not exists public.loan_restructure_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id bigint not null references public.loan_applications(id) on delete cascade,
  request_type text not null check (request_type in ('RESTRUCTURE', 'PART_PAYMENT', 'FORECLOSURE')),
  requested_amount numeric(14,2),
  new_tenure_months int,
  new_emi_amount numeric(12,2),
  reason text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists loan_restructure_requests_loan_idx on public.loan_restructure_requests(loan_id, created_at desc);
create index if not exists loan_restructure_requests_status_idx on public.loan_restructure_requests(status, created_at desc);

alter table public.loan_restructure_requests enable row level security;
