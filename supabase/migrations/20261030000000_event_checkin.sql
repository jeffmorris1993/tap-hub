-- Arrival check-in for events.
--
-- An event's check-in window IS a checkin_services row — a one-off owned by
-- the event — rather than a parallel event_checkins stack. Everything
-- downstream then works unchanged: the public /checkin flow, remembered-device
-- taps, guest connect cards, the /portal/attendance reports, and the
-- checkin_summary_sends cron.
--
-- Note the one piece of math this deliberately stays out of: heldSundayDates()
-- and the attendance trend filter to kind = 'recurring' with day_of_week = 0,
-- so an event occurrence can never enter the member follow-up streaks.
--
-- Event rows are kind = 'oneoff' with service_date set and day_of_week null,
-- which checkin_services_shape already allows — no constraint change needed.

alter table public.checkin_services
  add column event_id uuid references public.events (id) on delete cascade;

-- One window per event occurrence, so a weekly event can be opened for each
-- date it runs while an upsert stays idempotent. Partial, because the standing
-- Sunday/Wednesday services have no event and must not collide.
create unique index checkin_services_event_idx
  on public.checkin_services (event_id, service_date)
  where event_id is not null;

create index checkin_services_event_lookup_idx
  on public.checkin_services (event_id)
  where event_id is not null;

-- Anonymous walk-ins: someone at the door who can't or won't check in on a
-- phone. One row per tap rather than a counter column, so the display screen's
-- Undo removes exactly the last one and a miscount is correctable without ever
-- touching a named check-in.
--
-- Kept out of public.checkins on purpose: that table's attendee_id is NOT NULL
-- and its attendee_type drives the member/regular/first/returning breakdown.
-- Folding nameless arrivals in there would quietly break both.
create table public.checkin_walkins (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references public.checkin_services (id) on delete cascade,
  occurrence_date date not null,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index checkin_walkins_occurrence_idx
  on public.checkin_walkins (service_id, occurrence_date);

-- Service-role only, like the rest of the schema.
alter table public.checkin_walkins enable row level security;
