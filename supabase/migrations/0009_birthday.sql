-- Adds an optional birthday on profiles. Stored as a `date` (no time) so
-- timezone shifts don't bump the day on display.

alter table public.profiles
  add column if not exists birthday date;
