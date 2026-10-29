-- Near-real-time scheduling for the check-in summary email.
--
-- Vercel Hobby only allows daily crons, so the 15-minute heartbeat lives in
-- Postgres: pg_cron calls the Next route through pg_net. The route is
-- idempotent (checkin_summary_sends), so this overlapping with the daily
-- Vercel sweeper in vercel.json is harmless — whichever fires first sends,
-- the other skips.
--
-- Prerequisite (run once, NOT stored in this file because it carries
-- secrets):
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--   select vault.create_secret('https://tap-hub.nehtemple.org', 'site_url');
-- Rotate with vault.update_secret(id, new_value).

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Fires one authenticated GET at /api/cron/checkin-summary. Reads the URL and
 * bearer token from Vault so no secret is stored in migrations or job
 * definitions. Warns (instead of failing the job) when the secrets are
 * missing, so a fresh environment doesn't produce a crash loop.
 */
create or replace function public.trigger_checkin_summary()
returns void
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  v_site_url text;
  v_secret text;
begin
  select decrypted_secret into v_site_url from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_site_url is null or v_secret is null then
    raise warning '[checkin-summary] vault secrets site_url/cron_secret missing; skipping';
    return;
  end if;

  perform net.http_get(
    url := v_site_url || '/api/cron/checkin-summary',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
end;
$$;

revoke all on function public.trigger_checkin_summary() from public, anon, authenticated;

-- cron.schedule upserts by job name, so re-running this migration is safe.
select cron.schedule(
  'checkin-summary-15m',
  '*/15 * * * *',
  $$select public.trigger_checkin_summary()$$
);
