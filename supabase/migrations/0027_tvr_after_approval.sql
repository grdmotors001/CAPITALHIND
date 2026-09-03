-- CHFPL Step 11.7: TVR (Tele Verification Report) after loan approval.
-- TVR is a mandatory gate between DO approval and loan creation/disbursement.

alter table public.loan_applications
  add column if not exists tvr_status text not null default 'not_required';

alter table public.loan_applications drop constraint if exists loan_applications_tvr_status_check;
alter table public.loan_applications add constraint loan_applications_tvr_status_check
check (tvr_status in ('not_required','pending','submitted','verified','failed','hold'));

create index if not exists loan_applications_tvr_status_idx
on public.loan_applications(tvr_status);

create table if not exists public.loan_tvrs (
  id uuid primary key default gen_random_uuid(),
  loan_application_id bigint not null unique references public.loan_applications(id) on delete cascade,
  assigned_fe_id uuid references public.users(id) on delete set null,
  verified_by uuid references public.users(id) on delete set null,
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

create index if not exists loan_tvrs_fe_status_idx on public.loan_tvrs(assigned_fe_id, status);
create index if not exists loan_tvrs_app_idx on public.loan_tvrs(loan_application_id);

alter table public.loan_tvrs enable row level security;

-- Existing approved applications become TVR-pending only when they have an FE.
insert into public.loan_tvrs (loan_application_id, assigned_fe_id, status)
select id, assigned_fe_id, 'pending'
from public.loan_applications
where application_status = 'approved'
  and assigned_fe_id is not null
on conflict (loan_application_id) do nothing;

update public.loan_applications la
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
    insert into public.loan_tvrs (loan_application_id, assigned_fe_id, status)
    values (new.id, new.assigned_fe_id, 'pending')
    on conflict (loan_application_id) do update
      set assigned_fe_id = excluded.assigned_fe_id,
          updated_at = now();

    new.tvr_status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_tvr_after_approval on public.loan_applications;
create trigger trg_create_tvr_after_approval
before update of application_status, assigned_fe_id on public.loan_applications
for each row execute function public.create_tvr_after_approval();
