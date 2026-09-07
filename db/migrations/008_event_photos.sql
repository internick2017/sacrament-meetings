-- Photos of activities that already happened, and the switch that lets a
-- person upload a profile picture.
--
-- approved = false means the photo is stored but nobody sees it yet. Photos of
-- Primary, Young Men and Young Women activities start that way and only an
-- admin can approve them: the decision about a child's picture does not belong
-- to whoever happened to be holding the phone. That rule is derived from the
-- activity's organization, not from a checkbox, so it cannot be switched off in
-- a hurry.
--
-- photo_upload_allowed is false for every account until an admin turns it on.
-- This project deliberately stores no birth dates, so it cannot know who is a
-- minor; the guarantee is that the bishopric decides, one account at a time.

CREATE TABLE IF NOT EXISTS event_photos (
  id          serial PRIMARY KEY,
  event_id    integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url         text NOT NULL,
  caption     text NOT NULL DEFAULT '',
  approved    boolean NOT NULL DEFAULT false,
  uploaded_by integer REFERENCES users(id) ON DELETE SET NULL,
  approved_by integer REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_photos_event_idx ON event_photos (event_id);

CREATE INDEX IF NOT EXISTS event_photos_approved_idx ON event_photos (approved);

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_upload_allowed boolean NOT NULL DEFAULT false;
