-- =============================================================================
-- AurumShield — USDT Settlement Columns
-- Migration: 022_usdt_settlement_columns
-- Date: 2026-03-14
-- =============================================================================
-- Adds columns required by the Turnkey inbound webhook and the dual-rail
-- atomic swap engine. These columns already appear in application code
-- but were never persisted via a migration.
-- =============================================================================

-- Turnkey MPC wallet identifiers (per-settlement isolation)
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS turnkey_sub_org_id VARCHAR(255);

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS turnkey_deposit_address VARCHAR(255);

-- Funding route selector: 'fedwire' (default) or 'stablecoin'
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS funding_route VARCHAR(50) DEFAULT 'fedwire';

-- Webhook-driven boolean: TRUE once inbound funds are confirmed
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS funds_confirmed_final BOOLEAN DEFAULT FALSE;

-- Producer's verified ERC-20 wallet for outbound USDT payouts
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS producer_wallet_address VARCHAR(255);

-- Performance index for webhook deposit-address lookups
CREATE INDEX IF NOT EXISTS idx_settlement_deposit_address
  ON settlement_cases (LOWER(turnkey_deposit_address))
  WHERE turnkey_deposit_address IS NOT NULL;

-- Add PROCESSING_RAIL to settlement_status_enum if not already present
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING_RAIL' AFTER 'DVP_EXECUTED';
