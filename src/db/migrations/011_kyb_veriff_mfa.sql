-- =============================================================================
-- AurumShield — KYB / Veriff / Enterprise MFA Schema Extensions
-- Migration: 011_kyb_veriff_mfa
-- Date: 2026-02-28
-- =============================================================================
-- Extends the compliance schema to support:
--   • Enterprise MFA tracking (TOTP + WebAuthn credential registry)
--   • KYB entity type classification (individual vs company)
--   • Parallel KYB sub-check tracking (corp registry, UBO officers, entity AML)
--   • Parallel engagement for UNDER_REVIEW users (mock checkout access)
--
-- This migration is ADDITIVE ONLY — no destructive changes.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM for KYB sub-check types
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE kyb_check_type_enum AS ENUM (
  'CORP_REGISTRY',       -- corporate registry verification
  'UBO_OFFICERS',        -- UBO / officer identity verification
  'ENTITY_AML',          -- entity-level AML/sanctions screening
  'PROOF_OF_ADDRESS',    -- registered business address verification
  'SOURCE_OF_FUNDS'      -- source of funds / wealth declaration
);

CREATE TYPE kyb_check_status_enum AS ENUM (
  'PENDING',             -- not yet started
  'IN_PROGRESS',         -- submitted to provider, awaiting result
  'PASSED',              -- verification passed
  'FAILED',              -- verification failed
  'MANUAL_REVIEW'        -- flagged for manual compliance review
);

CREATE TYPE entity_type_enum AS ENUM (
  'individual',          -- KYC track (personal identity)
  'company'              -- KYB track (corporate entity)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD COLUMNS to compliance_cases
-- ─────────────────────────────────────────────────────────────────────────────

-- Entity type discriminant (KYC vs KYB routing)
ALTER TABLE compliance_cases
  ADD COLUMN IF NOT EXISTS entity_type entity_type_enum DEFAULT 'individual';

-- Enable parallel engagement (mock checkout + live pricing) for UNDER_REVIEW users
ALTER TABLE compliance_cases
  ADD COLUMN IF NOT EXISTS parallel_engagement_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Veriff session ID (replaces Persona inquiry ID for new enrollments)
ALTER TABLE compliance_cases
  ADD COLUMN IF NOT EXISTS veriff_session_id VARCHAR(255);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD MFA tracking to users table
-- ─────────────────────────────────────────────────────────────────────────────

-- MFA methods registry: tracks enrolled TOTP/WebAuthn credentials
-- Schema: { "totp": boolean, "webauthn": boolean, "webauthn_credentials": [...] }
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_methods JSONB DEFAULT '{"totp": false, "webauthn": false}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- KYB CHECKS TABLE — Parallel sub-check tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyb_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES compliance_cases(id) ON DELETE CASCADE,
  check_type        kyb_check_type_enum NOT NULL,
  status            kyb_check_status_enum NOT NULL DEFAULT 'PENDING',
  provider_id       VARCHAR(100),                    -- e.g. 'veriff-kyb-001', 'opensanctions-aml-001'
  provider_ref      VARCHAR(255),                    -- provider-specific reference ID
  result_json       JSONB DEFAULT '{}'::jsonb,       -- full provider response payload
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One check of each type per case
  CONSTRAINT uq_kyb_check_type_per_case UNIQUE (case_id, check_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update trigger for kyb_checks.updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_kyb_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kyb_checks_updated_at
  BEFORE UPDATE ON kyb_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_kyb_checks_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Widen onboarding_state current_step range for KYB extended flow
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop and recreate the CHECK constraint to allow steps 1-8
ALTER TABLE onboarding_state
  DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;

ALTER TABLE onboarding_state
  ADD CONSTRAINT onboarding_state_current_step_check
  CHECK (current_step BETWEEN 1 AND 8);

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kyb_checks_case ON kyb_checks(case_id);
CREATE INDEX IF NOT EXISTS idx_kyb_checks_status ON kyb_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_entity_type ON compliance_cases(entity_type);
