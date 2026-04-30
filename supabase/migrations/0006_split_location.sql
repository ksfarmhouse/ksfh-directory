-- Splits the single `location` column on profiles into separate `city` and
-- `state` columns. `state` is a 2-letter US state code (free text — no FK,
-- but the UI uses a dropdown to keep values consistent).
-- Run after 0005 in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists city text,
  add column if not exists state text;

-- Backfill: existing data was just a city name (or city, state), copy into city.
update public.profiles
set city = location
where city is null and location is not null;

alter table public.profiles
  drop column if exists location;

create index if not exists profiles_state_idx on public.profiles (state);
create index if not exists profiles_city_idx on public.profiles (city);
