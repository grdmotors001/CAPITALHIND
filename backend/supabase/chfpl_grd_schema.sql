-- CHFPL schema for GRD database
-- Generated from CAPITALHIND migrations.
-- All CHFPL application tables are prefixed with chfpl_.
-- Run this file in the GRD Supabase SQL Editor.


-- ===== 0001_init.sql =====
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


-- ===== 0002_loan_workflow.sql =====
-- CHFPL — Loan workflow: Dealer submits -> Admin assigns FE -> FE completes FI -> DO approves
-- Run this after 0001_init.sql (Supabase SQL Editor, or `supabase db push`).

-- 1. Allow 'do' (Disbursement Officer) as a role in `users`, alongside the
--    existing field_executive / tele_caller / customer / admin roles.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('field_executive','tele_caller','customer','admin','do'));

-- 2. Track which Field Executive an application is assigned to, and when.
alter table loan_applications add column if not exists assigned_fe_id uuid references users(id);
alter table loan_applications add column if not exists assigned_at timestamptz;

create index if not exists idx_loan_applications_assigned_fe on loan_applications(assigned_fe_id);

-- 3. Field Investigation Report — one row per loan application, filled in
--    by the assigned Field Executive. Extends the existing placeholder
--    `fi_reports` table from 0001_init.sql with the fields actually
--    collected on the ground (simplified vs. the full paper FIR form).
alter table fi_reports add column if not exists submitted_by uuid references users(id);
alter table fi_reports add column if not exists residence_type text check (residence_type in ('rented','own'));
alter table fi_reports add column if not exists mobile_no text;
alter table fi_reports add column if not exists monthly_income numeric(12,2);
alter table fi_reports add column if not exists latitude numeric(10,6);
alter table fi_reports add column if not exists longitude numeric(10,6);

-- recommendation already exists (text) — used to store 'positive' / 'negative'.
alter table fi_reports drop constraint if exists fi_reports_recommendation_check;
alter table fi_reports add constraint fi_reports_recommendation_check
  check (recommendation in ('positive','negative'));

-- one FI report per application
alter table fi_reports drop constraint if exists fi_reports_application_unique;
alter table fi_reports add constraint fi_reports_application_unique unique (loan_application_id);

create index if not exists idx_fi_reports_application on fi_reports(loan_application_id);


-- ===== 0003_customer_otp_google_auth.sql =====
-- 0003_customer_otp_google_auth.sql
-- Adds support for Customer login via Mobile OTP and Google Sign-In.
-- Run this in Supabase SQL Editor AFTER 0001_init.sql and 0002_loan_workflow.sql.

-- ============================================================
-- USERS: allow passwordless accounts (OTP / Google customers)
-- ============================================================
alter table users alter column password_hash drop not null;

alter table users
  add column if not exists auth_provider text not null default 'password'
    check (auth_provider in ('password', 'otp', 'google'));

alter table users
  add column if not exists google_sub text;

-- One Google account -> one user row.
create unique index if not exists users_google_sub_key
  on users (google_sub) where google_sub is not null;

-- Case-insensitive uniqueness on email, only where present (needed so we
-- can find-or-create a user by email on Google login without duplicates).
create unique index if not exists users_email_lower_key
  on users (lower(email)) where email is not null;

