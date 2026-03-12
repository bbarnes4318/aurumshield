/* ================================================================
   MIGRATION 016 — Veriff Webhook Idempotency Log & KYB Columns
   ================================================================
   1. veriff_webhook_log: Deduplication table keyed on Veriff
      verification_id. Prevents reprocessing of duplicate webhooks.
   2. Adds kyb_status and marketplace_access columns to users table
      for the KYB state machine.
   ================================================================ */

BEGIN;

/* ---------- 1. Veriff Webhook Idempotency Log ---------- */

CREATE TABLE IF NOT EXISTS veriff_webhook_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   VARCHAR(255) NOT NULL UNIQUE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  veriff_status     VARCHAR(50) NOT NULL,
  mapped_kyb_status VARCHAR(50) NOT NULL,
  raw_payload       JSONB DEFAULT '{}'::jsonb,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veriff_log_verification
  ON veriff_webhook_log(verification_id);

CREATE INDEX IF NOT EXISTS idx_veriff_log_user
  ON veriff_webhook_log(user_id);

/* ---------- 2. KYB State Columns on Users ---------- */

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyb_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketplace_access BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
