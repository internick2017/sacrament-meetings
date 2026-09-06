-- Baseline: the schema that already existed in production before migrations.
-- Every statement is IF NOT EXISTS, so running this against the live database
-- changes nothing; it only records that the repo now describes that schema.
-- Column types/defaults/constraints below were dumped from the live database
-- (information_schema.columns and pg_indexes), not written from memory.

CREATE TABLE IF NOT EXISTS meetings (
  id             serial PRIMARY KEY,
  date           date NOT NULL UNIQUE,
  meeting_type   varchar NOT NULL,
  presiding      varchar NOT NULL,
  conducting     varchar NOT NULL,
  announcements  text[] DEFAULT '{}',
  opening_hymn   jsonb NOT NULL,
  opening_prayer varchar NOT NULL,
  ward_business  jsonb DEFAULT '[]',
  stake_business boolean DEFAULT false,
  sacrament_hymn jsonb NOT NULL,
  speakers       jsonb DEFAULT '[]',
  closing_hymn   jsonb NOT NULL,
  closing_prayer varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);
