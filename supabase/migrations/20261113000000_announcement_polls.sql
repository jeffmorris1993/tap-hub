-- Poll announcements + homepage hero pinning.
--
-- An announcement can now carry a poll: 2-8 options, a voting window, and
-- watcher emails who receive the results when the window closes. Polls ride
-- the existing draft -> pending -> approved pipeline unchanged.
--
-- Design notes:
--  * poll_closes_at is deliberately separate from expires_at. Expiry hides
--    the card entirely, but a closed poll must stay visible showing its
--    results (the form defaults expires_at to close + 7 days).
--  * hero rides alongside pinned rather than replacing it: pinned = top of
--    the announcements feed (existing behavior, untouched), hero = the big
--    homepage card slot the Ignite Parent Form occupies today.
--  * poll_votes.voter_key is the sha256 of a random per-device cookie token;
--    unique (announcement_id, voter_key) is the one-vote-per-device rule.
--    ip_hash is a soft rate-limit signal only. The church shares one Wi-Fi
--    IP, so IP must never be used for dedup.

alter table public.announcements
  add column kind text not null default 'standard'
    constraint announcements_kind_check check (kind in ('standard', 'poll')),
  add column hero boolean not null default false,
  add column poll_closes_at timestamptz,
  add column poll_notify_emails text[],
  add column poll_results_sent_at timestamptz;

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  position smallint not null default 0,
  unique (announcement_id, position)
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  voter_key text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (announcement_id, voter_key)
);

create index poll_votes_announcement_idx
  on public.poll_votes (announcement_id, option_id);
-- Serves the per-IP burst rate limit (recent votes on one poll from one IP).
create index poll_votes_ip_recent_idx
  on public.poll_votes (announcement_id, ip_hash, created_at);

alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Options are public-read (parity with the announcements read policy).
-- Votes are anonymous and never leave the server: no policies at all, so
-- only the service-role client can read them and only aggregates ship out.
create policy "poll_options_public_read" on public.poll_options
  for select using (true);
