-- Adds a `hidden` flag on profiles. Hidden profiles don't appear in the
-- directory or via direct profile-page URL lookups by non-admin users.
-- Used to keep the alumni-chair admin profile out of the public alumni list,
-- since the chair role isn't a brother.

alter table public.profiles
  add column if not exists hidden boolean not null default false;

-- Backfill: hide existing admin profiles (currently just the alumni chair).
update public.profiles set hidden = true where is_admin = true and hidden = false;

create index if not exists profiles_hidden_idx on public.profiles (hidden);
