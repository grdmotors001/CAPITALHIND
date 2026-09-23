-- Step 8 Payment Gateway and eNACH foundation

create table if not exists payment_transactions (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid,
 customer_id uuid,
 amount numeric not null,
 payment_type text,
 gateway text,
 transaction_id text,
 gateway_order_id text,
 status text default 'CREATED',
 response_data jsonb,
 created_at timestamptz default now()
);

create index if not exists idx_payment_transactions_loan on payment_transactions(loan_id);
create index if not exists idx_payment_transactions_status on payment_transactions(status);

create table if not exists emandate_records (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid,
 customer_id uuid,
 mandate_id text,
 bank_name text,
 account_last4 text,
 mandate_status text default 'INITIATED',
 activation_date timestamptz,
 failure_reason text,
 created_at timestamptz default now()
);

create index if not exists idx_emandate_customer on emandate_records(customer_id);
create index if not exists idx_emandate_status on emandate_records(mandate_status);
