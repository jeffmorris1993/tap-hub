-- Meeting-with-the-Pastor requests from the public hub form. Writes and reads
-- both go through the service-role client (submission-table house pattern), so
-- RLS is enabled with no policies. status stays 'new' until the Pastor's
-- office picks up triage; contact fields are optional but the form requires
-- at least one of phone/email.
create table public.pastor_meeting_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  details text not null,
  status text not null default 'new',
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pastor_meeting_requests enable row level security;
