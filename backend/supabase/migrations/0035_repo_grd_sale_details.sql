-- Sale details sent back by GRD when a repossessed vehicle is sold as Old Rickshaw.
alter table public.vehicle_repossessions
  add column if not exists sold_customer_name text,
  add column if not exists sold_date date,
  add column if not exists sold_amount numeric,
  add column if not exists sold_loan_amount numeric,
  add column if not exists sold_balance_amount numeric,
  add column if not exists sold_ledger_no text,
  add column if not exists sold_do_no text;
