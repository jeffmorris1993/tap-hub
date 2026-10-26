-- Prayer requests choose who may see them: the Bishop alone, or the Bishop plus
-- the pastoral team. The ministry column stays for legacy rows and lead scoping;
-- the public form no longer collects it (new rows keep the 'General' default).
alter table public.prayer_requests
  add column visibility text not null default 'pastoral'
    check (visibility in ('bishop', 'pastoral'));
