-- ================================================================
-- 027: AML Screening Audit Log
-- ================================================================
-- Immutable, append-only audit table for all AML/PEP screening
-- events. Every call to screenCounterpartyEntity() that completes
-- (CLEARED or REJECTED) is logged here for regulatory compliance.
--
-- This table is the forensic record for:
--   - SOX / BSA / AML audit trail
--   - Demonstrating fail-closed enforcement
--   - Regulatory examiner evidence
--
-- Idempotent: Uses IF NOT EXISTS throughout.
-- ================================================================

CREATE TABLE IF NOT EXISTS aml_screening_audit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name       VARCHAR(256) NOT NULL,
  jurisdiction      VARCHAR(128),
  screening_result  VARCHAR(32) NOT NULL,   -- 'CLEARED' | 'REJECTED'
  match_score       NUMERIC(5,4),           -- 0.0000 to 9.9999 (typically 0–1)
  match_id          TEXT,                    -- Yente entity ID (e.g., "NK-xxxx")
  reason            TEXT,                    -- 'AML_WATCHLIST_MATCH' or NULL
  screened_by       TEXT NOT NULL,           -- broker_id or 'SYSTEM'
  source_action     VARCHAR(64) NOT NULL DEFAULT 'CREATE_BROKER_CLIENT',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by entity name (case-insensitive search support)
CREATE INDEX IF NOT EXISTS idx_aml_screening_audit_entity
  ON aml_screening_audit (entity_name);

-- Time-range queries for compliance reports
CREATE INDEX IF NOT EXISTS idx_aml_screening_audit_created
  ON aml_screening_audit (created_at DESC);

-- Filter by result (all rejections)
CREATE INDEX IF NOT EXISTS idx_aml_screening_audit_result
  ON aml_screening_audit (screening_result)
  WHERE screening_result = 'REJECTED';

-- Constraint: screening_result must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_aml_screening_result_valid'
  ) THEN
    ALTER TABLE aml_screening_audit
      ADD CONSTRAINT chk_aml_screening_result_valid
      CHECK (screening_result IN ('CLEARED', 'REJECTED'));
  END IF;
END $$;
