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
