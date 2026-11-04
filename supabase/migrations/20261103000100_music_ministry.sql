-- Add Music to the shared audience taxonomy (Youth / Sisterhood / Brotherhood /
-- Marriage / Music / General) so the music ministry can have its own leads,
-- events, and announcements. The portal-music-leads@nehtemple.org Workspace
-- group maps to lead:Music via PORTAL_ROLE_GROUPS.
--
-- Categories are text + check (not enums) precisely so this is a constraint
-- swap, not an enum migration. Tables are small; the re-validate scan is cheap.

alter table public.events
  drop constraint events_category_check;
alter table public.events
  add constraint events_category_check
  check (category in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'Music', 'General'));

alter table public.announcements
  drop constraint announcements_category_check;
alter table public.announcements
  add constraint announcements_category_check
  check (category in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'Music', 'General'));

alter table public.prayer_requests
  drop constraint prayer_requests_ministry_check;
alter table public.prayer_requests
  add constraint prayer_requests_ministry_check
  check (ministry in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'Music', 'General'));

alter table public.feedback
  drop constraint feedback_ministry_check;
alter table public.feedback
  add constraint feedback_ministry_check
  check (ministry in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'Music', 'General'));
