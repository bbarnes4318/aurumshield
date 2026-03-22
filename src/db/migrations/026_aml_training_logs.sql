-- ================================================================
-- 026: AML Training Logs — Global Compliance Training Tracker
-- ================================================================
-- Tracks which users (Admins, Brokers, Counterparties, Employees)
-- have completed mandatory FinCEN AML training certification.
--
-- UNIQUE constraint on user_id ensures only one active completion
-- record per user. To re-certify, DELETE the old record first.
--
-- Idempotent: Uses IF NOT EXISTS throughout.
-- ================================================================

CREATE TABLE IF NOT EXISTS aml_training_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  role              VARCHAR(32) NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attestation_hash  TEXT NOT NULL
);

-- One active completion record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_aml_training_logs_user_id
  ON aml_training_logs (user_id);

-- Fast lookup by role for admin dashboards
CREATE INDEX IF NOT EXISTS idx_aml_training_logs_role
  ON aml_training_logs (role);

-- Role constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_aml_training_role_valid'
  ) THEN
    ALTER TABLE aml_training_logs
      ADD CONSTRAINT chk_aml_training_role_valid
      CHECK (role IN ('ADMIN', 'BROKER', 'COUNTERPARTY', 'EMPLOYEE',
                      'INSTITUTION_TRADER', 'INSTITUTION_TREASURY',
                      'INVESTOR', 'COMPLIANCE', 'VAULT_OPS'));
  END IF;
END $$;
