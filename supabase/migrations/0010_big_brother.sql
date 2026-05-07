-- Adds the big_brother relationship on profiles. Each brother has at most
-- one big; little brothers are derived via reverse lookup
-- (where big_brother_id = me.id).
--
-- The DB enforces no direct self-loops (you can't be your own big). Deeper
-- cycles (A → B → A) aren't enforced here — the picker UIs prevent them in
-- practice and they're cheap to detect with a recursive query if needed.

alter table public.profiles
  add column if not exists big_brother_id uuid
    references public.profiles(id) on delete set null;

alter table public.profiles
  drop constraint if exists big_brother_not_self;
alter table public.profiles
  add constraint big_brother_not_self
    check (big_brother_id is null or big_brother_id <> id);

create index if not exists profiles_big_brother_id_idx
  on public.profiles (big_brother_id);
