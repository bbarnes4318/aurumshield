-- =============================================================================
-- AurumShield — Patch: Add Missing Onboarding State Columns
-- Migration: 041_patch_onboarding_columns
-- Date: 2026-03-27
-- =============================================================================
-- Migration 002 was recorded as applied but the table was created
-- without current_step and metadata_json. This patch adds them
-- idempotently so no manual curl is ever needed again.
-- =============================================================================

ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 1;
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS provider_inquiry_id VARCHAR(255);
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Widen current_step constraint to support KYB extended flow (up to 8 steps)
ALTER TABLE onboarding_state DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_current_step_check CHECK (current_step BETWEEN 1 AND 8);
