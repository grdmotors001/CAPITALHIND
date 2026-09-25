-- CHFPL: activate approved loans with disbursement + EMI schedule support.
-- Keeps existing GRD/loan application fields intact and adds only loan-account
-- lifecycle/EMI linkage fields required by the redesigned Create Loan screen.

alter table public.loan_applications
  add column if not exists engine_no text,
  add column if not exists loan_remarks text,
  add column if not exists first_emi_date date,
  add column if not exists emi_loan_id uuid unique;

alter table public.emi_schedule
  add column if not exists loan_application_id bigint references public.loan_applications(id) on delete cascade;

create index if not exists idx_emi_schedule_application
  on public.emi_schedule(loan_application_id);

create index if not exists idx_loan_applications_emi_loan
  on public.loan_applications(emi_loan_id);
