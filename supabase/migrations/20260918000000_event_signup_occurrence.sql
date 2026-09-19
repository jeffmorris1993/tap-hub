-- Per-occurrence signups: a signup can now target one date of a recurring
-- series. Null means the whole series (legacy rows) or a one-off event.
alter table public.event_signups
  add column occurrence_date date;

create index event_signups_event_occurrence_idx
  on public.event_signups (event_id, occurrence_date);
