-- Some events (e.g. conferences) take registration on a third-party site.
-- When `registration_url` is set, the public event page replaces the
-- in-app attendee form with a "Register" button that opens the external
-- URL. Volunteer signups still work in-app independently.

alter table public.events
  add column if not exists registration_url text,
  add column if not exists registration_label text;
