-- Accounts added from /users sign in only by magic link and have no username.
--
-- Migration 004 made password_hash nullable for exactly this reason but left
-- username NOT NULL from the baseline, so every INSERT from the admin panel
-- was refused by the database. The UNIQUE constraint stays: Postgres allows
-- any number of NULLs under it, and the bishopric's usernames remain unique.

ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
