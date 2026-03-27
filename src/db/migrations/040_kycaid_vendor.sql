-- ================================================================
-- MIGRATION 040 — KYCaid Vendor Support
-- ================================================================
-- Adds the webhook idempotency log table for KYCaid callbacks.
-- No changes to existing tables — the compliance_cases.verified_by
-- column already accepts any string value including 'KYCAID'.
-- ================================================================

CREATE TABLE IF NOT EXISTS kycaid_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255) NOT NULL UNIQUE,
  verification_id VARCHAR(255) NOT NULL,
  applicant_id VARCHAR(255),
  user_id VARCHAR(255) NOT NULL,
  callback_type VARCHAR(100) NOT NULL,
  verification_status VARCHAR(50),
  verified BOOLEAN,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookup by verification_id (polling / status queries)
CREATE INDEX IF NOT EXISTS idx_kycaid_wh_verification
  ON kycaid_webhook_log(verification_id);

-- Index for lookup by user_id (compliance case correlation)
CREATE INDEX IF NOT EXISTS idx_kycaid_wh_user
  ON kycaid_webhook_log(user_id);
