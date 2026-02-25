-- =============================================================================
-- AurumShield — DvP State Machine, Escrow Holds & Idempotent Payouts
-- Migration: 005_dvp_escrow
-- Date: 2026-02-24
-- =============================================================================
-- Extends the settlement subsystem with:
--   1. Granular DvP status enum values
--   2. escrow_holds      — funds reserved per settlement (buyer → escrow)
--   3. dvp_events        — append-only DvP state transition ledger
--   4. settlement_finality — external transfer reconciliation (Moov / MT)
--   5. payouts           — idempotent payout attempt store
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Expand settlement_status_enum with DvP states
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: ALTER TYPE ... ADD VALUE is non-reversible in PostgreSQL.
-- New values slot between AWAITING_FUNDS and SETTLED in the lifecycle:
--   ESCROW_OPEN → AWAITING_FUNDS → FUNDS_HELD → ASSET_ALLOCATED
--   → DVP_READY → DVP_EXECUTED → SETTLED
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'FUNDS_HELD'       AFTER 'AWAITING_FUNDS';
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'ASSET_ALLOCATED'  AFTER 'FUNDS_HELD';
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'DVP_READY'        AFTER 'ASSET_ALLOCATED';
ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'DVP_EXECUTED'     AFTER 'DVP_READY';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DvP Event Type Enum
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE dvp_event_type AS ENUM (
  'RESERVED',
  'FUNDS_HELD',
  'ASSET_ALLOCATED',
  'DVP_READY',
  'DVP_EXECUTED',
  'SETTLED',
  'FAILED',
  'ROLLBACK'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Payout Status Enum
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE payout_status AS ENUM (
  'PENDING',
  'SUBMITTED',
  'COMPLETED',
  'FAILED',
  'REVERSED'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Finality Status Enum
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE finality_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED',
  'REQUIRES_REVIEW'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ESCROW_HOLDS — Funds reserved for a settlement
-- ─────────────────────────────────────────────────────────────────────────────
-- Each settlement has at most one active escrow hold. When funds are released
-- (DvP executed), is_released flips to TRUE and released_at is set.
CREATE TABLE escrow_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   VARCHAR(50) NOT NULL REFERENCES settlement_cases(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES users(id),
  hold_amount_cents BIGINT NOT NULL CHECK (hold_amount_cents > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  source_rail     VARCHAR(50) NOT NULL,           -- 'moov' | 'modern_treasury'
  external_hold_id VARCHAR(255),                   -- ID from payment processor
  is_released     BOOLEAN NOT NULL DEFAULT FALSE,
  held_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_escrow_settlement UNIQUE (settlement_id)
);

CREATE INDEX idx_escrow_buyer ON escrow_holds(buyer_id);
CREATE INDEX idx_escrow_released ON escrow_holds(is_released) WHERE is_released = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- DVP_EVENTS — Append-only DvP state transition ledger
-- ─────────────────────────────────────────────────────────────────────────────
-- Records every state transition in the DvP lifecycle. Once written, rows
-- are never updated or deleted. The latest event per settlement_id determines
-- the current DvP state.
CREATE TABLE dvp_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   VARCHAR(50) NOT NULL REFERENCES settlement_cases(id) ON DELETE CASCADE,
  event_type      dvp_event_type NOT NULL,
  previous_state  dvp_event_type,                  -- NULL for the first event (RESERVED)
  actor_user_id   VARCHAR(255) NOT NULL,
  actor_role      VARCHAR(50) NOT NULL,
  detail          TEXT,
  evidence_ids    TEXT[],                           -- document references
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dvp_settlement   ON dvp_events(settlement_id);
CREATE INDEX idx_dvp_event_type   ON dvp_events(event_type);
CREATE INDEX idx_dvp_created      ON dvp_events(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- SETTLEMENT_FINALITY — External transfer reconciliation
-- ─────────────────────────────────────────────────────────────────────────────
-- Each row records the finality status of a transfer attempt. Used to:
-- 1. Gate fallback: secondary rail only after primary finality_status = 'FAILED'
-- 2. Match webhook callbacks to original transfer attempts
-- 3. Audit trail of all external transfers per settlement
CREATE TABLE settlement_finality (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id     VARCHAR(50) NOT NULL REFERENCES settlement_cases(id) ON DELETE CASCADE,
  rail              VARCHAR(50) NOT NULL,           -- 'moov' | 'modern_treasury'
  external_transfer_id VARCHAR(255),                -- Moov transferID or MT payment order ID
  idempotency_key   VARCHAR(255) NOT NULL,
  finality_status   finality_status NOT NULL DEFAULT 'PENDING',
  amount_cents      BIGINT NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
  leg               VARCHAR(50) NOT NULL,           -- 'seller_payout' | 'fee_sweep'
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  is_fallback       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message     TEXT,
  finalized_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finality_settlement ON settlement_finality(settlement_id);
CREATE INDEX idx_finality_idem_key   ON settlement_finality(idempotency_key);
CREATE INDEX idx_finality_external   ON settlement_finality(external_transfer_id) WHERE external_transfer_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYOUTS — Idempotent payout attempt store
-- ─────────────────────────────────────────────────────────────────────────────
-- Every payout request generates a deterministic idempotency key from:
--   SHA-256(settlement_id | payee_id | amount_cents | action_type)
-- This key is passed to Moov (X-Idempotency-Key) and Modern Treasury
-- (idempotency_key param) to prevent duplicate transfers at the API level.
-- On webhook callbacks, this key matches and deduplicates processing.
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   VARCHAR(50) NOT NULL REFERENCES settlement_cases(id) ON DELETE CASCADE,
  payee_id        VARCHAR(255) NOT NULL,            -- seller account ID or revenue account ID
  idempotency_key VARCHAR(255) NOT NULL,
  rail            VARCHAR(50) NOT NULL,             -- 'moov' | 'modern_treasury'
  action_type     VARCHAR(50) NOT NULL,             -- 'seller_payout' | 'fee_sweep'
  amount_cents    BIGINT NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  status          payout_status NOT NULL DEFAULT 'PENDING',
  external_id     VARCHAR(255),                     -- Moov transferID or MT payment order ID
  error_message   TEXT,
  attempt_count   INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payout_idem_key UNIQUE (idempotency_key)
);

CREATE INDEX idx_payout_settlement ON payouts(settlement_id);
CREATE INDEX idx_payout_status     ON payouts(status) WHERE status NOT IN ('COMPLETED', 'REVERSED');
CREATE INDEX idx_payout_external   ON payouts(external_id) WHERE external_id IS NOT NULL;
