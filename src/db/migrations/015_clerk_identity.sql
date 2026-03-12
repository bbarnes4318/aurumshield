/* ================================================================
   MIGRATION 015 — Add Clerk Identity Column
   ================================================================
   Adds a clerk_id TEXT column to the users table for mapping
   Clerk-managed identities to our internal user records.
   The column is UNIQUE and indexed for fast webhook lookups.
   ================================================================ */

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL;

COMMIT;
