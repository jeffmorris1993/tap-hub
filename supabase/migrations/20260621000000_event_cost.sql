-- Cost shown on the event detail page when set. Free-form so we can
-- describe tiered/donation/free-will pricing without a complex schema.
-- Null or empty = "free, don't show a cost row".

alter table public.events
  add column cost text;
