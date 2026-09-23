-- GRD resale lifecycle for CHFPL repossessed vehicles.
alter table public.vehicle_repossessions
  add column if not exists resale_status text not null default 'SEIZED';

alter table public.vehicle_repossessions
  drop constraint if exists vehicle_repossessions_resale_status_check;

alter table public.vehicle_repossessions
  add constraint vehicle_repossessions_resale_status_check
  check (resale_status in ('SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'));

create index if not exists vehicle_repossessions_resale_status_idx
  on public.vehicle_repossessions(resale_status, repo_date desc);
