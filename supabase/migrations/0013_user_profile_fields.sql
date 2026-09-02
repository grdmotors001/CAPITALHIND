-- Self-service profile fields for every authenticated account.
-- Photos are stored as compressed data URLs by the profile screen to avoid
-- adding another Vercel function/storage upload flow.
alter table users add column if not exists dob date;
alter table users add column if not exists father_name text;
alter table users add column if not exists address text;
alter table users add column if not exists profile_photo text;

alter table dealer_users add column if not exists dob date;
alter table dealer_users add column if not exists father_name text;
alter table dealer_users add column if not exists address text;
alter table dealer_users add column if not exists profile_photo text;
