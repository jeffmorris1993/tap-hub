-- Two new recurrence kinds:
--   daily    — every day from starts_at through recurrence_until
--   weekdays — Mon-Fri only, from starts_at through recurrence_until
--
-- starts_at + ends_at define the time-of-day window per occurrence;
-- recurrence_until defines the last day of the series.

alter type recurrence_kind add value if not exists 'daily';
alter type recurrence_kind add value if not exists 'weekdays';
