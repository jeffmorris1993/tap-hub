-- handle_new_user() only read raw_user_meta_data->>'full_name', which is what
-- the password signup form sets.
--
-- Verified against a real Google sign-in on 2026-10-31: Supabase's Google
-- provider writes BOTH 'name' and 'full_name' (alongside avatar_url, picture,
-- custom_claims, iss, provider_id, sub). So 'full_name' alone would in fact
-- have been enough for Google — but the coalesce below costs nothing and stops
-- the next provider we add from silently producing nameless profiles.
--
-- Note this trigger does NOT fire when Google links onto an existing account
-- (it is AFTER INSERT ON auth.users, and linking only inserts into
-- auth.identities). That is what keeps a hand-set full_name from being
-- overwritten by the Google display name — confirmed in the same test.
--
-- Also hardened: a user with no email (phone-only, or a provider that withheld
-- it) would previously abort the INSERT on the profiles.email NOT NULL
-- constraint. An AFTER INSERT trigger that raises aborts the auth.users insert
-- too, which the person experiences as "sign-in is broken" with no clue why.
-- Skipping the profile is the safer failure: lib/portal-auth.ts already falls
-- back to a member-shaped profile when no row exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
  v_name  text;
begin
  if v_email is null then
    return new;
  end if;

  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(concat_ws(' ',
      new.raw_user_meta_data ->> 'given_name',
      new.raw_user_meta_data ->> 'family_name')), '')
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, v_email, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill the accounts that already exist and never got a name.
update public.profiles p
set full_name = coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(concat_ws(' ',
        u.raw_user_meta_data ->> 'given_name',
        u.raw_user_meta_data ->> 'family_name')), '')
    ),
    updated_at = now()
from auth.users u
where u.id = p.id
  and p.full_name is null
  and coalesce(
        nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
        nullif(btrim(concat_ws(' ',
          u.raw_user_meta_data ->> 'given_name',
          u.raw_user_meta_data ->> 'family_name')), '')
      ) is not null;
