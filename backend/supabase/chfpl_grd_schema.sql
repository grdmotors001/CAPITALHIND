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
create table if not exists chfpl_users (
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
-- CUSTOMER + LOAN APPLICATION
-- ============================================================
create table if not exists chfpl_customer_profiles (
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

create table if not exists chfpl_loan_applications (
  id bigserial primary key,
  application_no text unique not null,
  dealer_id bigint not null references dealer_master(id),
  dealer_user_id bigint not null references dealer_users(id),
  customer_id bigint not null references chfpl_customer_profiles(id),
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

create table if not exists chfpl_guarantor_details (
  id bigserial primary key,
  loan_application_id bigint not null references chfpl_loan_applications(id) on delete cascade,
  full_name text not null,
  relation_with_customer text,
  phone text not null,
  address text,
  pan text,
  aadhaar_masked text
);

create table if not exists chfpl_kyc_documents (
  id bigserial primary key,
  loan_application_id bigint not null references chfpl_loan_applications(id) on delete cascade,
  customer_id bigint not null references chfpl_customer_profiles(id),
  doc_type text not null check (doc_type in
    ('pan','aadhaar_front','aadhaar_back','photo','address_proof','income_proof','bank_statement','other')),
  file_path text not null,   -- Supabase Storage object path
  file_name text not null,
  uploaded_by bigint references dealer_users(id),
  created_at timestamptz not null default now()
);

create table if not exists chfpl_application_status_history (
  id bigserial primary key,
  loan_application_id bigint not null references chfpl_loan_applications(id) on delete cascade,
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
create table if not exists chfpl_fi_reports (
  id bigserial primary key,
  loan_application_id bigint not null references chfpl_loan_applications(id) on delete cascade,
  visited_by text,
  visit_date date,
  remarks text,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists chfpl_sanction_records (
  id bigserial primary key,
  loan_application_id bigint not null references chfpl_loan_applications(id) on delete cascade,
  sanctioned_amount numeric(12,2),
  interest_rate numeric(5,2),
  sanctioned_by text,
  sanctioned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists chfpl_dealer_incentives (
  id bigserial primary key,
  dealer_id bigint not null references dealer_master(id) on delete cascade,
  loan_application_id bigint references chfpl_loan_applications(id),
  incentive_amount numeric(12,2),
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_loan_applications_dealer on chfpl_loan_applications(dealer_id, created_at desc);
create index if not exists idx_customer_profiles_phone on chfpl_customer_profiles(phone);
create index if not exists idx_kyc_documents_application on chfpl_kyc_documents(loan_application_id);

-- ============================================================
-- Row Level Security
-- All writes/reads go through Vercel serverless functions using the
-- Supabase SERVICE ROLE key (bypasses RLS), so RLS stays locked down
-- against the anon/public key.
-- ============================================================
alter table chfpl_users enable row level security;

alter table chfpl_customer_profiles enable row level security;
alter table chfpl_loan_applications enable row level security;
alter table chfpl_guarantor_details enable row level security;
alter table chfpl_kyc_documents enable row level security;
alter table chfpl_application_status_history enable row level security;
alter table chfpl_fi_reports enable row level security;
alter table chfpl_sanction_records enable row level security;
alter table chfpl_dealer_incentives enable row level security;
-- No policies are defined on purpose: with RLS enabled and zero policies,
-- the anon/public key can read or write NOTHING. Only the service role
-- key (used server-side only, never shipped to the browser) bypasses RLS.

-- ============================================================
-- Seed data (safe to delete/edit)
-- ============================================================
-- ===== 0002_loan_workflow.sql =====
-- CHFPL — Loan workflow: Dealer submits -> Admin assigns FE -> FE completes FI -> DO approves
-- Run this after 0001_init.sql (Supabase SQL Editor, or `supabase db push`).

-- 1. Allow 'do' (Disbursement Officer) as a role in `chfpl_users`, alongside the
--    existing field_executive / tele_caller / customer / admin roles.
alter table chfpl_users drop constraint if exists users_role_check;
alter table chfpl_users add constraint users_role_check
  check (role in ('field_executive','tele_caller','customer','admin','do'));

-- 2. Track which Field Executive an application is assigned to, and when.
alter table chfpl_loan_applications add column if not exists assigned_fe_id uuid references chfpl_users(id);
alter table chfpl_loan_applications add column if not exists assigned_at timestamptz;

create index if not exists idx_loan_applications_assigned_fe on chfpl_loan_applications(assigned_fe_id);

-- 3. Field Investigation Report — one row per loan application, filled in
--    by the assigned Field Executive. Extends the existing placeholder
--    `chfpl_fi_reports` table from 0001_init.sql with the fields actually
--    collected on the ground (simplified vs. the full paper FIR form).
alter table chfpl_fi_reports add column if not exists submitted_by uuid references chfpl_users(id);
alter table chfpl_fi_reports add column if not exists residence_type text check (residence_type in ('rented','own'));
alter table chfpl_fi_reports add column if not exists mobile_no text;
alter table chfpl_fi_reports add column if not exists monthly_income numeric(12,2);
alter table chfpl_fi_reports add column if not exists latitude numeric(10,6);
alter table chfpl_fi_reports add column if not exists longitude numeric(10,6);

-- recommendation already exists (text) — used to store 'positive' / 'negative'.
alter table chfpl_fi_reports drop constraint if exists fi_reports_recommendation_check;
alter table chfpl_fi_reports add constraint fi_reports_recommendation_check
  check (recommendation in ('positive','negative'));

-- one FI report per application
alter table chfpl_fi_reports drop constraint if exists fi_reports_application_unique;
alter table chfpl_fi_reports add constraint fi_reports_application_unique unique (loan_application_id);

create index if not exists idx_fi_reports_application on chfpl_fi_reports(loan_application_id);


-- ===== 0003_customer_otp_google_auth.sql =====
-- 0003_customer_otp_google_auth.sql
-- Adds support for Customer login via Mobile OTP and Google Sign-In.
-- Run this in Supabase SQL Editor AFTER 0001_init.sql and 0002_loan_workflow.sql.

-- ============================================================
-- USERS: allow passwordless accounts (OTP / Google customers)
-- ============================================================
alter table chfpl_users alter column password_hash drop not null;

alter table chfpl_users
  add column if not exists auth_provider text not null default 'password'
    check (auth_provider in ('password', 'otp', 'google'));

alter table chfpl_users
  add column if not exists google_sub text;

-- One Google account -> one user row.
create unique index if not exists users_google_sub_key
  on chfpl_users (google_sub) where google_sub is not null;

-- Case-insensitive uniqueness on email, only where present (needed so we
-- can find-or-create a user by email on Google login without duplicates).
create unique index if not exists users_email_lower_key
  on chfpl_users (lower(email)) where email is not null;

-- ============================================================
-- OTP CODES: short-lived codes for mobile-number login
-- ============================================================
create table if not exists chfpl_otp_codes (
  id bigserial primary key,
  phone text not null,
  otp_hash text not null,
  purpose text not null default 'customer_login',
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_phone_idx on chfpl_otp_codes (phone, created_at desc);

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
create table if not exists chfpl_hypothecation_master (
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
create table if not exists chfpl_loan_type_master (
  id bigserial primary key,
  loan_type_name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Link the new masters onto chfpl_loan_applications (nullable — existing rows
-- are unaffected; dealer/admin forms can start setting these going forward).
-- ============================================================
alter table chfpl_loan_applications add column if not exists hypothecation_id bigint references chfpl_hypothecation_master(id);
alter table chfpl_loan_applications add column if not exists loan_type_id bigint references chfpl_loan_type_master(id);

create index if not exists idx_loan_applications_hypothecation on chfpl_loan_applications(hypothecation_id);
create index if not exists idx_loan_applications_loan_type on chfpl_loan_applications(loan_type_id);

-- ============================================================
-- Row Level Security — same pattern as 0001_init.sql: locked down against
-- the anon/public key, only the service-role key (server-side only) reads/writes.
-- ============================================================
alter table chfpl_hypothecation_master enable row level security;
alter table chfpl_loan_type_master enable row level security;

-- ============================================================
-- Seed data (safe to delete/edit)
-- ============================================================
insert into chfpl_hypothecation_master (hp_name, hp_code, city, state)
  values ('Capital Hind Finance Pvt Ltd', 'CHFPL-HP-01', 'New Delhi', 'Delhi')
  on conflict (hp_name) do nothing;

insert into chfpl_loan_type_master (loan_type_name, description) values
  ('New Vehicle Loan', 'Financing for a brand-new vehicle purchased from a dealer'),
  ('Used Vehicle Loan', 'Financing for a pre-owned vehicle'),
  ('Refinance', 'Loan against an already-owned, unencumbered vehicle'),
  ('Top-up Loan', 'Additional loan on top of an existing running loan')
  on conflict (loan_type_name) do nothing;


-- ===== 0005_staff_accounts.sql =====
-- Dedicated staff login/account table.
-- Admin accounts continue to live in public.chfpl_users with role='admin'.
-- Run this once in Supabase SQL Editor before using Manage Staff.

create table if not exists public.chfpl_staff_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  contact_mobile text,
  email text,
  role text not null default 'staff' check (role = 'staff'),
  is_active boolean not null default true,
  created_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists staff_accounts_username_uq
  on public.chfpl_staff_accounts (lower(username));

create unique index if not exists staff_accounts_mobile_uq
  on public.chfpl_staff_accounts (contact_mobile)
  where contact_mobile is not null;

create unique index if not exists staff_accounts_email_uq
  on public.chfpl_staff_accounts (lower(email))
  where email is not null;

alter table public.chfpl_staff_accounts enable row level security;

-- Serverless API uses the Supabase service-role key and therefore bypasses RLS.
-- No public/browser policy is intentionally granted for this table.


-- ===== 0006_telecaller_team_leader.sql =====
-- Tele Caller / Team Leader workflow
-- A physical register (ledger) is identified by its serial number.
-- New loan applications store the physical register serial. Team Leaders
-- assign those registers to Tele Callers for calling.

alter table public.chfpl_users drop constraint if exists users_role_check;
alter table public.chfpl_users add constraint users_role_check
  check (role in ('field_executive','tele_caller','customer','admin','do','team_leader'));

create index if not exists users_team_leader_role_idx on public.chfpl_users(role) where role = 'team_leader';
create index if not exists users_tele_caller_role_idx on public.chfpl_users(role) where role = 'tele_caller';

alter table public.chfpl_loan_applications
  add column if not exists physical_register_serial_no text;

create index if not exists loan_applications_register_serial_idx
  on public.chfpl_loan_applications(physical_register_serial_no)
  where physical_register_serial_no is not null;

create table if not exists public.chfpl_telecaller_registers (
  id uuid primary key default gen_random_uuid(),
  register_serial_no text not null unique,
  assigned_telecaller_id uuid references public.chfpl_users(id) on delete set null,
  assigned_by uuid references public.chfpl_users(id) on delete set null,
  assigned_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telecaller_registers_telecaller_idx
  on public.chfpl_telecaller_registers(assigned_telecaller_id);

create table if not exists public.chfpl_telecaller_call_logs (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  telecaller_id uuid not null references public.chfpl_users(id) on delete cascade,
  outcome text not null check (outcome in ('connected','not_connected','callback','interested','not_interested','wrong_number','promise_to_pay','paid','do_not_call')),
  notes text,
  callback_at timestamptz,
  called_at timestamptz not null default now()
);

create index if not exists telecaller_call_logs_loan_idx on public.chfpl_telecaller_call_logs(loan_application_id);
create index if not exists telecaller_call_logs_user_idx on public.chfpl_telecaller_call_logs(telecaller_id, called_at desc);

alter table public.chfpl_telecaller_registers enable row level security;
alter table public.chfpl_telecaller_call_logs enable row level security;


-- ===== 0007_loan_business_workflow.sql =====
-- Business workflow: CIBIL gate, approval validity, loan-entry fields,
-- case tracking, manual receipts and payment/incentive vouchers.

alter table public.chfpl_loan_applications
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

alter table public.chfpl_loan_applications drop constraint if exists loan_applications_case_status_check;
alter table public.chfpl_loan_applications add constraint loan_applications_case_status_check
  check (case_status in ('active','suit_filed','vehicle_seized','closed','written_off'));

create index if not exists loan_applications_cibil_idx on public.chfpl_loan_applications(cibil_score);
create index if not exists loan_applications_approval_validity_idx on public.chfpl_loan_applications(approval_valid_until);
create index if not exists loan_applications_case_status_idx on public.chfpl_loan_applications(case_status);
create index if not exists loan_applications_seized_idx on public.chfpl_loan_applications(vehicle_seized_at) where vehicle_seized_at is not null;

create table if not exists public.chfpl_loan_receipts (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  receipt_no text not null unique,
  receipt_date date not null default current_date,
  amount numeric not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash','upi','bank','cheque','other')),
  reference_no text,
  remarks text,
  entered_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loan_receipts_loan_idx on public.chfpl_loan_receipts(loan_application_id, receipt_date desc);

create table if not exists public.chfpl_loan_payment_vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_no text not null unique,
  loan_application_id bigint references public.chfpl_loan_applications(id) on delete set null,
  recipient_user_id uuid references public.chfpl_users(id) on delete set null,
  recipient_name text,
  recipient_role text,
  voucher_type text not null default 'incentive' check (voucher_type in ('incentive','field_visit','telecalling','collection','expense','other')),
  amount numeric not null check (amount > 0),
  voucher_date date not null default current_date,
  narration text,
  created_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loan_payment_vouchers_loan_idx on public.chfpl_loan_payment_vouchers(loan_application_id, voucher_date desc);
create index if not exists loan_payment_vouchers_recipient_idx on public.chfpl_loan_payment_vouchers(recipient_user_id, voucher_date desc);

alter table public.chfpl_loan_receipts enable row level security;
alter table public.chfpl_loan_payment_vouchers enable row level security;


-- ===== 0008_delivery_sales_workflow.sql =====
-- Loan -> Delivery -> Sale workflow
alter table public.chfpl_loan_applications
  add column if not exists dealer_user_id uuid references public.dealer_users(id) on delete set null;

create table if not exists public.chfpl_delivery_details (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null unique references public.chfpl_loan_applications(id) on delete cascade,
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
  on public.chfpl_delivery_details(dealer_user_id,status);

create table if not exists public.chfpl_sales (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint unique references public.chfpl_loan_applications(id) on delete restrict,
  delivery_id uuid references public.chfpl_delivery_details(id) on delete set null,
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

create index if not exists sales_dealer_status_idx on public.chfpl_sales(dealer_user_id,sale_status);
create index if not exists sales_pending_idx on public.chfpl_sales(sale_status) where sale_status='pending';

alter table public.chfpl_delivery_details enable row level security;
alter table public.chfpl_sales enable row level security;

-- Prevent an approved loan from being used twice, even under concurrent requests.
create unique index if not exists sales_active_loan_uq
  on public.chfpl_sales(loan_application_id)
  where loan_application_id is not null and sale_status <> 'cancelled';


-- ===== 0008_oem_receipts.sql =====
-- OEM master belongs to GRD and is intentionally not created/modified here.

-- Receipt table is also created here so a fresh install gets the standalone receipt tab.
create table if not exists public.chfpl_loan_receipts (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  receipt_no text not null unique,
  receipt_date date not null default current_date,
  amount numeric not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash','upi','bank','cheque','other')),
  reference_no text,
  remarks text,
  entered_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loan_receipts_loan_idx on public.chfpl_loan_receipts(loan_application_id, receipt_date desc);

alter table public.chfpl_loan_receipts enable row level security;


-- ===== 0009_co_borrower.sql =====
-- Co-borrower details: one optional co-borrower per loan application.
create table if not exists public.chfpl_co_borrower_details (
  id bigint generated by default as identity primary key,
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
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
create index if not exists co_borrower_details_loan_idx on public.chfpl_co_borrower_details(loan_application_id);
alter table public.chfpl_co_borrower_details enable row level security;


-- ===== 0009_field_executive_collection.sql =====
-- Field Executive cash collection rights + dashboard collection activity.
-- FE can collect cash only for loans assigned to them; all other dashboards
-- can see a read-only collection activity feed. The FE dashboard intentionally
-- does not render the activity feed.

create index if not exists loan_receipts_entered_by_idx
  on public.chfpl_loan_receipts(entered_by, created_at desc);

-- Optional metadata for future collection workflows.
alter table public.chfpl_loan_receipts
  add column if not exists collection_source text not null default 'manual'
    check (collection_source in ('manual','field_executive'));

alter table public.chfpl_loan_receipts
  add column if not exists collected_at timestamptz;

create index if not exists loan_receipts_collection_source_idx
  on public.chfpl_loan_receipts(collection_source, created_at desc);


-- ===== 0010_legacy_loan_case_fields.sql =====
-- Legacy loan-case fields aligned with the current Capital Hind workflow.
-- Co-Applicant is represented by the existing chfpl_co_borrower_details table.

alter table public.chfpl_customer_profiles
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

alter table public.chfpl_loan_applications
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

alter table public.chfpl_co_borrower_details
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

alter table public.chfpl_guarantor_details
  add column if not exists ownership_status text,
  add column if not exists landmark text,
  add column if not exists electricity_ca_no text;

create index if not exists loan_applications_do_no_idx on public.chfpl_loan_applications(do_no);
create index if not exists loan_applications_fi_status_idx on public.chfpl_loan_applications(fi_status);
create index if not exists loan_applications_vehicle_registration_date_idx on public.chfpl_loan_applications(vehicle_registration_date);


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
  FROM chfpl_users
  WHERE role = 'field_executive'
    AND is_active = true
    AND full_name IS NOT NULL
    AND trim(full_name) <> ''
  GROUP BY lower(trim(full_name))
  HAVING count(*) = 1
)
UPDATE chfpl_loan_applications AS la
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
alter table chfpl_users add column if not exists dob date;
alter table chfpl_users add column if not exists father_name text;
alter table chfpl_users add column if not exists address text;
alter table chfpl_users add column if not exists profile_photo text;

alter table dealer_users add column if not exists dob date;
alter table dealer_users add column if not exists father_name text;
alter table dealer_users add column if not exists address text;
alter table dealer_users add column if not exists profile_photo text;


-- ===== 0014_cashier_handover.sql =====
-- Cashier role, staff profile fields, and FE-to-cashier cash handover ledger.
alter table public.chfpl_staff_accounts drop constraint if exists staff_accounts_role_check;
alter table public.chfpl_staff_accounts add constraint staff_accounts_role_check check (role in ('staff','cashier'));
alter table public.chfpl_staff_accounts add column if not exists dob date;
alter table public.chfpl_staff_accounts add column if not exists father_name text;
alter table public.chfpl_staff_accounts add column if not exists address text;
alter table public.chfpl_staff_accounts add column if not exists profile_photo text;

create table if not exists public.cash_handovers (
  id uuid primary key default gen_random_uuid(),
  handover_no text not null unique,
  fe_user_id uuid not null references public.chfpl_users(id) on delete restrict,
  cashier_staff_id uuid not null references public.chfpl_staff_accounts(id) on delete restrict,
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
  loan_application_id bigint not null unique references public.chfpl_loan_applications(id) on delete restrict,
  repo_date date not null,
  repo_time time not null,
  seized_by_fe_id uuid not null references public.chfpl_users(id) on delete restrict,
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


-- ===== CHFPL migrations 0016-0025 =====

-- 0016_receipt_and_repo_hardening.sql
-- Hardening for FE cash receipts and Repo register.
-- Safe to run after 0008/0009/0015; all objects/columns are IF NOT EXISTS.

create table if not exists public.chfpl_loan_receipts (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  receipt_no text not null unique,
  receipt_date date not null default current_date,
  amount numeric not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash','upi','bank','cheque','other')),
  reference_no text,
  remarks text,
  entered_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.chfpl_loan_receipts add column if not exists collection_source text not null default 'manual';
alter table public.chfpl_loan_receipts add column if not exists collected_at timestamptz;

create index if not exists loan_receipts_entered_by_idx on public.chfpl_loan_receipts(entered_by, created_at desc);
create index if not exists loan_receipts_collection_source_idx on public.chfpl_loan_receipts(collection_source, created_at desc);
create index if not exists vehicle_repossessions_repo_date_idx on public.vehicle_repossessions(repo_date desc, repo_time desc);

alter table public.chfpl_loan_receipts enable row level security;
alter table public.vehicle_repossessions enable row level security;


-- 0017_loan_ledger_expenses_noc.sql
-- Loan ledger extensions: NOC charges and loan-specific expenses.
-- These entries are printed in the loan ledger together with receipts.

create table if not exists public.chfpl_expense_master (
  id bigserial primary key,
  expense_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chfpl_loan_expenses (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  expense_master_id bigint not null references public.chfpl_expense_master(id) on delete restrict,
  expense_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  remarks text,
  created_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chfpl_loan_charges (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  charge_type text not null default 'noc' check (charge_type in ('noc')),
  charge_name text not null default 'NOC Charges',
  charge_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  remarks text,
  created_by uuid references public.chfpl_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loan_expenses_loan_idx on public.chfpl_loan_expenses(loan_application_id, expense_date desc, created_at desc);
create index if not exists loan_expenses_master_idx on public.chfpl_loan_expenses(expense_master_id);
create index if not exists loan_charges_loan_idx on public.chfpl_loan_charges(loan_application_id, charge_date desc, created_at desc);

alter table public.chfpl_expense_master enable row level security;
alter table public.chfpl_loan_expenses enable row level security;
alter table public.chfpl_loan_charges enable row level security;

-- Useful starter masters; duplicates are ignored.
insert into public.chfpl_expense_master (expense_name) values
  ('Legal Charges'), ('Field Visit Expense'), ('Documentation Charges'), ('Parking / Yard Charges'), ('Other Expense')
on conflict (expense_name) do nothing;


-- 0018_audit_logs.sql
-- CHFPL Step 3: Audit log foundation
-- Tracks important finance system changes for compliance and traceability

create table if not exists public.chfpl_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.chfpl_users(id) on delete set null,
  action text not null,
  module text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on public.chfpl_audit_logs(user_id);
create index if not exists audit_logs_module_idx on public.chfpl_audit_logs(module);
create index if not exists audit_logs_created_at_idx on public.chfpl_audit_logs(created_at);

alter table public.chfpl_audit_logs enable row level security;


-- 0019_loan_lifecycle_status.sql
-- CHFPL Step 4: Standard loan lifecycle workflow
-- Keeps status transitions consistent for NBFC operations.

alter table public.chfpl_loan_applications
  add column if not exists lifecycle_status text not null default 'NEW';

alter table public.chfpl_loan_applications drop constraint if exists loan_applications_lifecycle_status_check;
alter table public.chfpl_loan_applications add constraint loan_applications_lifecycle_status_check
check (lifecycle_status in (
  'NEW',
  'DOCUMENT_PENDING',
  'FI_PENDING',
  'FI_COMPLETED',
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'CLOSED',
  'REJECTED'
));

create index if not exists loan_applications_lifecycle_status_idx
on public.chfpl_loan_applications(lifecycle_status);

create table if not exists public.chfpl_loan_status_history (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.chfpl_users(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists loan_status_history_loan_idx
on public.chfpl_loan_status_history(loan_application_id, created_at desc);

alter table public.chfpl_loan_status_history enable row level security;


-- 0020_kyc_document_security.sql
-- Step 6: KYC document security foundation

alter table if exists public.chfpl_kyc_documents
  add column if not exists verification_status text default 'UPLOADED',
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text;

alter table if exists public.chfpl_kyc_documents
  add constraint kyc_documents_verification_status_check
  check (verification_status in ('UPLOADED','VERIFIED','REJECTED'));

create index if not exists idx_kyc_documents_status
on public.chfpl_kyc_documents(verification_status);

-- Keep storage private. Create bucket kyc-documents as private in Supabase dashboard.


-- 0021_emi_collection_module.sql
-- CHFPL Step 7: EMI and Collection foundation

create table if not exists public.chfpl_emi_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  emi_no integer not null,
  due_date date not null,
  emi_amount numeric(12,2) not null default 0,
  principal_amount numeric(12,2) default 0,
  interest_amount numeric(12,2) default 0,
  paid_amount numeric(12,2) default 0,
  status text not null default 'PENDING',
  paid_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.chfpl_collection_entries (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  customer_id uuid,
  amount numeric(12,2) not null,
  payment_mode text not null default 'CASH',
  receipt_no text,
  collected_by uuid,
  remarks text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_emi_schedule_loan on public.chfpl_emi_schedule(loan_id);
create index if not exists idx_emi_schedule_status on public.chfpl_emi_schedule(status);
create index if not exists idx_collection_loan on public.chfpl_collection_entries(loan_id);

alter table public.chfpl_emi_schedule enable row level security;
alter table public.chfpl_collection_entries enable row level security;


-- 0022_payment_enach_foundation.sql
-- Step 8 Payment Gateway and eNACH foundation

create table if not exists chfpl_payment_transactions (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid,
 customer_id uuid,
 amount numeric not null,
 payment_type text,
 gateway text,
 transaction_id text,
 gateway_order_id text,
 status text default 'CREATED',
 response_data jsonb,
 created_at timestamptz default now()
);

create index if not exists idx_payment_transactions_loan on chfpl_payment_transactions(loan_id);
create index if not exists idx_payment_transactions_status on chfpl_payment_transactions(status);

create table if not exists chfpl_emandate_records (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid,
 customer_id uuid,
 mandate_id text,
 bank_name text,
 account_last4 text,
 mandate_status text default 'INITIATED',
 activation_date timestamptz,
 failure_reason text,
 created_at timestamptz default now()
);

create index if not exists idx_emandate_customer on chfpl_emandate_records(customer_id);
create index if not exists idx_emandate_status on chfpl_emandate_records(mandate_status);


-- 0023_payment_ledger_reconciliation.sql
-- Step 9: Payment webhook reconciliation and loan ledger foundation

create table if not exists public.chfpl_loan_ledger (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null,
  customer_id uuid,
  transaction_date timestamptz default now(),
  particular text not null,
  amount numeric(12,2) not null,
  entry_type text not null check (entry_type in ('DEBIT','CREDIT')),
  reference_type text,
  reference_id text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_loan_ledger_loan_id on public.chfpl_loan_ledger(loan_id);
create index if not exists idx_loan_ledger_date on public.chfpl_loan_ledger(transaction_date);

create table if not exists public.chfpl_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  event_id text unique,
  transaction_id text,
  payload jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);


-- 0024_emi_auto_generation.sql
-- CHFPL Step 11.2 EMI Auto Generation
create table if not exists public.chfpl_loan_disbursement_events (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid not null,
 amount numeric not null,
 disbursement_date date not null default current_date,
 created_by uuid,
 created_at timestamptz default now()
);

alter table public.chfpl_emi_schedule
 add column if not exists principal_amount numeric,
 add column if not exists interest_amount numeric,
 add column if not exists opening_balance numeric,
 add column if not exists closing_balance numeric,
 add column if not exists paid_date date,
 add column if not exists days_overdue integer default 0;

create index if not exists idx_emi_due_status on public.chfpl_emi_schedule(due_date,status);


-- 0025_collection_risk_management.sql
-- CHFPL Step 11.5 - Collection & Risk Management
-- (Numbered 0025 to fill the gap left between 0024_emi_auto_generation.sql
--  and 0026_telecaller_collection_crm.sql.)
--
-- Adds:
--  1. Fix for chfpl_emi_schedule / chfpl_collection_entries / chfpl_loan_disbursement_events
--     .loan_id (was uuid, chfpl_loan_applications.id is bigint)
--  2. Penal interest + bounce charge tracking on chfpl_emi_schedule
--  3. chfpl_risk_config — single-row configurable rates & NPA ageing thresholds
--  4. loan_dpd / loan_npa_status views — days-past-due + IRAC-style ageing bucket per loan
--  5. chfpl_loan_restructure_requests — restructure / part-payment / foreclosure workflow

-- 1. Fix loan_id column type. Safety guard: abort if any of the three tables
--    already has rows, so we never silently null out real collection data.
do $$
begin
  if exists (select 1 from public.chfpl_emi_schedule limit 1) then
    raise exception 'chfpl_emi_schedule has existing rows — review this migration manually before altering loan_id type.';
  end if;
  if exists (select 1 from public.chfpl_collection_entries limit 1) then
    raise exception 'chfpl_collection_entries has existing rows — review this migration manually before altering loan_id type.';
  end if;
  if exists (select 1 from public.chfpl_loan_disbursement_events limit 1) then
    raise exception 'chfpl_loan_disbursement_events has existing rows — review this migration manually before altering loan_id type.';
  end if;
end $$;

alter table public.chfpl_emi_schedule
  alter column loan_id type bigint using null;
alter table public.chfpl_emi_schedule
  add constraint emi_schedule_loan_fk foreign key (loan_id) references public.chfpl_loan_applications(id) on delete cascade;

alter table public.chfpl_collection_entries
  alter column loan_id type bigint using null;
alter table public.chfpl_collection_entries
  add constraint collection_entries_loan_fk foreign key (loan_id) references public.chfpl_loan_applications(id) on delete cascade;

alter table public.chfpl_loan_disbursement_events
  alter column loan_id type bigint using null;
alter table public.chfpl_loan_disbursement_events
  add constraint loan_disbursement_events_loan_fk foreign key (loan_id) references public.chfpl_loan_applications(id) on delete cascade;

-- 2. Penal interest + bounce charge tracking (days_overdue already added by 0024)
alter table public.chfpl_emi_schedule
  add column if not exists penal_interest_amount numeric(12,2) not null default 0,
  add column if not exists bounce_charge_amount numeric(12,2) not null default 0,
  add column if not exists is_bounced boolean not null default false,
  add column if not exists bounce_date date;

-- 3. Risk configuration (single row — editable by admin)
create table if not exists public.chfpl_risk_config (
  id smallint primary key default 1,
  penal_interest_rate_per_day numeric(6,3) not null default 0.05, -- % per day on overdue EMI
  bounce_charge_flat numeric(10,2) not null default 500,
  sma1_start_days int not null default 1,
  sma2_start_days int not null default 31,
  npa_start_days int not null default 91,
  doubtful_start_days int not null default 181,
  loss_start_days int not null default 361,
  updated_by uuid references public.chfpl_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint risk_config_single_row check (id = 1)
);
insert into public.chfpl_risk_config (id) values (1) on conflict (id) do nothing;
alter table public.chfpl_risk_config enable row level security;

-- 4. Days-past-due per loan (based on unpaid/partially paid EMIs)
create or replace view public.loan_dpd as
select
  loan_id,
  max(current_date - due_date) as days_past_due,
  sum(emi_amount - coalesce(paid_amount, 0)) as overdue_amount,
  count(*) as overdue_emi_count
from public.chfpl_emi_schedule
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
from public.chfpl_loan_applications la
join public.chfpl_customer_profiles cp on cp.id = la.customer_id
left join public.loan_dpd d on d.loan_id = la.id
cross join public.chfpl_risk_config rc
where la.lifecycle_status in ('ACTIVE', 'DISBURSED');

-- 5. Restructure / part-payment / foreclosure requests
create table if not exists public.chfpl_loan_restructure_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  request_type text not null check (request_type in ('RESTRUCTURE', 'PART_PAYMENT', 'FORECLOSURE')),
  requested_amount numeric(14,2),
  new_tenure_months int,
  new_emi_amount numeric(12,2),
  reason text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by uuid references public.chfpl_users(id) on delete set null,
  approved_by uuid references public.chfpl_users(id) on delete set null,
  approved_at timestamptz,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists loan_restructure_requests_loan_idx on public.chfpl_loan_restructure_requests(loan_id, created_at desc);
create index if not exists loan_restructure_requests_status_idx on public.chfpl_loan_restructure_requests(status, created_at desc);

alter table public.chfpl_loan_restructure_requests enable row level security;


-- ===== CHFPL migrations 0026-0034 =====

-- 0026_telecaller_collection_crm.sql
-- Tele Caller NBFC CRM: PTP tracking and indexes.
create table if not exists public.chfpl_telecaller_ptp (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null references public.chfpl_loan_applications(id) on delete cascade,
  telecaller_id uuid not null references public.chfpl_users(id) on delete cascade,
  promised_date date not null,
  promised_amount numeric(12,2) not null check (promised_amount > 0),
  status text not null default 'open' check (status in ('open','kept','broken','cancelled')),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists telecaller_ptp_user_date_idx on public.chfpl_telecaller_ptp(telecaller_id,promised_date,status);
create index if not exists telecaller_ptp_loan_idx on public.chfpl_telecaller_ptp(loan_application_id,created_at desc);
alter table public.chfpl_telecaller_ptp enable row level security;


-- 0027_tvr_after_approval.sql
-- CHFPL Step 11.7: TVR (Tele Verification Report) after loan approval.
-- TVR is a mandatory gate between DO approval and loan creation/disbursement.

alter table public.chfpl_loan_applications
  add column if not exists tvr_status text not null default 'not_required';

alter table public.chfpl_loan_applications drop constraint if exists loan_applications_tvr_status_check;
alter table public.chfpl_loan_applications add constraint loan_applications_tvr_status_check
check (tvr_status in ('not_required','pending','submitted','verified','failed','hold'));

create index if not exists loan_applications_tvr_status_idx
on public.chfpl_loan_applications(tvr_status);

create table if not exists public.chfpl_loan_tvrs (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null unique references public.chfpl_loan_applications(id) on delete cascade,
  assigned_fe_id uuid references public.chfpl_users(id) on delete set null,
  verified_by uuid references public.chfpl_users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','submitted','verified','failed','hold')),
  verification_date date,
  verification_time time,
  customer_contacted boolean,
  applicant_confirmed boolean,
  address_confirmed boolean,
  employment_confirmed boolean,
  reference_confirmed boolean,
  documents_checked boolean,
  vehicle_details_confirmed boolean,
  alternate_mobile_no text,
  reference_name text,
  reference_mobile text,
  remarks text,
  recommendation text check (recommendation in ('positive','negative','hold')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loan_tvrs_fe_status_idx on public.chfpl_loan_tvrs(assigned_fe_id, status);
create index if not exists loan_tvrs_app_idx on public.chfpl_loan_tvrs(loan_application_id);

alter table public.chfpl_loan_tvrs enable row level security;

-- Existing approved applications become TVR-pending only when they have an FE.
insert into public.chfpl_loan_tvrs (loan_application_id, assigned_fe_id, status)
select id, assigned_fe_id, 'pending'
from public.chfpl_loan_applications
where application_status = 'approved'
  and assigned_fe_id is not null
on conflict (loan_application_id) do nothing;

update public.chfpl_loan_applications la
set tvr_status = 'pending'
where la.application_status = 'approved'
  and la.assigned_fe_id is not null
  and la.tvr_status = 'not_required';

create or replace function public.create_tvr_after_approval()
returns trigger
language plpgsql
as $$
begin
  if new.application_status = 'approved'
     and new.assigned_fe_id is not null
     and (old.application_status is distinct from 'approved' or old.assigned_fe_id is distinct from new.assigned_fe_id) then
    insert into public.chfpl_loan_tvrs (loan_application_id, assigned_fe_id, status)
    values (new.id, new.assigned_fe_id, 'pending')
    on conflict (loan_application_id) do update
      set assigned_fe_id = excluded.assigned_fe_id,
          updated_at = now();

    new.tvr_status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_tvr_after_approval on public.chfpl_loan_applications;
create trigger trg_create_tvr_after_approval
before update of application_status, assigned_fe_id on public.chfpl_loan_applications
for each row execute function public.create_tvr_after_approval();


-- 0028_admin_manual_loan.sql
-- Admin direct/manual loan creation support.
-- Dealer is entered by Admin; dealer_user_id is optional for admin-originated loans.
alter table public.chfpl_loan_applications
  alter column dealer_user_id drop not null;

create index if not exists loan_applications_loan_account_no_idx
  on public.chfpl_loan_applications(loan_account_no);


-- 0031_atomic_application_number.sql
-- Atomic CHF application-number generation.
-- Avoid count()+1 collisions when two loan submissions arrive close together.

CREATE TABLE IF NOT EXISTS public.chfpl_chf_application_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL
);

CREATE OR REPLACE FUNCTION public.next_chf_application_no()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  next_number INTEGER;
BEGIN
  INSERT INTO public.chfpl_chf_application_counters(year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_number = public.chfpl_chf_application_counters.last_number + 1
  RETURNING last_number INTO next_number;

  RETURN format('CHF-%s-%s', current_year, lpad(next_number::text, 4, '0'));
END;
$$;


-- 0032_repo_resale_status.sql
-- GRD resale lifecycle for CHFPL repossessed vehicles.
alter table public.vehicle_repossessions
  add column if not exists resale_status text not null default 'SEIZED';

alter table public.vehicle_repossessions
  drop constraint if exists vehicle_repossessions_resale_status_check;

alter table public.vehicle_repossessions
  add constraint vehicle_repossessions_resale_status_check
  check (resale_status in ('SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'));

create index if not exists vehicle_repossessions_resale_status_idx
  on public.vehicle_repossessions(resale_status, repo_date desc);


-- 0033_repo_vehicle_details.sql
-- Additional vehicle identity captured at repossession for GRD resale handoff.
alter table public.vehicle_repossessions
  add column if not exists model_name text,
  add column if not exists colour text,
  add column if not exists toolkit text;


-- 0034_create_loan_emi_fields.sql
-- CHFPL: activate approved loans with disbursement + EMI schedule support.
-- Keeps existing GRD/loan application fields intact and adds only loan-account
-- lifecycle/EMI linkage fields required by the redesigned Create Loan screen.

alter table public.chfpl_loan_applications
  add column if not exists engine_no text,
  add column if not exists loan_remarks text,
  add column if not exists first_emi_date date,
  add column if not exists emi_loan_id uuid unique;

alter table public.chfpl_emi_schedule
  add column if not exists loan_application_id bigint references public.chfpl_loan_applications(id) on delete cascade;

create index if not exists idx_emi_schedule_application
  on public.chfpl_emi_schedule(loan_application_id);

create index if not exists idx_loan_applications_emi_loan
  on public.chfpl_loan_applications(emi_loan_id);

