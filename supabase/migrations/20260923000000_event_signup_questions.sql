-- Per-event custom signup questions, keyed by role. Empty object = the
-- default name/contact/notes form (all existing events keep it).
-- Shape: { "attendee": SignupField[], "volunteer": SignupField[] }
alter table public.events
  add column signup_questions jsonb not null default '{}'::jsonb;

-- Answer snapshot [{ "id", "label", "value" }, ...]. Labels are stored at
-- submit time so later question edits never rewrite what someone answered.
-- attendance: the universal "attending for sure?" on attendee RSVPs;
-- null for volunteer rows and pre-feature signups.
alter table public.event_signups
  add column responses jsonb,
  add column attendance text check (attendance in ('yes', 'maybe'));

-- The portal web UI logs agent runs with channel 'web', but the enum never
-- gained that value, so those inserts have been failing silently.
alter type agent_channel add value if not exists 'web';
