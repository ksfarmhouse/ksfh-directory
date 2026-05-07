-- Lets a signing-in brother attach their auth user to an unclaimed stub
-- profile imported from the family tree. Runs as SECURITY DEFINER so it can
-- bypass the profiles_update_own RLS check (which requires user_id = auth.uid()
-- and would otherwise fail because the stub's user_id is null).
--
-- Constraints enforced inside the function:
--   * caller must be authenticated
--   * caller must not already have a profile (one-shot per brother)
--   * stub must exist, must be unclaimed (user_id is null), and must not be hidden

create or replace function public.claim_stub_profile(stub_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where user_id = v_uid) then
    raise exception 'You already have a profile';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = stub_id and user_id is null and hidden = false
  ) then
    raise exception 'Profile not found or already claimed';
  end if;

  update public.profiles
  set user_id = v_uid,
      claimed_at = now()
  where id = stub_id;

  return stub_id;
end;
$$;

grant execute on function public.claim_stub_profile(uuid) to authenticated;
