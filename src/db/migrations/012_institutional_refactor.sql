/* ================================================================
   MIGRATION 012 — Institutional Architecture Refactor
   ================================================================
   Migrates from hybrid retail/institutional model to strict
   Institutional/Broker-Dealer entity model.

   Changes:
     1. ENUM entity_category: INSTITUTION, BROKER_DEALER
     2. organizations: lei_code, entity_type, aml_reliance_active
     3. organizations: modern_treasury_virtual_account_id
     4. DROP retail KYC columns (selfie_liveness tracking)
   ================================================================ */

BEGIN;

/* ---------- 1. Entity Category Enum ---------- */

DO $$ BEGIN
  CREATE TYPE entity_category AS ENUM ('INSTITUTION', 'BROKER_DEALER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

/* ---------- 2. LEI & Entity Type on Organizations ---------- */

-- LEI (Legal Entity Identifier) — 20-char alphanumeric, globally unique.
-- Required for all regulated institutional participants.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS lei_code VARCHAR(20) UNIQUE;

-- NOTE: lei_code is NOT NULL enforced at the application layer (authz.ts)
-- rather than the DB layer, because existing rows need backfilling first.
-- After backfill, run:
--   ALTER TABLE organizations ALTER COLUMN lei_code SET NOT NULL;

-- Entity classification for bifurcated capital & compliance rules.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS entity_type entity_category NOT NULL DEFAULT 'INSTITUTION';

-- AML reliance flag — enables Broker-Dealers to rely on upstream
-- Institution's AML/KYC per FinCEN Rule 1020.220(a)(6).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS aml_reliance_active BOOLEAN DEFAULT false;

/* ---------- 3. Modern Treasury Virtual Account ---------- */

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS modern_treasury_virtual_account_id VARCHAR(255);

/* ---------- 4. LEI Format Constraint ---------- */

-- LEI format: exactly 20 alphanumeric characters (ISO 17442)
ALTER TABLE organizations
  ADD CONSTRAINT chk_lei_format
  CHECK (lei_code IS NULL OR lei_code ~ '^[A-Z0-9]{20}$');

/* ---------- 5. Drop Retail KYC Columns ---------- */

-- Remove selfie-liveness tracking columns if they exist.
-- These are retail-grade checks not applicable to institutional KYB.
ALTER TABLE compliance_cases
  DROP COLUMN IF EXISTS selfie_liveness_status;

ALTER TABLE compliance_cases
  DROP COLUMN IF EXISTS selfie_liveness_provider_id;

ALTER TABLE compliance_cases
  DROP COLUMN IF EXISTS selfie_liveness_timestamp;

COMMIT;
