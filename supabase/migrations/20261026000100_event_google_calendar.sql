-- Tracks the Google Calendar event id so publish/edit/unpublish can sync.
alter table public.events
  add column google_calendar_event_id text;
