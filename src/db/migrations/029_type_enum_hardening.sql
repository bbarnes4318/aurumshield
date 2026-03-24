-- ================================================================
-- MIGRATION 029: Type/Enum Hardening
-- ================================================================
-- Promotes stringly-typed varchar columns to proper PostgreSQL
-- enum types across the Compliance OS schema.
--
-- This migration is BACKWARD-COMPATIBLE:
--   - All existing values conform to the new enum types
--   - ALTER COLUMN ... TYPE uses USING to cast existing data
--   - CREATE TYPE uses DO blocks with IF NOT EXISTS pattern
--
-- Affected tables:
--   co_subjects                    → risk_tier
--   co_checks                     → status
--   co_decisions                  → decision_type, decision
--   co_chain_of_custody_events    → verification_status
--   co_settlement_authorizations  → payment_rail
-- ================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. CREATE ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE co_risk_tier AS ENUM ('STANDARD', 'HIGH', 'ENHANCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE co_check_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE co_decision_type AS ENUM ('INTERIM', 'FINAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE co_decision_outcome AS ENUM ('APPROVED', 'REJECTED', 'MANUAL_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE co_custody_verification_status AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE co_payment_rail AS ENUM ('WIRE', 'USDC', 'USDT', 'FEDWIRE', 'TURNKEY_MPC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. ALTER COLUMNS (varchar → enum)
-- ═══════════════════════════════════════════════════════════════════

-- co_subjects.risk_tier
ALTER TABLE co_subjects
  ALTER COLUMN risk_tier TYPE co_risk_tier
  USING risk_tier::co_risk_tier;

-- co_checks.status
ALTER TABLE co_checks
  ALTER COLUMN status TYPE co_check_status
  USING status::co_check_status;

-- co_decisions.decision_type
ALTER TABLE co_decisions
  ALTER COLUMN decision_type TYPE co_decision_type
  USING decision_type::co_decision_type;

-- co_decisions.decision
ALTER TABLE co_decisions
  ALTER COLUMN decision TYPE co_decision_outcome
  USING decision::co_decision_outcome;

-- co_chain_of_custody_events.verification_status
ALTER TABLE co_chain_of_custody_events
  ALTER COLUMN verification_status TYPE co_custody_verification_status
  USING verification_status::co_custody_verification_status;

-- co_settlement_authorizations.payment_rail
ALTER TABLE co_settlement_authorizations
  ALTER COLUMN payment_rail TYPE co_payment_rail
  USING payment_rail::co_payment_rail;

COMMIT;
