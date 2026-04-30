-- Removes the claim flow. Going forward, users create their own profiles directly.
-- Admins retain the ability to seed stub profiles (no user_id) via the admin page.
-- Run after 0002 in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Delete all unclaimed (admin-seeded) profiles. Profiles owned by a user
--    (user_id is not null) are preserved.
-- ---------------------------------------------------------------------------
delete from public.profiles where user_id is null;

-- ---------------------------------------------------------------------------
-- 2. Drop claim approval / rejection functions.
-- ---------------------------------------------------------------------------
drop function if exists public.approve_claim(uuid);
drop function if exists public.reject_claim(uuid);

-- ---------------------------------------------------------------------------
-- 3. Drop claim_requests table (CASCADE removes its policies).
-- ---------------------------------------------------------------------------
drop table if exists public.claim_requests cascade;

-- ---------------------------------------------------------------------------
-- 4. Drop the (full_name, pledge_class) unique index that was added by the
--    bulk-seed script. With self-service profile creation, two brothers
--    coincidentally sharing a name + class is unlikely but no longer disallowed.
-- ---------------------------------------------------------------------------
drop index if exists public.profiles_full_name_pledge_class_uidx;
