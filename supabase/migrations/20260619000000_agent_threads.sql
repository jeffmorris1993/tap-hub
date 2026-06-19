-- Per-channel conversation memory for the LLM admin agent.
-- thread_key identifies the conversation:
--   chat:  Google Chat space ID (e.g. "spaces/AAA1234")
--   sms:   phone number (E.164)
--   email: in-reply-to / thread-id header
--   web:   sender's email + session, when used

create table public.agent_threads (
  id          uuid primary key default gen_random_uuid(),
  channel     agent_channel not null,
  thread_key  text not null,
  messages    jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (channel, thread_key)
);

create index agent_threads_updated_at_idx on public.agent_threads (updated_at desc);

alter table public.agent_threads enable row level security;
-- No public-read policy. Writes via service role only.
