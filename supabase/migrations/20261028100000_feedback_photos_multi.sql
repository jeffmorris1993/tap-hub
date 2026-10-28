-- Feedback can carry up to 4 photos. Replace the single photo_path with an
-- array of paths into the private feedback-photos bucket. The feedback table
-- has no rows with photos yet, so no data migration is needed.

alter table public.feedback drop column photo_path;
alter table public.feedback add column photo_paths text[] not null default '{}';
