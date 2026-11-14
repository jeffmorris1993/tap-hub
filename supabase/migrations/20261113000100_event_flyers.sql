-- Event flyers with two-phase approval.
--
-- Every event can carry a flyer: the creator either uploads a finished one
-- (reviewed together with the event details in the normal approval round) or
-- requests one from the design team. A requested flyer adds a second round:
-- details approved -> designer uploads + submits -> pastors approve the
-- flyer -> event publishes.
--
-- Design notes:
--  * flyer_status is deliberately separate from approval_status. The pending
--    queue, edit-locking, and the existing approval emails all key off
--    approval_status; the publish invariant enforced in the actions is:
--      published = true  requires  approval_status = 'approved'
--                                  AND (flyer_mode = 'none' OR flyer_status = 'approved')
--  * The event-flyers bucket is PUBLIC: flyers are marketing assets meant to
--    be shared to Facebook/Instagram and downloaded, which needs stable
--    non-expiring URLs (signed URLs break shared posts). Writes still go
--    through the service role only - no storage.objects policies, same as
--    feedback-photos. A not-yet-approved flyer is reachable at an
--    unguessable UUID path; acceptable for content destined to be public.

alter table public.events
  add column flyer_mode text not null default 'none'
    constraint events_flyer_mode_check check (flyer_mode in ('none', 'uploaded', 'requested')),
  add column flyer_status text not null default 'none'
    constraint events_flyer_status_check
      check (flyer_status in ('none', 'awaiting_design', 'submitted', 'approved', 'rejected')),
  add column flyer_path text,
  add column flyer_request_notes text,
  add column flyer_notes text,
  add column flyer_uploaded_by text,
  add column flyer_submitted_at timestamptz,
  add column flyer_reviewed_by text,
  add column flyer_reviewed_at timestamptz;

insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do nothing;

-- The design team is a capability, not a role: 'flyer' unlocks the
-- /portal/flyers queue and flyer uploads without any other admin powers
-- (pastoral implicitly holds every capability, covering vacations).
alter table public.profiles drop constraint profiles_capabilities_known;
alter table public.profiles add constraint profiles_capabilities_known
  check (capabilities <@ array['welcome', 'flyer']::text[]);
