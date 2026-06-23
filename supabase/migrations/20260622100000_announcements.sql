-- One-off announcements. Event-derived announcements come from the
-- `events` table on the read side; this table is for everything else
-- (Important / Ministry / Facilities, plus manually-curated Event posts
-- that don't map to a row in `events`).
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('Important', 'Ministry', 'Facilities', 'Event')),
  title       text not null,
  body        text not null,
  -- Free-form display label, e.g. "Begins Sun, Mar 1 · 10:30 AM" or
  -- "Sat, Apr 11". Used in the UI verbatim.
  date_label  text,
  -- When set, the announcement auto-expires the moment this UTC
  -- timestamp passes (matches the "show until the day of the event"
  -- rule we apply to event-derived announcements). NULL means it stays
  -- visible until explicitly unpublished.
  expires_at  timestamptz,
  pinned      boolean not null default false,
  published   boolean not null default true,
  link_url    text,
  action_label text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists announcements_published_idx
  on public.announcements (published, pinned desc, created_at desc);

alter table public.announcements enable row level security;

-- Public can read published announcements only.
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_public_read"
  on public.announcements for select
  using (
    published = true
    and (expires_at is null or expires_at > now())
  );

-- Service role bypasses RLS so the admin UI / agent can manage rows.

create or replace function public.set_announcements_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_announcements_updated_at();
