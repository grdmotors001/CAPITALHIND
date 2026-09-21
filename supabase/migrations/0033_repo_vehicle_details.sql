-- Additional vehicle identity captured at repossession for GRD resale handoff.
alter table public.vehicle_repossessions
  add column if not exists model_name text,
  add column if not exists colour text,
  add column if not exists toolkit text;
