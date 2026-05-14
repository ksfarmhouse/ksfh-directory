-- Earlier pledge classes were mislabeled because PC '18.2 (between '18 and
-- '19) was missing from the seed list. Every class currently labeled PC '06
-- through PC '18 belongs one year later — PC '18 becomes PC '18.2, PC '17
-- becomes PC '18, and so on down to PC '06 (whose brothers move to PC '07,
-- leaving PC '06 empty so we drop it).
--
-- profiles.pledge_class FKs pledge_classes(name) with ON UPDATE CASCADE, so
-- renaming the parent row reassigns all matching profiles atomically. We
-- rename newest-to-oldest so each target slot is freed by the previous step.
--
-- guard_profile_admin_fields short-circuits when auth.uid() is null (see
-- migration 0014), so cascade updates run from the service role pass through
-- without tripping admin checks.

begin;

update public.pledge_classes set name = 'PC ''18.2' where name = 'PC ''18';
update public.pledge_classes set name = 'PC ''18'   where name = 'PC ''17';
update public.pledge_classes set name = 'PC ''17'   where name = 'PC ''16';
update public.pledge_classes set name = 'PC ''16'   where name = 'PC ''15';
update public.pledge_classes set name = 'PC ''15'   where name = 'PC ''14';
update public.pledge_classes set name = 'PC ''14'   where name = 'PC ''13';
update public.pledge_classes set name = 'PC ''13'   where name = 'PC ''12';
update public.pledge_classes set name = 'PC ''12'   where name = 'PC ''11';
update public.pledge_classes set name = 'PC ''11'   where name = 'PC ''10';
update public.pledge_classes set name = 'PC ''10'   where name = 'PC ''09';
update public.pledge_classes set name = 'PC ''09'   where name = 'PC ''08';
update public.pledge_classes set name = 'PC ''08'   where name = 'PC ''07';
update public.pledge_classes set name = 'PC ''07'   where name = 'PC ''06';

-- PC '06 should now be empty (everyone shifted to PC '07). Only drop if so.
delete from public.pledge_classes
where name = 'PC ''06'
  and not exists (
    select 1 from public.profiles where pledge_class = 'PC ''06'
  );

commit;
