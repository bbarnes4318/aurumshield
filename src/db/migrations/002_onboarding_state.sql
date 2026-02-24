-- =============================================================================
-- AurumShield — Onboarding State Persistence
-- Migration: 002_onboarding_state
-- Date: 2026-02-24
-- =============================================================================
-- Stores save-and-resume onboarding progress so users can safely exit
-- and pick up exactly where they left off. Supports:
--   • Wizard step tracking (steps 1-3: corporate, UBO, liveness)
--   • Step 4: Persona/provider verification handoff
--   • Provider inquiry recovery (resume after tab close)
--   • Form data preservation via metadata_json
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM for onboarding lifecycle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE onboarding_status_enum AS ENUM (
  'IN_PROGRESS',       -- actively completing wizard steps
  'PROVIDER_PENDING',  -- Persona inquiry submitted, awaiting webhook
  'REVIEW',            -- flagged for manual compliance review
  'COMPLETED',         -- KYC/KYB approved, onboarding finished
  'ABANDONED'          -- user explicitly abandoned (admin use)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ONBOARDING STATE TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE onboarding_state (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id               UUID,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_step         INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  provider_inquiry_id  VARCHAR(255),
  status               onboarding_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
  status_reason        TEXT,
  metadata_json        JSONB DEFAULT '{}'::jsonb,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_onboarding_user UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at on every row change
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_onboarding_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_onboarding_state_updated_at
  BEFORE UPDATE ON onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_state_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_onboarding_status ON onboarding_state(status);
