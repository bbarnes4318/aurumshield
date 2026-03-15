-- ================================================================
-- 020: Doré Refinery Schema Extension
-- ================================================================
-- Adds asynchronous refinery yield-tracking columns to
-- inventory_listings. Supports the RAW_DORE intake pipeline
-- where estimated weight is held pending until an LBMA refinery
-- fires a secure webhook with the true 99.99% purified yield.
--
-- Columns:
--   estimated_weight_oz       — Miner's declared pre-refining weight
--   actual_refined_weight_oz  — True yield (set by refinery webhook)
--   refinery_id               — LBMA refinery identifier
--   refinery_status           — State machine for refinery pipeline
--   refinery_yield_data       — Full yield report payload (JSONB)
--
-- Idempotent: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ================================================================

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS estimated_weight_oz DECIMAL;

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS actual_refined_weight_oz DECIMAL;

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS refinery_id VARCHAR(128);

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS refinery_status VARCHAR(32) DEFAULT 'NOT_APPLICABLE';

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS refinery_yield_data JSONB;

-- Enforce valid refinery_status values via CHECK constraint.
-- Drop-and-recreate for idempotency (ALTER TABLE ADD CONSTRAINT
-- IF NOT EXISTS is not universally supported).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_refinery_status_valid'
  ) THEN
    ALTER TABLE inventory_listings
      ADD CONSTRAINT chk_refinery_status_valid
      CHECK (refinery_status IN (
        'NOT_APPLICABLE',
        'PENDING_DELIVERY',
        'PROCESSING',
        'COMPLETED',
        'REJECTED'
      ));
  END IF;
END $$;

-- Index for the minting gate query (settlement-actions.ts Phase A)
CREATE INDEX IF NOT EXISTS idx_inventory_listings_refinery_status
  ON inventory_listings (id, refinery_status);
