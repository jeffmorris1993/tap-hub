-- Optional "anything we should know?" field on event signups. Used by
-- volunteers to share availability (e.g. "I can do Jun 25 and Jun 29"),
-- by attendees to flag dietary needs / kids' ages / etc. Free-form,
-- short.

alter table public.event_signups
  add column if not exists notes text;
