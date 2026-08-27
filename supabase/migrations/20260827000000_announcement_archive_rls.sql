-- Announcements with no explicit expiry auto-archive 14 days after creation.
-- The app filters this in lib/announcements.ts (service-role reads bypass
-- RLS); this policy keeps the anon-read layer in agreement.
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_public_read"
  on public.announcements for select
  using (
    published = true
    and approval_status = 'approved'
    and (expires_at is null or expires_at > now())
    and (expires_at is not null or created_at > now() - interval '14 days')
  );
