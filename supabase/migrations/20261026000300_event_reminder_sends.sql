-- Email bookkeeping for signups: when the signer-up was sent their confirmation,
-- and a per-occurrence reminder log. A log table (not a flag on the signup)
-- because a series-level signup legitimately gets one reminder per occurrence.

alter table public.event_signups
  add column confirmation_sent_at timestamptz;

create table public.event_reminder_sends (
  signup_id uuid not null references public.event_signups (id) on delete cascade,
  occurrence_date date not null, -- Detroit date of the occurrence reminded about
  sent_at timestamptz not null default now(),
  primary key (signup_id, occurrence_date)
);

-- Service-role only, like the rest of the schema.
alter table public.event_reminder_sends enable row level security;
