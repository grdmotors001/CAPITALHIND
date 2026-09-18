-- Admin direct/manual loan creation support.
-- Dealer is entered by Admin; dealer_user_id is optional for admin-originated loans.
alter table public.loan_applications
  alter column dealer_user_id drop not null;

create index if not exists loan_applications_loan_account_no_idx
  on public.loan_applications(loan_account_no);
