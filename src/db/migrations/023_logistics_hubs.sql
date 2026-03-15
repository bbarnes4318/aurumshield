-- ================================================================
-- 023: Logistics Hubs — Fixed Geographic Endpoints
-- ================================================================
-- Deterministic grid of verified LBMA Good Delivery refineries
-- and Malca-Amit Free Trade Zone (FTZ) custody vaults.
--
-- These endpoints serve the Armored Logistics Radar as immutable
-- geographic anchors for shipment routing and chain-of-custody.
--
-- Idempotent: Uses IF NOT EXISTS throughout.
-- ================================================================

CREATE TABLE IF NOT EXISTS logistics_hubs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_type       VARCHAR(32)    NOT NULL,
  name           VARCHAR(256)   NOT NULL,
  location_code  VARCHAR(32)    NOT NULL,
  latitude       DECIMAL(10,7)  NOT NULL,
  longitude      DECIMAL(10,7)  NOT NULL,
  is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Enforce valid hub_type values: REFINERY or CUSTODY_VAULT only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_logistics_hub_type_valid'
  ) THEN
    ALTER TABLE logistics_hubs
      ADD CONSTRAINT chk_logistics_hub_type_valid
      CHECK (hub_type IN ('REFINERY', 'CUSTODY_VAULT'));
  END IF;
END $$;

-- Unique constraint on location_code to prevent duplicate endpoint registration
CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_hubs_location_code
  ON logistics_hubs (location_code);

-- Fast lookup by hub type (filter refineries vs vaults)
CREATE INDEX IF NOT EXISTS idx_logistics_hubs_hub_type
  ON logistics_hubs (hub_type);

-- Active-only filter for live radar queries
CREATE INDEX IF NOT EXISTS idx_logistics_hubs_active
  ON logistics_hubs (is_active)
  WHERE is_active = TRUE;
