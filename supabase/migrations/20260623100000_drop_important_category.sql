-- "Important" is no longer a category — urgency is now expressed by the
-- existing pinned flag. Move any existing Important rows to Ministry
-- and pin them so they keep the same prominence on the public page.

update public.announcements
  set category = 'Ministry', pinned = true
  where category = 'Important';

alter table public.announcements
  drop constraint if exists announcements_category_check;

alter table public.announcements
  add constraint announcements_category_check
  check (category in ('Ministry', 'Facilities', 'Event'));
