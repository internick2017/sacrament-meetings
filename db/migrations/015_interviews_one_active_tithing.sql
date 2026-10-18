-- A family has at most one scheduled tithing interview at a time. The
-- application checks this before saving, but two saves at the same moment
-- could both pass that check; this index makes the database refuse the
-- second one (unique violation 23505), which the actions report as "this
-- family already has a tithing interview scheduled".

CREATE UNIQUE INDEX IF NOT EXISTS interviews_one_active_tithing_idx
  ON interviews (member_id)
  WHERE kind = 'tithing' AND status = 'scheduled';
