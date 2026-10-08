-- Who created, edited or deleted each sacrament meeting, and when.
--
-- meeting_id is deliberately NOT a foreign key: the row recording a deletion
-- has to outlive the meeting it describes. meeting_date is copied for the same
-- reason, so a deleted meeting can still be named.
--
-- changed_by_label is a copy of the account's e-mail (or username) at the time
-- of the change. Removing someone from /users sets changed_by to NULL, and the
-- label is what keeps their past changes attributed to them.
--
-- Only the fact of the change is stored, never the old or new contents.

CREATE TABLE IF NOT EXISTS meeting_changes (
  id               serial PRIMARY KEY,
  meeting_id       integer NOT NULL,
  meeting_date     date NOT NULL,
  action           text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changed_by       integer REFERENCES users(id) ON DELETE SET NULL,
  changed_by_label text,
  changed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_changes_meeting_idx ON meeting_changes (meeting_id, changed_at DESC);
