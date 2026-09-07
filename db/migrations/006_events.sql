-- Activities.
--
-- organization_id NULL means an activity of the whole branch, which only an
-- admin may create or edit. A non-null value means it belongs to that
-- organization, and its leader may edit it. That single column is what feeds
-- requireLeaderOf(), so the permission rule needs no special case here.
--
-- This table records what is happening, not who attends: there is deliberately
-- no attendee list and no sign-up.

CREATE TABLE IF NOT EXISTS events (
  id              serial PRIMARY KEY,
  organization_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  location        text NOT NULL DEFAULT '',
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,
  all_day         boolean NOT NULL DEFAULT false,
  audience        text NOT NULL DEFAULT 'private' CHECK (audience IN ('public', 'private')),
  cover_url       text,
  created_by      integer REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at DESC);

CREATE INDEX IF NOT EXISTS events_organization_idx ON events (organization_id);
