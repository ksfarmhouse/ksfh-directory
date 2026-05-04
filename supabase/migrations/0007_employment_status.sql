-- Adds an employment_status toggle on profiles. Brothers either show
-- Position + Company (employed) or University + expected Grad Year (postgrad).
-- Run after 0006 in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists employment_status text
    check (employment_status in ('employed', 'postgrad')),
  add column if not exists university text,
  add column if not exists grad_year int
    check (grad_year is null or (grad_year between 1900 and 2100));

-- Backfill: anyone with existing position or company is treated as employed.
update public.profiles
set employment_status = 'employed'
where employment_status is null
  and (position is not null or company is not null);

create index if not exists profiles_employment_status_idx
  on public.profiles (employment_status);
