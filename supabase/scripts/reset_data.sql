-- Wipe ALL data and reseed with just the standard Nehemiah's Temple weekly
-- schedule. Idempotent — safe to re-run.
--
-- Run with:
--   PGPASSWORD='...' psql -h db.qcfakwzqkltifelperep.supabase.co -U postgres \
--       -d postgres -p 5432 -v ON_ERROR_STOP=1 -f supabase/scripts/reset_data.sql

begin;

truncate table
  public.visitors,
  public.feedback,
  public.prayer_requests,
  public.event_signups,
  public.events,
  public.schedule_today,
  public.week_lookahead,
  public.kids_lesson,
  public.kids_programs,
  public.parent_resources,
  public.agent_threads,
  public.agent_runs
restart identity cascade;

-- Weekly schedule
-- day_of_week: 0=Sun … 6=Sat
-- starts_at_minutes: minutes from midnight (7 AM = 420; 12 PM = 720; etc.)
insert into public.schedule_today
  (day_of_week, kind, label, starts_at_minutes, duration_minutes, location)
values
  -- Mon–Fri 7:00 AM Morning Prayer (conference call)
  (1, 'prayer',        'Morning Prayer',       420, 30,
    'Conference Call · 605-475-4120 · access code 6206688'),
  (2, 'prayer',        'Morning Prayer',       420, 30,
    'Conference Call · 605-475-4120 · access code 6206688'),
  (3, 'prayer',        'Morning Prayer',       420, 30,
    'Conference Call · 605-475-4120 · access code 6206688'),
  (4, 'prayer',        'Morning Prayer',       420, 30,
    'Conference Call · 605-475-4120 · access code 6206688'),
  (5, 'prayer',        'Morning Prayer',       420, 30,
    'Conference Call · 605-475-4120 · access code 6206688'),
  -- Monday 8:00 PM Prayer (Zoom)
  (1, 'special',       'Evening Prayer',      1200, 60,
    'Zoom · Meeting ID 896 1772 8858 · Passcode 031145'),
  -- Wednesday 7:00 PM Bible Class
  (3, 'midweek',       'Bible Class',         1140, 90,
    'Main Sanctuary'),
  -- Sunday
  (0, 'prayer',        'Morning Prayer',       600, 30,
    'Main Sanctuary'),
  (0, 'sunday_school', 'Christian Education',  630, 60,
    'Main Sanctuary'),
  (0, 'fellowship',    'Coffee & Fellowship',  690, 30,
    'Fellowship Hall'),
  (0, 'worship',       'Worship Service',      720, 105,
    'Main Sanctuary');

commit;

-- Quick sanity check (returns 11 rows: 5 weekday prayers + 1 Mon zoom + 1 Wed bible + 4 Sunday)
select day_of_week, starts_at_minutes, label, location
  from public.schedule_today
  order by day_of_week, starts_at_minutes;
