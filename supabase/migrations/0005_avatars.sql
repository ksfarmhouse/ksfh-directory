-- Profile avatars: storage bucket + per-user RLS + avatar_path column on profiles.
-- Run after 0004 in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. avatar_path column on profiles. Stores the storage key, e.g. "<user-id>/<ts>.jpg".
--    Public URL is derived at read time via supabase.storage.getPublicUrl().
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text;

-- ---------------------------------------------------------------------------
-- 2. Create the avatars bucket. Public so the app can link <img src=...>
--    directly without having to mint signed URLs on every render. The site
--    is auth-gated, so the only realistic exposure is a logged-in user
--    sharing the URL externally — acceptable for profile pictures.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------------
-- 3. Storage RLS: a user can write only inside their own folder
--    (object name must start with their auth uid). Anyone authenticated
--    can read (the bucket is public anyway, but this lets RSC/server
--    code list/inspect via the authenticated client).
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_read_authenticated" on storage.objects;
create policy "avatars_read_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