-- ============================================================
-- OTP CODES: short-lived codes for mobile-number login
-- ============================================================
create table if not exists otp_codes (
  id bigserial primary key,
  phone text not null,
  otp_hash text not null,
  purpose text not null default 'customer_login',
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_phone_idx on otp_codes (phone, created_at desc);

-- Housekeeping: nothing to backfill — existing password-based rows keep
-- auth_provider = 'password' by default.


-- ===== 0004_admin_masters.sql =====
-- CHFPL — Admin Masters: Hypothecation (HP), Loan Type
-- (Vehicle Model master already exists — vehicle_model_master, 0001_init.sql)
-- Run this after 0001/0002/0003 (Supabase SQL Editor, or `supabase db push`).

-- ============================================================
-- HYPOTHECATION (HP) MASTER
-- The entity/financier name under which the vehicle's RC hypothecation is
-- registered for a loan.
-- ============================================================
create table if not exists hypothecation_master (
  id bigserial primary key,
  hp_name text not null unique,
  hp_code text unique,
  city text,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- LOAN TYPE MASTER
-- ============================================================
create table if not exists loan_type_master (
  id bigserial primary key,
  loan_type_name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Link the new masters onto loan_applications (nullable — existing rows
-- are unaffected; dealer/admin forms can start setting these going forward).
-- ============================================================
alter table loan_applications add column if not exists hypothecation_id bigint references hypothecation_master(id);
alter table loan_applications add column if not exists loan_type_id bigint references loan_type_master(id);

create index if not exists idx_loan_applications_hypothecation on loan_applications(hypothecation_id);
create index if not exists idx_loan_applications_loan_type on loan_applications(loan_type_id);

-- ============================================================
-- Row Level Security — same pattern as 0001_init.sql: locked down against
-- the anon/public key, only the service-role key (server-side only) reads/writes.
-- ============================================================
alter table hypothecation_master enable row level security;
alter table loan_type_master enable row level security;

-- ============================================================
-- Seed data (safe to delete/edit)
-- ============================================================
insert into hypothecation_master (hp_name, hp_code, city, state)
  values ('Capital Hind Finance Pvt Ltd', 'CHFPL-HP-01', 'New Delhi', 'Delhi')
  on conflict (hp_name) do nothing;

insert into loan_type_master (loan_type_name, description) values
  ('New Vehicle Loan', 'Financing for a brand-new vehicle purchased from a dealer'),
  ('Used Vehicle Loan', 'Financing for a pre-owned vehicle'),
  ('Refinance', 'Loan against an already-owned, unencumbered vehicle'),
  ('Top-up Loan', 'Additional loan on top of an existing running loan')
  on conflict (loan_type_name) do nothing;


-- ===== 0005_staff_accounts.sql =====
-- Dedicated staff login/account table.
-- Admin accounts continue to live in public.users with role='admin'.
-- Run this once in Supabase SQL Editor before using Manage Staff.

create table if not exists public.staff_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  contact_mobile text,
  email text,
  role text not null default 'staff' check (role = 'staff'),
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists staff_accounts_username_uq
  on public.staff_accounts (lower(username));

create unique index if not exists staff_accounts_mobile_uq
  on public.staff_accounts (contact_mobile)
  where contact_mobile is not null;

create unique index if not exists staff_accounts_email_uq
  on public.staff_accounts (lower(email))
  where email is not null;

alter table public.staff_accounts enable row level security;

-- Serverless API uses the Supabase service-role key and therefore bypasses RLS.
-- No public/browser policy is intentionally granted for this table.


-- ===== 0006_telecaller_team_leader.sql =====
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


-- ===== 0007_loan_business_workflow.sql =====
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


-- ===== 0008_delivery_sales_workflow.sql =====
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


-- ===== 0008_oem_receipts.sql =====
-- OEM master + standalone receipt workflow.
create table if not exists public.vehicle_oem_master (
  id bigint generated by default as identity primary key,
  oem_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add OEM relation to the existing vehicle model master when that table exists.
do $$
begin
  if to_regclass('public.vehicle_model_master') is not null then
    alter table public.vehicle_model_master
      add column if not exists oem_id bigint;
    if not exists (
      select 1 from pg_constraint
      where conname = 'vehicle_model_master_oem_id_fkey'
    ) then
      alter table public.vehicle_model_master
        add constraint vehicle_model_master_oem_id_fkey
        foreign key (oem_id) references public.vehicle_oem_master(id) on delete set null;
    end if;
  end if;
end $$;

create index if not exists vehicle_oem_master_active_idx
  on public.vehicle_oem_master(is_active, oem_name);

-- Receipt table is also created here so a fresh install gets the standalone receipt tab.
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

alter table public.loan_receipts enable row level security;


-- ===== 0009_co_borrower.sql =====
-- Co-borrower details: one optional co-borrower per loan application.
create table if not exists public.co_borrower_details (
  id bigint generated by default as identity primary key,
  loan_application_id bigint not null references public.loan_applications(id) on delete cascade,
  full_name text not null,
  relation_with_customer text,
  phone text,
  email text,
  dob date,
  gender text,
  address text,
  city text,
  state text,
  pincode text,
  pan text,
  aadhaar_masked text,
  occupation text,
  monthly_income numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_application_id)
);
create index if not exists co_borrower_details_loan_idx on public.co_borrower_details(loan_application_id);
alter table public.co_borrower_details enable row level security;


-- ===== 0009_field_executive_collection.sql =====
-- Field Executive cash collection rights + dashboard collection activity.
-- FE can collect cash only for loans assigned to them; all other dashboards
-- can see a read-only collection activity feed. The FE dashboard intentionally
-- does not render the activity feed.

create index if not exists loan_receipts_entered_by_idx
  on public.loan_receipts(entered_by, created_at desc);

-- Optional metadata for future collection workflows.
alter table public.loan_receipts
  add column if not exists collection_source text not null default 'manual'
    check (collection_source in ('manual','field_executive'));

alter table public.loan_receipts
  add column if not exists collected_at timestamptz;

create index if not exists loan_receipts_collection_source_idx
  on public.loan_receipts(collection_source, created_at desc);


-- ===== 0010_legacy_loan_case_fields.sql =====
-- Legacy loan-case fields aligned with the current Capital Hind workflow.
-- Co-Applicant is represented by the existing co_borrower_details table.

alter table public.customer_profiles
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

alter table public.loan_applications
  add column if not exists hypothecation text,
  add column if not exists do_no text,
  add column if not exists case_received_date date,
  add column if not exists fi_send_date date,
  add column if not exists fi_received_date date,
  add column if not exists fi_status text,
  add column if not exists fi_executive_name text,
  add column if not exists sanction_date date,
  add column if not exists approved_by text,
  add column if not exists file_received_date date,
  add column if not exists file_check_date date,
  add column if not exists interest_rate numeric,
  add column if not exists interest_amount numeric,
  add column if not exists principal_amount numeric,
  add column if not exists emi_no integer,
  add column if not exists emi_amount numeric,
  add column if not exists vehicle_registration_date date;

alter table public.co_borrower_details
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

alter table public.guarantor_details
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

create index if not exists loan_applications_do_no_idx on public.loan_applications(do_no);
create index if not exists loan_applications_fi_status_idx on public.loan_applications(fi_status);
create index if not exists loan_applications_vehicle_registration_date_idx on public.loan_applications(vehicle_registration_date);


-- ===== 0011_dealer_login_compat.sql =====
-- Dealer login compatibility / bootstrap.
-- The application expects public.dealer_master and public.dealer_users.
-- This migration is safe on installations where these tables already exist.

create table if not exists public.dealer_master (
  id bigint generated by default as identity primary key,
  dealer_code text unique,
  dealer_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dealer_users (
  id uuid primary key default gen_random_uuid(),
  dealer_id bigint not null references public.dealer_master(id) on delete cascade,
  full_name text not null,
  phone text not null,
  password_hash text not null,
  role text not null default 'dealer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bring older dealer_users tables up to the fields required by the current API.
alter table public.dealer_users
  add column if not exists dealer_id bigint,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists password_hash text,
  add column if not exists role text default 'dealer',
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now();

create unique index if not exists dealer_users_phone_uq
  on public.dealer_users(phone);
create index if not exists dealer_users_dealer_idx
  on public.dealer_users(dealer_id);
create index if not exists dealer_users_active_idx
  on public.dealer_users(is_active);

-- Server-side APIs use the service-role key.
alter table public.dealer_master enable row level security;
alter table public.dealer_users enable row level security;


-- ===== 0012_backfill_legacy_fe_assignments.sql =====
-- Backfill Field Executive UUID assignments for legacy/imported loans.
-- Older Excel data stored only fi_executive_name; collection permissions use
-- assigned_fe_id. Only exact case-insensitive name matches with one unique
-- active Field Executive are linked automatically.
--
-- Important: PostgreSQL has no min(uuid)/max(uuid) aggregate. We use
-- array_agg(... ORDER BY ...) and take the only row after HAVING count(*) = 1.

WITH unique_fe AS (
  SELECT
    lower(trim(full_name)) AS name_key,
    (array_agg(id ORDER BY id))[1] AS id
  FROM users
  WHERE role = 'field_executive'
    AND is_active = true
    AND full_name IS NOT NULL
    AND trim(full_name) <> ''
  GROUP BY lower(trim(full_name))
  HAVING count(*) = 1
)
UPDATE loan_applications AS la
SET
  assigned_fe_id = u.id,
  assigned_at = COALESCE(la.assigned_at, la.fi_send_date::timestamptz, now())
FROM unique_fe AS u
WHERE la.assigned_fe_id IS NULL
  AND la.fi_executive_name IS NOT NULL
  AND trim(la.fi_executive_name) <> ''
  AND lower(trim(la.fi_executive_name)) = u.name_key;

-- Keep the legacy display name for reporting/printing; assigned_fe_id is the
-- authoritative relationship used by Field Executive access checks.


-- ===== 0013_user_profile_fields.sql =====
-- Self-service profile fields for every authenticated account.
-- Photos are stored as compressed data URLs by the profile screen to avoid
-- adding another Vercel function/storage upload flow.
alter table users add column if not exists dob date;
alter table users add column if not exists father_name text;
alter table users add column if not exists address text;
alter table users add column if not exists profile_photo text;

alter table dealer_users add column if not exists dob date;
alter table dealer_users add column if not exists father_name text;
alter table dealer_users add column if not exists address text;
alter table dealer_users add column if not exists profile_photo text;


-- ===== 0014_cashier_handover.sql =====
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


-- ===== 0015_vehicle_repossession.sql =====
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


