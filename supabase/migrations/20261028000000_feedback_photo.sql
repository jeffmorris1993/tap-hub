-- Optional photo attached to a feedback submission (e.g. a bug screenshot
-- for the "NT Gateway Improvement" topic). photo_path points into the
-- private feedback-photos storage bucket; uploads and reads both go through
-- the service-role client (signed URLs for staff), so no storage.objects
-- policies are added and anonymous clients can't touch the bucket.

alter table public.feedback add column photo_path text;

insert into storage.buckets (id, name, public)
values ('feedback-photos', 'feedback-photos', false)
on conflict (id) do nothing;
