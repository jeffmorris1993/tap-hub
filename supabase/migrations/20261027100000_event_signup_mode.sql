-- Some events collect signups that aren't attendance RSVPs — people are
-- committing to participate (gifting, contributing, serving) rather than
-- saying "I'll be there." signup_mode switches the public form's wording
-- and drops the "attending for sure?" question for those events.

alter table public.events
  add column signup_mode text not null default 'attend'
    check (signup_mode in ('attend', 'participate'));

-- Adopt-A-Family signups track who is gifting, not who is coming.
update public.events
  set signup_mode = 'participate'
  where slug = 'ignite-youth-adopt-a-family';
