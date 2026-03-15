-- ================================================================
-- 021: Logistics Tracking — Shipments & Geospatial Events
-- ================================================================
-- Tracks physical shipments dispatched by sovereign carriers
-- (Malca-Amit, Brink's) and their chain-of-custody GPS events.
--
-- Tables:
--   shipments        — Master record per physical dispatch
--   shipment_events  — Immutable, append-only GPS + custody log
--
-- Idempotent: Uses IF NOT EXISTS throughout.
-- ================================================================

-- ── SHIPMENTS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id       VARCHAR(64) NOT NULL,
  tracking_number     VARCHAR(128) NOT NULL,
  carrier             VARCHAR(64) NOT NULL,
  status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  estimated_delivery  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce valid shipment status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_shipment_status_valid'
  ) THEN
    ALTER TABLE shipments
      ADD CONSTRAINT chk_shipment_status_valid
      CHECK (status IN (
        'PENDING',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shipments_settlement_id
  ON shipments (settlement_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_tracking_number
  ON shipments (tracking_number);

-- ── SHIPMENT EVENTS (append-only custody log) ─────────────────

CREATE TABLE IF NOT EXISTS shipment_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id               UUID NOT NULL REFERENCES shipments(id),
  status                    VARCHAR(32) NOT NULL,
  location_name             VARCHAR(256),
  latitude                  DECIMAL(10,7),
  longitude                 DECIMAL(10,7),
  custodian_signature_hash  VARCHAR(128),
  event_timestamp           TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id
  ON shipment_events (shipment_id);

CREATE INDEX IF NOT EXISTS idx_shipment_events_timestamp
  ON shipment_events (shipment_id, event_timestamp);
