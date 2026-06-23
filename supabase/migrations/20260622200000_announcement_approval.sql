-- Announcements need the same approval workflow as events. Only one
-- exception (handled in code, not in this table): event-derived
-- announcements are auto-rendered from the events table, so they
-- inherit the event's approval and don't need their own gate.

alter table public.announcements
  add column if not exists approval_status approval_status not null default 'pending',
  add column if not exists approval_notes text,
  add column if not exists submitted_by text,
  add column if not exists reviewed_by text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

-- Grandfather rows created before the approval flow: anything that was
-- already published gets marked approved so it stays visible.
update public.announcements
  set approval_status = 'approved',
      reviewed_by   = coalesce(reviewed_by, 'system'),
      reviewed_at   = coalesce(reviewed_at, now())
  where approval_status = 'pending'
    and published = true;

-- Tighten public-read so visitors only see approved + published.
-- (The service-role client used by the app's read query bypasses RLS,
-- so the application also filters explicitly — both layers agree.)
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_public_read"
  on public.announcements for select
  using (
    published = true
    and approval_status = 'approved'
    and (expires_at is null or expires_at > now())
  );

create index if not exists announcements_pending_idx
  on public.announcements (approval_status, submitted_at)
  where approval_status = 'pending';
