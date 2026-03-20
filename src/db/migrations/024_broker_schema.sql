-- ================================================================
-- 024: Broker Schema — Intermediary Role Foundation
-- ================================================================
-- Introduces the BROKER entity model for intermediaries who
-- register LBMA Good Delivery assets and facilitate DvP swaps
-- for a commission fee (basis points).
--
-- Tables:
--   1. brokers           — Broker entity profile linked to users
--   2. broker_clients    — M:N mapping of broker → client users
--
-- Alterations:
--   3. settlement_cases  — Optional broker_id + broker_fee_bps
--
-- Idempotent: Uses IF NOT EXISTS / DO $$ guards throughout.
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- 1. BROKERS — Intermediary Entity Profile
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brokers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brokerage_name   VARCHAR(256) NOT NULL,
  gleif_lei        VARCHAR(20),
  kyb_status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  commission_default_bps INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1:1 user ↔ broker mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_user_id
  ON brokers (user_id);

-- KYB status constraint: enforce valid lifecycle values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_brokers_kyb_status_valid'
  ) THEN
    ALTER TABLE brokers
      ADD CONSTRAINT chk_brokers_kyb_status_valid
      CHECK (kyb_status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'));
  END IF;
END $$;

-- Commission basis points must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_brokers_commission_bps_non_negative'
  ) THEN
    ALTER TABLE brokers
      ADD CONSTRAINT chk_brokers_commission_bps_non_negative
      CHECK (commission_default_bps >= 0);
  END IF;
END $$;

-- Fast lookup by KYB status (admin dashboards, compliance filters)
CREATE INDEX IF NOT EXISTS idx_brokers_kyb_status
  ON brokers (kyb_status);

-- ─────────────────────────────────────────────────────────────────
-- 2. BROKER_CLIENTS — Broker ↔ Client User Mapping
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id        UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  client_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  onboarded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce unique broker ↔ client pairing
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_clients_unique_pair
  ON broker_clients (broker_id, client_user_id);

-- Fast reverse lookup: find a client's broker
CREATE INDEX IF NOT EXISTS idx_broker_clients_client_user_id
  ON broker_clients (client_user_id);

-- Status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_broker_clients_status_valid'
  ) THEN
    ALTER TABLE broker_clients
      ADD CONSTRAINT chk_broker_clients_status_valid
      CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. ALTER settlement_cases — Broker-Facilitated Trades
-- ─────────────────────────────────────────────────────────────────
-- broker_id:      NULL for direct trades, set for brokered trades
-- broker_fee_bps: commission in basis points for this specific trade

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settlement_cases' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE settlement_cases
      ADD COLUMN broker_id UUID REFERENCES brokers(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settlement_cases' AND column_name = 'broker_fee_bps'
  ) THEN
    ALTER TABLE settlement_cases
      ADD COLUMN broker_fee_bps INTEGER;
  END IF;
END $$;

-- Broker fee basis points must be non-negative when set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_settlement_broker_fee_bps_non_negative'
  ) THEN
    ALTER TABLE settlement_cases
      ADD CONSTRAINT chk_settlement_broker_fee_bps_non_negative
      CHECK (broker_fee_bps IS NULL OR broker_fee_bps >= 0);
  END IF;
END $$;

-- Index for broker dashboard queries (all settlements for a broker)
CREATE INDEX IF NOT EXISTS idx_settlement_cases_broker_id
  ON settlement_cases (broker_id)
  WHERE broker_id IS NOT NULL;
