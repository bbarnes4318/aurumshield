/* ================================================================
   MIGRATION 017 — DvP Extended Settlement States
   ================================================================
   Adds the FUNDS_CLEARED_READY_FOR_RELEASE and
   TITLE_TRANSFERRED_AND_COMPLETED states to the settlement
   status enum for the atomic swap DvP lifecycle.
   ================================================================ */

-- These ALTER TYPE statements are non-reversible in PostgreSQL.
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'FUNDS_CLEARED_READY_FOR_RELEASE' AFTER 'FUNDS_HELD';
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'TITLE_TRANSFERRED_AND_COMPLETED'  AFTER 'DVP_EXECUTED';

-- Add producer_id to settlement_cases if not present
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS producer_id UUID REFERENCES users(id);

-- Clearing ledger: title hash + outbound transfer tracking
ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS title_hash VARCHAR(128);

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS outbound_transfer_id VARCHAR(255);

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
