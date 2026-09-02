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
