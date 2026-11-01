-- Sunday Worship check-in now opens at 11:30 AM instead of 11:00.
--
-- This hands off cleanly from Sunday School, which closes at 11:30: the window
-- test in openServicesNow() is half-open (minutes >= opens and minutes <
-- closes), so 11:30 is the first open minute for Worship and the first closed
-- minute for Sunday School. Exactly one window is open at the boundary -- no
-- gap, and no longer any overlap between the two.
--
-- Service time (12:00 PM) and close (2:00 PM) are unchanged.
update public.checkin_services
set opens_minutes = 690
where name = 'Sunday Worship'
  and kind = 'recurring';
