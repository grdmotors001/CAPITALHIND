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
