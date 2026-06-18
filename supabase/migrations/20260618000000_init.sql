-- TapHub schema, initial migration.
-- Public-read on display tables (events, schedule_today, week_lookahead, kids_lesson,
-- kids_programs, parent_resources). All writes go through Server Actions / route
-- handlers using the service-role key.

create extension if not exists "pgcrypto";

------------------------------------------------------------------
-- Visitors ("I'm New Here")
------------------------------------------------------------------
create table public.visitors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  phone        text,
  first_time   boolean,
  interests    text[] not null default '{}',
  source       text not null default 'tap-hub',
  created_at   timestamptz not null default now()
);

------------------------------------------------------------------
-- Events + signups
------------------------------------------------------------------
create type event_category as enum ('Worship', 'Youth', 'Community');
create type signup_role as enum ('attendee', 'volunteer');

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  description_long text not null,
  category         event_category not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  location         text not null,
  cover_image_url  text,
  allow_volunteers boolean not null default true,
  published        boolean not null default true,
  created_at       timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create index events_published_idx on public.events (published) where published;

create table public.event_signups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  contact    text not null,
  role       signup_role not null,
  notes      text,
  created_at timestamptz not null default now()
);

create index event_signups_event_id_idx on public.event_signups (event_id);

------------------------------------------------------------------
-- Today schedule + week lookahead
------------------------------------------------------------------
create type schedule_kind as enum (
  'prayer', 'sunday_school', 'fellowship', 'worship', 'evening', 'midweek', 'special'
);

create table public.schedule_today (
  id                  uuid primary key default gen_random_uuid(),
  day_of_week         smallint not null check (day_of_week between 0 and 6), -- 0 = Sun
  kind                schedule_kind not null,
  label               text not null,
  starts_at_minutes   smallint not null check (starts_at_minutes between 0 and 1439),
  duration_minutes    smallint not null check (duration_minutes > 0),
  location            text not null,
  active_from         date,
  active_until        date,
  created_at          timestamptz not null default now()
);

create table public.week_lookahead (
  id           uuid primary key default gen_random_uuid(),
  day_label    text not null,
  title        text not null,
  detail       text not null,
  sort_order   smallint not null default 0,
  active_from  date,
  active_until date,
  created_at   timestamptz not null default now()
);

------------------------------------------------------------------
-- Kids + Youth
------------------------------------------------------------------
create table public.kids_lesson (
  id          uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  topic       text not null,
  reference   text not null,
  teacher     text not null,
  body_md     text,
  created_at  timestamptz not null default now()
);

create table public.kids_programs (
  id         uuid primary key default gen_random_uuid(),
  age_group  text not null,
  name       text not null,
  detail     text not null,
  sort_order smallint not null default 0
);

create table public.parent_resources (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  sub        text not null,
  icon_key   text not null,
  url        text,
  sort_order smallint not null default 0
);

------------------------------------------------------------------
-- Feedback + Prayer
------------------------------------------------------------------
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  rating     smallint check (rating between 0 and 5),
  category   text not null,
  name       text,
  message    text not null,
  created_at timestamptz not null default now()
);

create table public.prayer_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  contact      text,
  request      text not null,
  confidential boolean not null default true,
  prayer_wall  boolean not null default false,
  created_at   timestamptz not null default now()
);

------------------------------------------------------------------
-- LLM admin agent audit
------------------------------------------------------------------
create type agent_channel as enum ('sms', 'email', 'chat');

create table public.agent_runs (
  id         uuid primary key default gen_random_uuid(),
  channel    agent_channel not null,
  sender     text not null,
  input      text not null,
  tool_calls jsonb,
  output     text,
  status     text not null default 'ok',
  created_at timestamptz not null default now()
);

create index agent_runs_created_at_idx on public.agent_runs (created_at desc);

------------------------------------------------------------------
-- Row-Level Security
------------------------------------------------------------------
alter table public.visitors        enable row level security;
alter table public.events          enable row level security;
alter table public.event_signups   enable row level security;
alter table public.schedule_today  enable row level security;
alter table public.week_lookahead  enable row level security;
alter table public.kids_lesson     enable row level security;
alter table public.kids_programs   enable row level security;
alter table public.parent_resources enable row level security;
alter table public.feedback        enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.agent_runs      enable row level security;

-- Public-read display tables (anon role allowed).
create policy "public read events"
  on public.events for select to anon, authenticated
  using (published);

create policy "public read schedule_today"
  on public.schedule_today for select to anon, authenticated
  using (true);

create policy "public read week_lookahead"
  on public.week_lookahead for select to anon, authenticated
  using (true);

create policy "public read kids_lesson"
  on public.kids_lesson for select to anon, authenticated
  using (true);

create policy "public read kids_programs"
  on public.kids_programs for select to anon, authenticated
  using (true);

create policy "public read parent_resources"
  on public.parent_resources for select to anon, authenticated
  using (true);

-- Writes are NEVER from anon. Server Actions use the service-role key which
-- bypasses RLS, so we deliberately add no write policies for visitors, signups,
-- feedback, prayer_requests, or agent_runs.
