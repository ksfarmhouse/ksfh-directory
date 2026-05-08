-- Patch the BEFORE UPDATE guard so a non-admin brother can claim an unclaimed
-- stub for themselves (the path the claim_stub_profile RPC takes). The
-- previous version blocked any user_id / claimed_at change for non-admins,
-- which made the RPC error out the moment it tried to do its one job.
--
-- Self-claim is narrowly defined: old.user_id is null AND new.user_id =
-- auth.uid(). Anything else (reassigning a claimed profile, claiming for
-- someone else, flipping is_admin) is still admin-only.

create or replace function public.guard_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self_claim boolean;
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  v_self_claim := old.user_id is null and new.user_id = auth.uid();

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
