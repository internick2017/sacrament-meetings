-- The single unit this site belongs to: one ward or branch, never the whole
-- Church. It is a table and not a constants file so the clerk can fix a meeting
-- time without a deploy.
--
-- The CHECK (id = 1) is what makes "one row" a rule the database enforces
-- rather than a convention the code hopes for.

CREATE TABLE IF NOT EXISTS unit (
  id                integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name              text NOT NULL DEFAULT '',
  unit_type         text NOT NULL DEFAULT 'branch' CHECK (unit_type IN ('ward', 'branch')),
  stake_name        text NOT NULL DEFAULT '',
  address           text NOT NULL DEFAULT '',
  meeting_times     text NOT NULL DEFAULT '',
  timezone          text NOT NULL DEFAULT 'America/Sao_Paulo',
  calendar_url      text NOT NULL DEFAULT '',
  directory_url     text NOT NULL DEFAULT '',
  contact_note      text NOT NULL DEFAULT '',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO unit (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
