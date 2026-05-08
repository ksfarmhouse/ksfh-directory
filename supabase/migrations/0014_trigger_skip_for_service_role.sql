-- The guard trigger consults auth.uid() to decide whether the caller is an
-- admin. From the Supabase SQL Editor / service role there's no JWT, so
-- auth.uid() returns null and the trigger ends up blocking maintenance work
-- (unclaiming a stub, deleting an auth.users row whose ON DELETE SET NULL
-- cascade would otherwise null out a profile.user_id, etc.).
--
-- This update lets the trigger pass through when there's no auth context.
-- Authenticated brothers still hit all the original checks.

create or replace function public.guard_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_self_claim boolean;
begin
  -- No JWT (service role / SQL Editor / cascade from auth.users delete).
  if v_uid is null then
    return new;
  end if;

  if public.is_admin(v_uid) then
    return new;
  end if;

  v_self_claim := old.user_id is null and new.user_id = v_uid;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Only admins can change admin status';
  end if;

  if new.user_id is distinct from old.user_id and not v_self_claim then
    raise exception 'Only admins can reassign profile ownership';
  end if;

  if new.claimed_at is distinct from old.claimed_at and not v_self_claim then
    raise exception 'Only admins can set claimed_at';
  end if;

  return new;
end;
$$;
