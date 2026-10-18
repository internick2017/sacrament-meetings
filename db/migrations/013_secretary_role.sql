-- The ward secretary gets his own account role. He schedules and sees
-- interviews and nothing else: no program editing, no users, no meetings.
-- Same pattern as 004: the database refuses an unknown role.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'leader', 'member', 'secretary'));
