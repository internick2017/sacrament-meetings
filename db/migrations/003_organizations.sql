-- Organizations, people and callings.
--
-- Data minimisation is the rule here: a person is a name and nothing else. No
-- phone, no email, no address, no birth date. Contact details live in the
-- official Church tools and stay there.
--
-- The two photo_* columns on `people` below are the one deliberate, consent
-- gated exception, added for a much later phase: a person may self-upload
-- their own photo, and `photo_consent_at` records that they, personally,
-- consented to it. Nobody uploads a photo of someone else, and this is never
-- used for minors. Everything else about a person stays just the name.

CREATE TABLE IF NOT EXISTS organizations (
  id            serial PRIMARY KEY,
  org_key       text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS people (
  id                serial PRIMARY KEY,
  full_name         text NOT NULL,
  photo_url         text,
  photo_consent_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS callings (
  id              serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id       integer NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  title           text NOT NULL,
  display_order   integer NOT NULL DEFAULT 0,
  started_on      date,
  ended_on        date
);

CREATE INDEX IF NOT EXISTS callings_organization_idx ON callings (organization_id);

CREATE INDEX IF NOT EXISTS callings_person_idx ON callings (person_id);

INSERT INTO organizations (org_key, display_order) VALUES
  ('bishopric', 10),
  ('elders_quorum', 20),
  ('relief_society', 30),
  ('young_men', 40),
  ('young_women', 50),
  ('primary', 60),
  ('sunday_school', 70)
ON CONFLICT (org_key) DO NOTHING;
