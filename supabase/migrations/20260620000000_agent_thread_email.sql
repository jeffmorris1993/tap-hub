-- Track which staff member owns each agent thread so we can push proactive
-- messages (e.g. approval pings) into the right Chat space without
-- waiting for them to initiate a conversation.

alter table public.agent_threads
  add column participant_email text;

create index if not exists agent_threads_participant_email_idx
  on public.agent_threads (participant_email)
  where participant_email is not null;
