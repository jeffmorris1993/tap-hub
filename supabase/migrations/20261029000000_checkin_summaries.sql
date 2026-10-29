-- Check-in summary emails: once a window closes, the cron route emails the
-- configured recipients the occurrence's attendance metrics. This table is
-- the idempotency log — one summary per (service, occurrence), ever.
create table public.checkin_summary_sends (
  service_id uuid not null references public.checkin_services (id) on delete cascade,
  occurrence_date date not null,
  recipients text[] not null default '{}',
  sent_at timestamptz not null default now(),
  primary key (service_id, occurrence_date)
);

-- Service-role only, like the other attendance tables (no policies).
alter table public.checkin_summary_sends enable row level security;

-- Make "checkin" a routable notification kind (configured at /portal/notifications).
alter table public.notification_routes drop constraint if exists notification_routes_kind_check;
alter table public.notification_routes
  add constraint notification_routes_kind_check check (kind in ('prayer', 'feedback', 'checkin'));
