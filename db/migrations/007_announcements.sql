-- Announcements.
--
-- Same shape as events: organization_id NULL means an announcement of the whole
-- unit, which only an admin may write, and audience decides whether an
-- anonymous visitor sees it.
--
-- The difference is ends_on, which is NOT NULL on purpose. The problem with
-- announcements is never posting them, it is that nobody takes them down, so
-- an expiry date is mandatory and the list filters by it. starts_on is
-- nullable: an announcement with no start date is in force from today.
--
-- An announcement is a piece of text with dates. It records nothing about who
-- read it and holds no recipient list.

CREATE TABLE IF NOT EXISTS announcements (
  id              serial PRIMARY KEY,
  organization_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text NOT NULL DEFAULT '',
  starts_on       date,
  ends_on         date NOT NULL,
  audience        text NOT NULL DEFAULT 'private' CHECK (audience IN ('public', 'private')),
  created_by      integer REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_ends_on_idx ON announcements (ends_on);

CREATE INDEX IF NOT EXISTS announcements_organization_idx ON announcements (organization_id);
