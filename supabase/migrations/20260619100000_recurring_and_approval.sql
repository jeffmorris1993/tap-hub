-- Phase 5: recurring events, approval workflow, and the standard weekly schedule.

------------------------------------------------------------------
-- Recurring events
------------------------------------------------------------------
create type recurrence_kind as enum ('none', 'weekly', 'biweekly', 'monthly');

alter table public.events
  add column recurrence_kind recurrence_kind not null default 'none',
  add column recurrence_byday smallint check (recurrence_byday between 0 and 6),
  add column recurrence_until date;

comment on column public.events.recurrence_byday is
  '0=Sunday … 6=Saturday. Used for weekly/biweekly recurrences; null otherwise.';

------------------------------------------------------------------
-- Approval workflow
------------------------------------------------------------------
create type approval_status as enum ('draft', 'pending', 'approved', 'rejected');

alter table public.events
  add column approval_status approval_status not null default 'pending',
  add column approval_notes text,
  add column submitted_by text,
  add column reviewed_by text,
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz;

-- Grandfather existing events: anything that was already published has been
-- effectively "approved" by virtue of being live. Mark them as such so they
-- don't disappear when we tighten the public-read RLS below.
update public.events
  set approval_status = 'approved',
      reviewed_by = 'system',
      reviewed_at = now()
  where published = true;

-- Tighten public-read: visitors only see approved + published events.
drop policy if exists "public read events" on public.events;
create policy "public read events"
  on public.events for select to anon, authenticated
  using (published and approval_status = 'approved');

------------------------------------------------------------------
-- Standard weekly schedule (Mon–Fri morning prayer, Mon Zoom prayer,
-- Wed Bible Class). Sunday rows were seeded in the initial migration.
------------------------------------------------------------------
insert into public.schedule_today
  (day_of_week, kind, label, starts_at_minutes, duration_minutes, location)
select v.day_of_week, v.kind::schedule_kind, v.label, v.starts_at_minutes, v.duration_minutes, v.location
from (values
  -- Mon-Fri 7:00 AM morning prayer (conference call)
  (1, 'prayer',  'Morning Prayer',              420,  30, 'Conference Call'),
  (2, 'prayer',  'Morning Prayer',              420,  30, 'Conference Call'),
  (3, 'prayer',  'Morning Prayer',              420,  30, 'Conference Call'),
  (4, 'prayer',  'Morning Prayer',              420,  30, 'Conference Call'),
  (5, 'prayer',  'Morning Prayer',              420,  30, 'Conference Call'),
  -- Mon 8:00 PM prayer (Zoom)
  (1, 'special', 'Evening Prayer',             1200,  60, 'Zoom'),
  -- Wed 7:00 PM Adult & Youth Bible Class (Sanctuary)
  (3, 'midweek', 'Adult & Youth Bible Class',  1140,  90, 'Main Sanctuary')
) as v(day_of_week, kind, label, starts_at_minutes, duration_minutes, location)
where not exists (
  select 1 from public.schedule_today s
  where s.day_of_week = v.day_of_week
    and s.label = v.label
);
