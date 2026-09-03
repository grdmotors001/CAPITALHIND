-- CHFPL Step 3: Audit log foundation
-- Tracks important finance system changes for compliance and traceability

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  module text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_module_idx on public.audit_logs(module);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;
