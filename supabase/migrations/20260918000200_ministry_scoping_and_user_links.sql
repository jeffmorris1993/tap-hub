-- Ministry scoping for lead roles + account linkage for "My Events"/"My Forms".
--
-- prayer_requests/feedback gain a ministry tag using the same audience
-- taxonomy as events.category / announcements.category (text + check, so a
-- rename never needs an enum migration). feedback.category (topic) is
-- untouched — ministry is orthogonal to it.
alter table public.prayer_requests
  add column ministry text not null default 'General';
alter table public.prayer_requests
  add constraint prayer_requests_ministry_check
  check (ministry in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'General'));

alter table public.feedback
  add column ministry text not null default 'General';
alter table public.feedback
  add constraint feedback_ministry_check
  check (ministry in ('Youth', 'Sisterhood', 'Brotherhood', 'Marriage', 'General'));

-- Existing youth-topic feedback belongs to the Youth ministry.
update public.feedback set ministry = 'Youth' where category = 'Kids & Youth';

-- Link submissions to the signed-in account when there is one. Anonymous
-- submissions keep null — the public forms still work without an account.
alter table public.event_signups
  add column user_id uuid references auth.users (id) on delete set null;
alter table public.prayer_requests
  add column user_id uuid references auth.users (id) on delete set null;
alter table public.feedback
  add column user_id uuid references auth.users (id) on delete set null;
alter table public.visitors
  add column user_id uuid references auth.users (id) on delete set null;

create index event_signups_user_idx
  on public.event_signups (user_id) where user_id is not null;
create index prayer_requests_user_idx
  on public.prayer_requests (user_id) where user_id is not null;
create index feedback_user_idx
  on public.feedback (user_id) where user_id is not null;
create index visitors_user_idx
  on public.visitors (user_id) where user_id is not null;
