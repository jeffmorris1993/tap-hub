-- Configurable recipients for prayer-request and feedback email
-- notifications, edited by pastoral users at /portal/notifications.
-- An empty (or missing) recipients list means "use the default routing":
-- everyone with the pastoral role (plus PRAYER_TEAM_EMAIL for prayer).

create table public.notification_routes (
  kind text primary key check (kind in ('prayer', 'feedback')),
  recipients text[] not null default '{}',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: like the other tables, all reads and writes go
-- through service-role server code.
alter table public.notification_routes enable row level security;
