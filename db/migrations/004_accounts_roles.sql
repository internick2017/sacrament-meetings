-- Accounts and roles.
--
-- The users table IS the allow-list: a magic link is only ever sent to an email
-- that already has a row here. There is no self-registration.
--
-- Only email, role and (for leaders) an organization are stored. person_id is
-- optional and is linked by hand, never matched automatically by name.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id integer REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS person_id integer REFERENCES people(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- Members sign in with a magic link and never have a password, so the column
-- that used to be mandatory has to allow nulls. The existing bishopric accounts
-- keep their hashes and keep working.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Roles are checked in the application, but the database refuses an unknown one
-- so a typo in a hand-written UPDATE cannot silently create a role nobody
-- checks for.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'leader', 'member'));

-- The existing hand-made accounts are the bishopric: promote them to admin so
-- nobody is locked out of the admin area the moment roles start being enforced.
UPDATE users SET role = 'admin' WHERE password_hash IS NOT NULL;

-- NextAuth's e-mail provider stores one row per pending magic link.
CREATE TABLE IF NOT EXISTS verification_token (
  identifier text NOT NULL,
  token      text NOT NULL,
  expires    timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);
