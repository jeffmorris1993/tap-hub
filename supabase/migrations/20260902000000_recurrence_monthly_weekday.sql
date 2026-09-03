-- New recurrence kind:
--   monthly_weekday — repeats on the same weekday-position each month,
--   derived from starts_at (an event starting on the 2nd Friday repeats
--   every 2nd Friday). recurrence_byday stays null for this kind; both
--   the weekday and the week-of-month come from the start date.
alter type recurrence_kind add value if not exists 'monthly_weekday';
