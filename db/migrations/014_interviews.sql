-- Interviews the bishopric schedules with ward members.
--
-- is_head marks the head of household (the interview list is by family) and
-- phone is what the secretary uses to write to them on WhatsApp. Only the
-- bishopric and the secretary may read either.
--
-- Only the fact of the appointment is stored: never notes or the content of
-- the interview.

ALTER TABLE members ADD COLUMN IF NOT EXISTS is_head boolean NOT NULL DEFAULT false;

ALTER TABLE members ADD COLUMN IF NOT EXISTS phone text;

CREATE TABLE IF NOT EXISTS interviews (
  id               serial PRIMARY KEY,
  member_id        integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('tithing', 'individual')),
  interviewer      text NOT NULL CHECK (interviewer IN ('nick', 'rafael', 'jared')),
  starts_at        timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  mode             text NOT NULL CHECK (mode IN ('in_person', 'online')),
  online_link      text,
  status           text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'rescheduled', 'cancelled')),
  created_by       integer REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  -- Tithing interviews are only ever done by Nick; the database refuses
  -- anything else even if the application check is bypassed.
  CONSTRAINT interviews_tithing_nick_check CHECK (kind <> 'tithing' OR interviewer = 'nick')
);

CREATE INDEX IF NOT EXISTS interviews_member_idx ON interviews (member_id);

CREATE INDEX IF NOT EXISTS interviews_interviewer_starts_idx ON interviews (interviewer, starts_at);
