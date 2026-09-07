-- Adds a created_at column to verification_token so requestMagicLinkAction
-- can throttle repeat requests for the same address (see auth-adapter.ts's
-- createVerificationToken). Additive only: no existing column is touched.

ALTER TABLE verification_token ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
