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
