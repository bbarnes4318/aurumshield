/* ================================================================
   MIGRATION 018 — iDenfy Multi-Vendor Compliance Support
   ================================================================
   Non-destructive, additive-only migration.

   1. Adds verified_by column to compliance_cases — tracks which
      vendor ('VERIFF' or 'IDENFY') cleared the entity.
   2. Adds verified_by column to users — parallel tracking for
      fast lookups at the user level.
   3. Creates idenfy_webhook_log — idempotency table for iDenfy
      webhooks, mirroring veriff_webhook_log structure.

   Regulatory requirement: audit trail must record the exact
   vendor that performed each compliance clearance.
   ================================================================ */

BEGIN;

/* ---------- 1. verified_by on compliance_cases ---------- */

ALTER TABLE compliance_cases
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20);

COMMENT ON COLUMN compliance_cases.verified_by IS
  'Compliance vendor that cleared this entity: VERIFF or IDENFY. Null if not yet cleared.';

/* ---------- 2. verified_by on users ---------- */

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20);

COMMENT ON COLUMN users.verified_by IS
  'Compliance vendor that cleared this user: VERIFF or IDENFY. Null if not yet cleared.';

/* ---------- 3. iDenfy Webhook Idempotency Log ---------- */

CREATE TABLE IF NOT EXISTS idenfy_webhook_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_ref          VARCHAR(255) NOT NULL UNIQUE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  idenfy_status     VARCHAR(50) NOT NULL,
  mapped_kyb_status VARCHAR(50) NOT NULL,
  raw_payload       JSONB DEFAULT '{}'::jsonb,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idenfy_log_scan_ref
  ON idenfy_webhook_log(scan_ref);

CREATE INDEX IF NOT EXISTS idx_idenfy_log_user
  ON idenfy_webhook_log(user_id);

/* ---------- 4. Performance indexes ---------- */

CREATE INDEX IF NOT EXISTS idx_compliance_cases_verified_by
  ON compliance_cases(verified_by);

CREATE INDEX IF NOT EXISTS idx_users_verified_by
  ON users(verified_by);

COMMIT;
