-- Seed data ported from the Claude Design prototype.

-- Sunday schedule
insert into public.schedule_today (day_of_week, kind, label, starts_at_minutes, duration_minutes, location) values
  (0, 'prayer',        'Morning Prayer',       600, 30,  'Main Sanctuary'),
  (0, 'sunday_school', 'Christian Education',  630, 60,  'Sunday School · all ages'),
  (0, 'fellowship',    'Fellowship',           690, 30,  'Fellowship Hall · coffee & connect'),
  (0, 'worship',       'Worship Service',      720, 105, 'Main Sanctuary');

-- This week
insert into public.week_lookahead (day_label, title, detail, sort_order) values
  ('Wed', 'Bible Class',             '7:00 PM · Main Sanctuary',    0),
  ('Fri', 'Ignite Youth Night',      '7:00 PM · Youth Hall',        1),
  ('Sat', 'Men''s Prayer Breakfast', '8:30 AM · Fellowship Hall',   2);

-- Kids programs
insert into public.kids_programs (age_group, name, detail, sort_order) values
  ('0–3',   'Nursery',      'Loving care during all services · Room A',     0),
  ('4–11',  'Kids Church',  'Sundays 12 PM · Room B · worship + lesson',    1),
  ('12–18', 'Ignite Youth', 'Sun 10:30 AM & Wed 7 PM · Youth Hall',         2);

-- Parent resources (icon_key maps to inline SVG paths in components/parent-resource-icons)
insert into public.parent_resources (title, sub, icon_key, sort_order) values
  ('This Week''s Take-Home', 'Lesson + verse',     'book',         0),
  ('Check-In & Safety',      'How drop-off works', 'shield-check', 1),
  ('Family Devotional',      'Daily at home',      'family',       2),
  ('Ignite Newsletter',      'Youth updates',      'envelope',     3);

-- Today's Ignite lesson (placeholder until staff update via admin/agent)
insert into public.kids_lesson (lesson_date, topic, reference, teacher) values
  (current_date, 'The Armor of God', 'Ephesians 6:10–18', 'Standing firm in faith · Led by the Ignite team');

-- Events
insert into public.events (slug, title, description_long, category, starts_at, ends_at, location) values
  ('summer-discovery-2026',  'Summer Discovery Program 2026',
   'A week of faith, learning, and fun for kids and youth. Daily worship, crafts, games, Bible lessons, and lifelong friendships. Volunteers needed for check-in, crafts, snacks, and group leaders.',
   'Community', '2026-07-13 09:00-04', '2026-07-17 13:00-04', 'Family Life Center'),

  ('a-night-of-worship',     'A Night of Worship',
   'An evening set apart for praise, prayer, and encountering the presence of God together as one family. Come early for prayer at 6:30 PM. Worship team and tech volunteers welcome.',
   'Worship', '2026-02-27 19:00-05', null, 'Main Sanctuary'),

  ('ignite-youth-takeover',  'Ignite Youth Takeover',
   'A high-energy night just for our youth — worship, food, games, fellowship, and a powerful word. Bring a friend! Adult chaperones and kitchen help needed.',
   'Youth', '2026-03-14 17:00-04', null, 'Youth Hall'),

  ('community-outreach-day', 'Community Outreach Day',
   'Serving our Madison Heights neighbors with food, prayer, and the tangible love of Christ. We need volunteers for food distribution, setup, prayer teams, and cleanup.',
   'Community', '2026-04-11 10:00-04', null, 'Madison Heights'),

  ('resurrection-sunday',    'Resurrection Sunday',
   'Celebrate the risen Savior with us. A glorious morning of worship, the Word, and family. Greeters, ushers, and hospitality volunteers make the day special.',
   'Worship', '2026-04-05 12:00-04', null, 'Main Sanctuary');
