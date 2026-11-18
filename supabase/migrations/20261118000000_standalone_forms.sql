-- Standalone one-off forms.
--
-- A form that lives at its own unguessable link (/f/<slug>) — not tied to an
-- announcement or an event. Admins build the questions, share the link, and
-- each submission is emailed to the form's notify list and kept here as the
-- source of truth.
--
-- Design notes:
--  * forms.slug is random hex (generated in the app with randomBytes), not a
--    readable slug: these links are "sent to folks", so unguessable-by-default
--    beats pretty. The seed below derives its slug from gen_random_uuid()
--    (pgcrypto's gen_random_bytes isn't enabled on this database).
--  * forms.fields reuses the SignupField jsonb shape from event signup
--    questions ({id,label,type,required,options?}[]), parsed defensively by
--    lib/standalone-forms.ts — a hand-edited bad value degrades, never crashes.
--  * form_submissions.responses snapshots {id,label,value}[] at submit time
--    (same doctrine as event_signups.responses), so questions can be renamed
--    or deleted without rewriting what people already answered.
--  * RLS enabled with zero policies on both tables: submissions are private,
--    and even form definitions are only fetched server-side via the service
--    role (the public page is a server component), so nothing needs anon read.

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  intro text,
  fields jsonb not null default '[]'::jsonb,
  notify_emails text[] not null default '{}',
  open boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  responses jsonb not null default '[]'::jsonb,
  -- Signed-in submitter, when there is one (future "My Forms" linking).
  user_id uuid,
  created_at timestamptz not null default now()
);

-- Serves the admin detail page: submissions for one form, newest first.
create index form_submissions_form_created_idx
  on public.form_submissions (form_id, created_at desc);

alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;

-- First form: shirt sizes for the First Lady, emailed straight to her.
insert into public.forms (slug, title, intro, fields, notify_emails)
values (
  replace(gen_random_uuid()::text, '-', ''),
  'Shirt Sizes',
  'We''re gathering sizes for a t-shirt and a button-down shirt. This takes less than a minute — thank you!',
  '[
    {"id": "full-name", "label": "Full name", "type": "text", "required": true},
    {"id": "t-shirt-size", "label": "T-shirt size", "type": "select", "required": true,
     "options": ["S", "M", "L", "XL", "2XL", "3XL", "4XL"]},
    {"id": "button-down-size", "label": "Button-down shirt size", "type": "select", "required": true,
     "options": ["S", "M", "L", "XL", "2XL", "3XL", "4XL"]}
  ]'::jsonb,
  '{firstladyjones@nehtemple.org}'
);
