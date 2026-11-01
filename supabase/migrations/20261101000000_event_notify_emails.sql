-- Who gets the "someone signed up" email for an event.
--
-- Before this, signup notifications went to events.submitted_by alone, which
-- is wrong in two ways: submitted_by is really provenance (it also drives the
-- approval emails and the "Submitted by" line in the portal), and the person
-- who typed the event in is often not the person running it. A Brotherhood
-- event entered by media staff left the Brotherhood lead with no email at all.
--
-- notify_emails is an explicit override. When it's null/empty the resolver in
-- lib/event-notify.ts falls back to the ministry leads for the event's
-- category, then submitted_by, then the pastoral list — so a signup is never
-- unnoticed.

alter table public.events
  add column if not exists notify_emails text[];

comment on column public.events.notify_emails is
  'Explicit signup-notification recipients. Null/empty = fall back to the ministry leads for this event''s category (see lib/event-notify.ts).';

-- The fallback looks up leads by ministry on every signup. profiles is tiny,
-- but this keeps the containment check off a sequential scan as staff grows.
create index if not exists profiles_ministries_gin
  on public.profiles using gin (ministries);
