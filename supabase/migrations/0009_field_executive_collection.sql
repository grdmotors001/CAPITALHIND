-- Field Executive cash collection rights + dashboard collection activity.
-- FE can collect cash only for loans assigned to them; all other dashboards
-- can see a read-only collection activity feed. The FE dashboard intentionally
-- does not render the activity feed.

create index if not exists loan_receipts_entered_by_idx
  on public.loan_receipts(entered_by, created_at desc);

-- Optional metadata for future collection workflows.
alter table public.loan_receipts
  add column if not exists collection_source text not null default 'manual'
    check (collection_source in ('manual','field_executive'));

alter table public.loan_receipts
  add column if not exists collected_at timestamptz;

create index if not exists loan_receipts_collection_source_idx
  on public.loan_receipts(collection_source, created_at desc);
