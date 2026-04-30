-- KSFH Alumni Directory schema
-- Run in Supabase SQL Editor (or via the CLI). Idempotent where reasonable.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  pledge_class text not null,
  full_name text not null,
  company text,
  position text,
  location text,
  home_address text,
  phone text,
  personal_email text,
  relationship_status text check (
    relationship_status in ('single', 'dating', 'engaged', 'married', 'unknown')
  ),
  partner_name text,
  is_admin boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_pledge_class_idx on public.profiles (pledge_class);
create index if not exists profiles_full_name_idx on public.profiles (lower(full_name));
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- claim_requests
-- ---------------------------------------------------------------------------
create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, user_id)
);

create index if not exists claim_requests_status_idx on public.claim_requests (status);
create index if not exists claim_requests_user_id_idx on public.claim_requests (user_id);

-- ---------------------------------------------------------------------------
-- helper: is current user an admin?
-- SECURITY DEFINER so it can read profiles regardless of caller's RLS context.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.user_id = uid limit 1),
    false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Prevent regular users from elevating themselves to admin or reassigning ownership.
create or replace function public.guard_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Only admins can change admin status';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'Only admins can reassign profile ownership';
    end if;
    if new.claimed_at is distinct from old.claimed_at then
      raise exception 'Only admins can set claimed_at';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
before update on public.profiles
for each row
execute function public.guard_profile_admin_fields();

-- ---------------------------------------------------------------------------
-- RLS: profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: claim_requests
-- ---------------------------------------------------------------------------
alter table public.claim_requests enable row level security;

drop policy if exists "claim_requests_select_own_or_admin" on public.claim_requests;
create policy "claim_requests_select_own_or_admin"
on public.claim_requests for select
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "claim_requests_insert_own" on public.claim_requests;
create policy "claim_requests_insert_own"
on public.claim_requests for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id is null
  )
);

drop policy if exists "claim_requests_admin_all" on public.claim_requests;
create policy "claim_requests_admin_all"
on public.claim_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- claim approval / rejection (admin-only)
-- ---------------------------------------------------------------------------
create or replace function public.approve_claim(claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.claim_requests;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can approve claims';
  end if;

  select * into v_claim from public.claim_requests
  where id = claim_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Claim not found or already processed';
  end if;

  update public.profiles
  set user_id = v_claim.user_id,
      claimed_at = now()
  where id = v_claim.profile_id;

  update public.claim_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = claim_id;

  -- Reject any other pending claims for the same profile
  update public.claim_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where profile_id = v_claim.profile_id
    and id <> claim_id
    and status = 'pending';
end;
$$;

create or replace function public.reject_claim(claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can reject claims';
  end if;

  update public.claim_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = claim_id and status = 'pending';
end;
$$;

grant execute on function public.approve_claim(uuid) to authenticated;
grant execute on function public.reject_claim(uuid) to authenticated;
