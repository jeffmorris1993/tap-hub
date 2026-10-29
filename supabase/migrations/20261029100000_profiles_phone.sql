-- Phone on the portal profile, shown on /portal/profile and editable by the
-- account owner. Digits-only by convention (same as attendees.phone).
alter table public.profiles add column if not exists phone text;
