-- ================================================================
-- 019: Asset Provenance Schema Extension
-- ================================================================
-- Adds sovereign assay verification and armored transit handoff
-- tracking columns to inventory_listings. These columns gate
-- cryptographic title minting in the DvP settlement engine.
--
-- Idempotent: Uses IF NOT EXISTS for safe re-runs.
-- ================================================================

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS assay_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS transit_logged BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS assay_data JSONB;

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS transit_data JSONB;

-- Index for the minting gate query (settlement-actions.ts Phase A)
CREATE INDEX IF NOT EXISTS idx_inventory_listings_provenance
  ON inventory_listings (id, assay_verified, transit_logged);
