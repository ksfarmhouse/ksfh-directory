-- Adds a third employment status, 'student', for active members still in
-- undergrad. Students reuse university + grad_year (now treated as expected
-- grad year for both 'student' and 'postgrad') and add year_in_school.

alter table public.profiles
  drop constraint if exists profiles_employment_status_check;

alter table public.profiles
  add constraint profiles_employment_status_check
    check (employment_status in ('employed', 'postgrad', 'student'));

alter table public.profiles
  add column if not exists year_in_school text
    check (year_in_school is null or year_in_school in (
      'Freshman', 'Sophomore', 'Junior', 'Senior'
    ));
