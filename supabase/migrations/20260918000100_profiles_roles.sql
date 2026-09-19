-- Member / lead / pastoral portal roles.
--
-- Identity stays in auth.users; this table carries the portal role and, for
-- ministry leads, which ministries they lead (values from the shared audience
-- taxonomy: Youth / Sisterhood / Brotherhood / Marriage / General).
--
-- Effective-role note: the app additionally treats EVENT_APPROVER_EMAILS as
-- pastoral (bootstrap, so the first pastoral users can assign roles without a
-- lockout) — see lib/portal-auth.ts.
create type portal_role as enum ('member', 'lead', 'pastoral');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       portal_role not null default 'member',
  ministries text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff roles require a church address. Defense-in-depth: the app also checks
-- ADMIN_ALLOWED_DOMAINS before assigning lead/pastoral. If the church ever
-- adds a second domain, drop and recreate this constraint.
alter table public.profiles
  add constraint profiles_staff_domain_check
  check (role = 'member' or email like '%@nehtemple.org');

-- Service-role only, like every other table: RLS on, no policies.
alter table public.profiles enable row level security;

-- Every auth user gets a member profile automatically.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts that already exist (current staff).
insert into public.profiles (id, email, full_name)
select id, lower(email), raw_user_meta_data ->> 'full_name'
from auth.users
where email is not null
on conflict (id) do nothing;
