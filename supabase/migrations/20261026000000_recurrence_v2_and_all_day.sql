-- Recurrence v2: Google-Calendar-like options (multiple weekdays, repeat-every-N,
-- end-after-N-occurrences) plus all-day events.
--
-- The legacy recurrence_byday column and the biweekly/weekdays enum values stay in
-- place (removing enum values is painful); code stops reading/writing them and they
-- can be dropped in a later cleanup migration.

alter table public.events
  add column recurrence_interval smallint not null default 1
    check (recurrence_interval between 1 and 12),
  add column recurrence_bydays smallint[]
    check (recurrence_bydays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  add column recurrence_count smallint
    check (recurrence_count between 1 and 500),
  add column all_day boolean not null default false;

-- Existing rows map losslessly onto the new shape.
update public.events
  set recurrence_bydays = array[recurrence_byday]
  where recurrence_byday is not null;

update public.events
  set recurrence_kind = 'weekly', recurrence_interval = 2
  where recurrence_kind = 'biweekly';

update public.events
  set recurrence_kind = 'weekly', recurrence_bydays = array[1, 2, 3, 4, 5]::smallint[]
  where recurrence_kind = 'weekdays';
