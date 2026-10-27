-- Check-in + attendance. Service times and check-in windows are stored as
-- Detroit-local minutes since midnight (same convention as schedule_today);
-- occurrence dates are Detroit calendar dates. Occurrences are derived in
-- app code as (service_id, occurrence_date) — recurring services have no
-- materialized occurrence rows.

create table public.checkin_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('recurring', 'oneoff')),
  day_of_week smallint check (day_of_week between 0 and 6), -- recurring only, 0 = Sunday
  service_date date,                                        -- oneoff only
  service_minutes smallint not null check (service_minutes between 0 and 1439),
  opens_minutes smallint not null check (opens_minutes between 0 and 1439),
  closes_minutes smallint not null check (closes_minutes between 0 and 1439),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_by text,
  constraint checkin_services_shape check (
    (kind = 'recurring' and day_of_week is not null and service_date is null)
    or (kind = 'oneoff' and service_date is not null and day_of_week is null)
  ),
  constraint checkin_services_window check (opens_minutes < closes_minutes)
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  attendee_type text not null check (attendee_type in ('member', 'regular', 'first', 'returning')),
  phone text,  -- digits only
  email text,  -- lowercased
  preferred_contact text check (preferred_contact in ('text', 'call', 'email')),
  contact_consent boolean not null default false,
  created_at timestamptz not null default now()
);
create index attendees_name_idx on public.attendees (lower(last_name), lower(first_name));

-- One row per device that has checked someone in. Multiple phones can map to
-- the same attendee, so "find my check-in" on a second phone never unlinks
-- the first. Only a sha256 hash of the device token is stored.
create table public.checkin_devices (
  token_hash text primary key,
  attendee_id uuid not null references public.attendees (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index checkin_devices_attendee_idx on public.checkin_devices (attendee_id);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references public.attendees (id) on delete cascade,
  service_id uuid not null references public.checkin_services (id) on delete cascade,
  occurrence_date date not null,
  -- Snapshot of the attendee's type at check-in time, so historical stats
  -- stay correct after a first-time guest upgrades to returning.
  attendee_type text not null check (attendee_type in ('member', 'regular', 'first', 'returning')),
  checked_in_at timestamptz not null default now(),
  unique (attendee_id, service_id, occurrence_date)
);
create index checkins_occurrence_idx on public.checkins (service_id, occurrence_date);
create index checkins_attendee_idx on public.checkins (attendee_id);

-- "Mark as did not occur": removes the occurrence from follow-up math and
-- closes its check-in window.
create table public.checkin_occurrence_overrides (
  service_id uuid not null references public.checkin_services (id) on delete cascade,
  occurrence_date date not null,
  did_not_occur boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (service_id, occurrence_date)
);

create table public.attendance_follow_ups (
  attendee_id uuid primary key references public.attendees (id) on delete cascade,
  status text not null check (status in ('needs', 'contacted', 'resolved', 'dismissed')),
  -- The most recent missed held Sunday when the status was set. A newer miss
  -- past this date makes the stored status display as 'needs' again.
  miss_anchor date,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Service-role only, like the rest of the schema.
alter table public.checkin_services enable row level security;
alter table public.attendees enable row level security;
alter table public.checkin_devices enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_occurrence_overrides enable row level security;
alter table public.attendance_follow_ups enable row level security;

-- The two standing services; admins adjust windows on /portal/attendance.
insert into public.checkin_services (name, kind, day_of_week, service_minutes, opens_minutes, closes_minutes) values
  ('Sunday Worship', 'recurring', 0, 720, 660, 840),          -- 12:00 PM, check-in 11:00 AM-2:00 PM
  ('Wednesday Bible Study', 'recurring', 3, 1140, 1110, 1260); -- 7:00 PM, check-in 6:30 PM-9:00 PM
