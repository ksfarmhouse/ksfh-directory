-- Adds a `hidden` flag on pledge_classes to omit certain entries (like
-- 'Officer', used by the alumni-chair admin profile) from brother-facing
-- dropdowns. The row stays in the table so the FK from profiles.pledge_class
-- isn't broken, and admins can still see/manage it.

alter table public.pledge_classes
  add column if not exists hidden boolean not null default false;

update public.pledge_classes set hidden = true where name = 'Officer';
