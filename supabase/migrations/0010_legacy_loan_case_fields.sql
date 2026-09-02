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
