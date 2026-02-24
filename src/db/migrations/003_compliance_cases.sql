-- =============================================================================
-- AurumShield — Compliance Case Management
-- Migration: 003_compliance_cases
-- Date: 2026-02-24
-- =============================================================================
-- Introduces the unified Compliance Case model. Every user's KYC/KYB
-- lifecycle is tracked as a single case with an append-only event log.
-- Replaces ad-hoc KYC status checks with structured case state.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE compliance_case_status_enum AS ENUM (
  'OPEN',              -- case created, verification not yet started
  'PENDING_USER',      -- waiting for user action (document upload, etc.)
  'PENDING_PROVIDER',  -- waiting for external provider callback
  'UNDER_REVIEW',      -- manual review by compliance team
  'APPROVED',          -- fully verified
  'REJECTED',          -- verification failed
  'CLOSED'             -- administratively closed
);

CREATE TYPE compliance_tier_enum AS ENUM (
  'BROWSE',   -- can browse marketplace
  'QUOTE',    -- can request quotes
  'LOCK',     -- can lock prices
  'EXECUTE'   -- can execute purchases and settle
);

CREATE TYPE compliance_event_actor_enum AS ENUM (
  'USER',      -- end user
  'PROVIDER',  -- external provider (Persona, OpenSanctions, etc.)
  'SYSTEM'     -- platform automation
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE CASES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE compliance_cases (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id               UUID,
  status               compliance_case_status_enum NOT NULL DEFAULT 'OPEN',
  tier                 compliance_tier_enum NOT NULL DEFAULT 'BROWSE',
  org_type             VARCHAR(50),
  jurisdiction         VARCHAR(100),
  provider_inquiry_id  VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active case per user (soft constraint — CLOSED cases are excluded)
  CONSTRAINT uq_compliance_case_user UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE EVENTS TABLE (append-only audit log)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE compliance_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES compliance_cases(id) ON DELETE CASCADE,
  event_id    VARCHAR(255) NOT NULL,
  actor       compliance_event_actor_enum NOT NULL DEFAULT 'SYSTEM',
  action      VARCHAR(100) NOT NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: prevent duplicate event processing
  CONSTRAINT uq_compliance_event_id UNIQUE (event_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update trigger for compliance_cases.updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_compliance_case_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compliance_case_updated_at
  BEFORE UPDATE ON compliance_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_case_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_compliance_cases_user    ON compliance_cases(user_id);
CREATE INDEX idx_compliance_cases_status  ON compliance_cases(status);
CREATE INDEX idx_compliance_events_case   ON compliance_events(case_id);
CREATE INDEX idx_compliance_events_id     ON compliance_events(event_id);
