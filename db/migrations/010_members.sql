-- The ward roster, kept only so the bishopric can see who has never been
-- invited to speak. Names only, by decision of the bishop: no age, phone,
-- address, gender or any other personal data belongs in this table. Only an
-- admin can read or replace it.

CREATE TABLE IF NOT EXISTS members (
  id         serial PRIMARY KEY,
  full_name  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS members_full_name_lower_idx ON members (lower(full_name));
