-- CHFPL Phase 10 - Dealer Loan Application Portal
-- Postgres schema for Supabase (converted from the original MySQL/PDO design)
-- Run this in Supabase SQL Editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (Field Executive / Tele Caller / Customer / Admin)
-- ============================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  password_hash text not null,
  role text not null check (role in ('field_executive','tele_caller','customer','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DEALER MASTER + DEALER USERS
-- ============================================================
create table if not exists dealer_master (
  id bigserial primary key,
  dealer_name text not null,
  dealer_code text unique,
  city text,
  state text,
  contact_phone text,
  contact_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists dealer_users (
  id bigserial primary key,
  dealer_id bigint not null references dealer_master(id) on delete cascade,
  full_name text not null,
  phone text unique not null,
  email text,
  password_hash text not null,
  role text not null default 'dealer' check (role in ('dealer','dealer_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- VEHICLE MASTER
-- ============================================================
create table if not exists vehicle_oem_master (
  id bigserial primary key,
  oem_name text not null,
  is_active boolean not null default true
);

create table if not exists vehicle_model_master (
  id bigserial primary key,
  oem_id bigint references vehicle_oem_master(id),
  model_name text not null unique,
  vehicle_type text not null check (vehicle_type in ('2W','3W','4W')),
  ex_showroom_price numeric(12,2) not null,
  battery_capacity text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists dealer_vehicle_mapping (
  id bigserial primary key,
  dealer_id bigint not null references dealer_master(id) on delete cascade,
  vehicle_model_id bigint not null references vehicle_model_master(id) on delete cascade,
  is_active boolean not null default true,
  unique (dealer_id, vehicle_model_id)
);

-- ============================================================
-- CUSTOMER + LOAN APPLICATION
-- ============================================================
create table if not exists customer_profiles (
  id bigserial primary key,
  full_name text not null,
  phone text not null,
  email text,
  dob date not null,
  gender text,
  address text not null,
  city text,
  state text,
  pincode text not null,
  pan text not null,
  aadhaar_masked text not null,
  occupation text,
  monthly_income numeric(12,2),
  created_by_dealer_id bigint references dealer_master(id),
  created_at timestamptz not null default now()
);

create table if not exists loan_applications (
  id bigserial primary key,
  application_no text unique not null,
  dealer_id bigint not null references dealer_master(id),
  dealer_user_id bigint not null references dealer_users(id),
  customer_id bigint not null references customer_profiles(id),
  vehicle_model_id bigint not null references vehicle_model_master(id),
  vehicle_price numeric(12,2) not null,
  down_payment numeric(12,2) not null,
  loan_amount_requested numeric(12,2) not null,
  tenure_months int not null,
  application_status text not null default 'draft'
    check (application_status in ('draft','submitted','fi_pending','fi_done','approved','rejected','sanctioned','disbursed')),
  loan_account_no text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists guarantor_details (
  id bigserial primary key,
  loan_application_id bigint not null references loan_applications(id) on delete cascade,
  full_name text not null,
  relation_with_customer text,
  phone text not null,
  address text,
  pan text,
  aadhaar_masked text
);

create table if not exists kyc_documents (
  id bigserial primary key,
  loan_application_id bigint not null references loan_applications(id) on delete cascade,
  customer_id bigint not null references customer_profiles(id),
  doc_type text not null check (doc_type in
    ('pan','aadhaar_front','aadhaar_back','photo','address_proof','income_proof','bank_statement','other')),
  file_path text not null,   -- Supabase Storage object path
  file_name text not null,
  uploaded_by bigint references dealer_users(id),
  created_at timestamptz not null default now()
);

create table if not exists application_status_history (
  id bigserial primary key,
  loan_application_id bigint not null references loan_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by bigint,
  changed_by_type text not null default 'dealer_user',
  remarks text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FI / SANCTION / INCENTIVE (placeholders for future phases)
-- ============================================================
create table if not exists fi_reports (
  id bigserial primary key,
  loan_application_id bigint not null references loan_applications(id) on delete cascade,
  visited_by text,
  visit_date date,
  remarks text,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists sanction_records (
  id bigserial primary key,
  loan_application_id bigint not null references loan_applications(id) on delete cascade,
  sanctioned_amount numeric(12,2),
  interest_rate numeric(5,2),
  sanctioned_by text,
  sanctioned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists dealer_incentives (
  id bigserial primary key,
  dealer_id bigint not null references dealer_master(id) on delete cascade,
  loan_application_id bigint references loan_applications(id),
  incentive_amount numeric(12,2),
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_loan_applications_dealer on loan_applications(dealer_id, created_at desc);
create index if not exists idx_customer_profiles_phone on customer_profiles(phone);
create index if not exists idx_kyc_documents_application on kyc_documents(loan_application_id);

-- ============================================================
-- Row Level Security
-- All writes/reads go through Vercel serverless functions using the
-- Supabase SERVICE ROLE key (bypasses RLS), so RLS stays locked down
-- against the anon/public key.
-- ============================================================
alter table users enable row level security;
alter table dealer_master enable row level security;
alter table dealer_users enable row level security;
alter table vehicle_oem_master enable row level security;
alter table vehicle_model_master enable row level security;
alter table dealer_vehicle_mapping enable row level security;
alter table customer_profiles enable row level security;
alter table loan_applications enable row level security;
alter table guarantor_details enable row level security;
alter table kyc_documents enable row level security;
alter table application_status_history enable row level security;
alter table fi_reports enable row level security;
alter table sanction_records enable row level security;
alter table dealer_incentives enable row level security;
-- No policies are defined on purpose: with RLS enabled and zero policies,
-- the anon/public key can read or write NOTHING. Only the service role
-- key (used server-side only, never shipped to the browser) bypasses RLS.

-- ============================================================
-- Seed data (safe to delete/edit)
-- ============================================================
insert into vehicle_oem_master (oem_name) values ('GRD EV Limited')
  on conflict do nothing;

insert into dealer_master (dealer_name, dealer_code, city, state)
  values ('Demo Dealer', 'DLR-0001', 'New Delhi', 'Delhi')
  on conflict (dealer_code) do nothing;
