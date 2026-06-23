-- Whether the public event detail page shows a signup / RSVP form. When
-- false the event is informational only — visitors see when/where but
-- there's no form to fill out.
--
-- Defaults to true so existing events keep their current behavior.

alter table public.events
  add column accepts_rsvps boolean not null default true;
