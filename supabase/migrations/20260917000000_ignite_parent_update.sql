-- Ignite Youth 2027 parent & family update form.
--
-- The intake form is temporary (see lib/ignite-form.ts) but the data is not —
-- closing the form never removes rows. One row in ignite_families per submitted
-- household, many rows in ignite_children per family.
--
-- This data concerns MINORS. RLS is enabled with deliberately NO policies, so
-- anon and authenticated PostgREST clients can neither read nor write it and
-- changing an id in the browser reaches nothing. The public form writes through
-- a Server Action using the service-role key, and the admin inbox reads the same
-- way — the same doctrine as visitors / feedback / prayer_requests in the init
-- migration.

------------------------------------------------------------------
-- Families (one row per submission)
------------------------------------------------------------------
create table if not exists public.ignite_families (
  id                           uuid primary key default gen_random_uuid(),

  -- Primary parent/guardian.
  guardian_name                text not null,
  guardian_relationship        text not null,
  guardian_phone               text not null,
  guardian_email               text not null,
  contact_preference           text not null
    check (contact_preference in ('text', 'email', 'flocknote', 'phone')),

  -- Additional parent/guardian. Entirely optional.
  second_guardian_name         text,
  second_guardian_relationship text,
  second_guardian_phone        text,
  second_guardian_email        text,

  -- Section 3 — supporting your family. Asked once per family, all optional
  -- because the same ground gets covered in the parent meeting.
  support_parents              text,
  more_of_2027                 text,
  wish_offered                 text,
  could_improve                text,

  -- Section 4 — parent involvement. volunteer_interest is null when the parent
  -- skipped the question; the two arrays stay empty unless they answered
  -- 'yes' or 'maybe'. The *_other columns hold the free text behind "Other".
  volunteer_interest           text
    check (volunteer_interest in ('yes', 'maybe', 'not_now')),
  volunteer_areas              text[] not null default '{}',
  volunteer_areas_other        text,
  participation_helps          text[] not null default '{}',
  participation_helps_other    text,

  -- Section 5.
  anything_else                text,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

------------------------------------------------------------------
-- Children (many per family)
------------------------------------------------------------------
-- sort_order preserves the order the parent entered them so the admin roster
-- and CSV read the way the family filled it out.
create table if not exists public.ignite_children (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.ignite_families(id) on delete cascade,
  sort_order      smallint not null default 0,

  full_name       text not null,
  date_of_birth   date not null,
  grade           text not null,
  school          text,
  tshirt_size     text,

  interests       text not null,
  spiritual_needs text not null,
  support_notes   text,

  -- Optional and volunteered by the parent only. The form tells them to share
  -- just what Ignite leadership needs in order to safely support their child.
  health_notes    text,

  created_at      timestamptz not null default now()
);

create index if not exists ignite_families_created_at_idx
  on public.ignite_families (created_at desc);

create index if not exists ignite_children_family_id_idx
  on public.ignite_children (family_id, sort_order);

------------------------------------------------------------------
-- Row-Level Security
------------------------------------------------------------------
alter table public.ignite_families enable row level security;
alter table public.ignite_children enable row level security;

-- Deliberately no policies at all — not even a public insert. Submissions and
-- admin reads both go through the service-role key, which bypasses RLS.

------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------
create or replace function public.set_ignite_families_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ignite_families_set_updated_at on public.ignite_families;
create trigger ignite_families_set_updated_at
  before update on public.ignite_families
  for each row execute function public.set_ignite_families_updated_at();
