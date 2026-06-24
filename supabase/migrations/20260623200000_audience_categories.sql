-- Shift announcement categories from topic-based (Ministry / Facilities /
-- Event) to audience-based (Youth / Sisterhood / Brotherhood / Marriage /
-- General). Anything that doesn't fit a specific audience lands in General
-- — admins can re-categorize in /admin/announcements.

-- Drop the old constraint first so the UPDATE below can move rows out
-- of Ministry/Facilities/Event into the new General bucket.
alter table public.announcements
  drop constraint if exists announcements_category_check;

update public.announcements
  set category = 'General'
  where category in ('Ministry', 'Facilities', 'Event');

alter table public.announcements
  add constraint announcements_category_check
  check (category in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'General'));
