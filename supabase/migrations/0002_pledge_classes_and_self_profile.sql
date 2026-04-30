-- Adds pledge_classes table (admin-managed) and lets users create their own profiles.
-- Run after 0001_init.sql in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- pledge_classes — admins curate the list of selectable pledge classes
-- ---------------------------------------------------------------------------
create table if not exists public.pledge_classes (
  name text primary key,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Backfill from existing profile data so the FK below doesn't fail
insert into public.pledge_classes (name)
select distinct pledge_class from public.profiles
on conflict (name) do nothing;

-- Sensible default ordering: newest classes first (PC '23 > PC '22)
update public.pledge_classes set display_order = 0 where display_order = 0;

alter table public.pledge_classes enable row level security;

drop policy if exists "pledge_classes_select_authenticated" on public.pledge_classes;
create policy "pledge_classes_select_authenticated"
on public.pledge_classes for select
to authenticated
using (true);

drop policy if exists "pledge_classes_admin_all" on public.pledge_classes;
create policy "pledge_classes_admin_all"
on public.pledge_classes for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- FK: profiles.pledge_class must exist in pledge_classes
-- on update cascade so renaming a class propagates; on delete restrict so
-- admins can't orphan profiles by accident
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_pledge_class_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_pledge_class_fkey
      foreign key (pledge_class) references public.pledge_classes(name)
      on update cascade
      on delete restrict;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Allow authenticated users to create their own profile
-- (existing policies still cover update-own and admin-all)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (
  user_id = auth.uid()
  and is_admin = false
);
