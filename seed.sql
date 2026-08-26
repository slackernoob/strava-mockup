-- Re-runnable seed: wipes all data and restores the demo state.
-- Local:  npm run db:seed
-- Remote: npm run db:seed:remote

DELETE FROM kudos;
DELETE FROM run_attendees;
DELETE FROM runs;
DELETE FROM club_members;
DELETE FROM clubs;
DELETE FROM users;

INSERT INTO users (id, name) VALUES
  (1, 'Alice'),
  (2, 'Ben'),
  (3, 'Chloe'),
  (4, 'Devi'),
  (5, 'Ethan'),
  (6, 'Farah'),
  (7, 'Gabe'),
  (8, 'Hana'),
  (9, 'Ivan'),
  (10, 'June');

INSERT INTO clubs (id, name, created_by) VALUES
  (1, 'East Side Runners', 1),
  (2, 'Morning Milers', 6);

INSERT INTO club_members (club_id, user_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4),
  (2, 6), (2, 7), (2, 8), (2, 1);

-- Completed runs (in the past relative to seeding time)
INSERT INTO runs (id, club_id, host_id, title, starts_at, location, distance_km, pace, description) VALUES
  (1, 1, 1, 'Saturday Long Run', unixepoch('now', '-3 days'), 'Bedok Reservoir carpark B', 10, '6:30/km, no-drop', 'Easy long run, hydration stop at the 5km mark.'),
  (2, 2, 6, 'Dawn Patrol 5K', unixepoch('now', '-1 day'), 'Marina Barrage', 5, '5:30/km', NULL);

INSERT INTO run_attendees (run_id, user_id) VALUES
  (1, 1), (1, 2), (1, 3),
  (2, 6), (2, 7), (2, 8);

INSERT INTO kudos (run_id, user_id) VALUES
  (1, 4), (1, 6), (1, 7),
  (2, 1), (2, 2);

-- Upcoming runs (in the future relative to seeding time)
INSERT INTO runs (id, club_id, host_id, title, starts_at, location, distance_km, pace, description) VALUES
  (3, 1, 2, 'Tuesday Track Intervals', unixepoch('now', '+2 days'), 'Kallang Practice Track', 8, '4:50/km reps', '6x800m with 200m jog recovery.'),
  (4, 2, 6, 'Sunrise Milers Social', unixepoch('now', '+5 days'), 'East Coast Park C2', 6, 'Conversational', 'Coffee after!');

INSERT INTO run_attendees (run_id, user_id) VALUES
  (3, 2), (3, 1),
  (4, 6), (4, 8);
