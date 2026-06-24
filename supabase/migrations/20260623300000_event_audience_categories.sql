-- Bring event categories in line with announcements:
-- audience-based Youth / Sisterhood / Brotherhood / Marriage / General.
-- Existing rows: Worship → General, Community → General, Youth stays.
--
-- We also convert the column off the old `event_category` enum onto plain
-- text + check constraint so the next category rename doesn't require an
-- enum migration.

alter table public.events
  alter column category type text using category::text;

update public.events
  set category = 'General'
  where category in ('Worship', 'Community');

alter table public.events
  add constraint events_category_check
  check (category in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'General'));

drop type if exists event_category;
