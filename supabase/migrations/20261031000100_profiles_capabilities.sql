-- Capabilities: narrow grants that don't fit the three-value role ladder.
--
-- The welcome team needs to see guest connect cards and who's visiting on a
-- Sunday, but nothing else pastoral carries — not member absence tracking, not
-- member contact details, not prayer requests, not approvals. Promoting them to
-- 'lead' would hand over Events and Announcements instead; promoting them to
-- 'pastoral' would hand over everything. So: role stays what it is, and a
-- capability is added alongside it.
--
-- Fed by the portal-welcome@nehtemple.org Workspace group and re-applied on
-- every Google sign-in, with a manual override at /portal/users.
alter table public.profiles
  add column if not exists capabilities text[] not null default '{}';

-- Keep the column honest: 'welcome' is the only capability that exists today,
-- and a typo in the group map should fail loudly rather than grant nothing
-- silently. Widen this list when a second capability is added.
alter table public.profiles
  add constraint profiles_capabilities_known
  check (capabilities <@ array['welcome']::text[]);

-- Same reasoning as profiles_staff_domain_check: capabilities expose other
-- people's contact details, so they require a church address. Defense in depth
-- behind the app-level check in lib/portal-auth.ts.
alter table public.profiles
  add constraint profiles_capabilities_domain
  check (cardinality(capabilities) = 0 or email like '%@nehtemple.org');
