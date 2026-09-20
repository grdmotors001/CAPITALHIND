-- Sync GRD vehicle models into CHFPL's master.
-- GRD is the source of truth for model identity.

alter table public.vehicle_model_master
  add column if not exists grd_model_id bigint;

alter table public.vehicle_model_master
  add column if not exists grd_model_code text;

create unique index if not exists vehicle_model_master_grd_model_id_uq
  on public.vehicle_model_master(grd_model_id)
  where grd_model_id is not null;

create unique index if not exists vehicle_model_master_grd_model_code_uq
  on public.vehicle_model_master(grd_model_code)
  where grd_model_code is not null;
