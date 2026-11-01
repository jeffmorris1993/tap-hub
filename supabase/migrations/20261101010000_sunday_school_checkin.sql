-- Sunday School check-in: Sundays, 10:30-11:30 AM Detroit.
--
-- Its window overlaps Sunday Worship's (which opens at 11:00 AM). That is a
-- supported case, not a conflict: openServicesNow() returns every open window
-- and the public /checkin page offers the choice, while the display screen's QR
-- pins one by id. Sunday School sorts first during the 11:00-11:30 overlap
-- because the sort key is service_minutes and 10:30 is earlier.
--
-- created_at is pinned to Detroit midnight today rather than left to now():
-- occursOn() compares created_at's UTC date against the Detroit occurrence
-- date, so a row inserted after ~8 PM Detroit would skip its own first Sunday.
-- Pinning to the Detroit day start makes the first occurrence today regardless
-- of the clock, without inventing "missed" history before today.
insert into public.checkin_services
  (name, kind, day_of_week, service_minutes, opens_minutes, closes_minutes, created_at)
select
  'Sunday School', 'recurring', 0, 630, 630, 690,
  date_trunc('day', timezone('America/Detroit', now())) at time zone 'America/Detroit'
where not exists (
  select 1
  from public.checkin_services
  where name = 'Sunday School' and kind = 'recurring'
);
