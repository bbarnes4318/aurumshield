/* ================================================================
   MIGRATION 009 — Institutional State Machine Overhaul (RSK-007)
   ================================================================

   Problem:
     settlement_status_enum lacks vocabulary for real-world clearing:
     - Network partitions during rail communication
     - Ambiguous states when Modern Treasury/Moov responses are lost
     - Reversals from disputes or rollbacks

   Solution:
     Add three Tier-1 operational states:
       PROCESSING_RAIL  — Money is mid-flight; UI must be locked
       AMBIGUOUS_STATE  — Timeout or partition occurred; requires
                          polling or manual reconciliation
       REVERSED         — Dispute or rollback initiated by counterparty

   Run after 008_clearing_ledger.sql.
   Idempotent: uses IF NOT EXISTS pattern for enum values.
   ================================================================ */

BEGIN;

/* ──────────────────────────────────────────────────────────────────
   1. ADD ENUM VALUES — settlement_status_enum
   ────────────────────────────────────────────────────────────────── */

-- PROCESSING_RAIL: Funds submitted to external rail, awaiting confirmation.
-- UI must display a locked/spinner state. No user actions permitted.
DO $$ BEGIN
  ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING_RAIL' AFTER 'AUTHORIZED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AMBIGUOUS_STATE: Rail communication timed out or returned indeterminate.
-- Requires automated polling retry or manual operator reconciliation.
-- Only RESOLVE_AMBIGUOUS, FAIL_SETTLEMENT, CANCEL_SETTLEMENT allowed.
DO $$ BEGIN
  ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'AMBIGUOUS_STATE' AFTER 'PROCESSING_RAIL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- REVERSED: Dispute filed or rollback initiated by counterparty/compliance.
-- Terminal-adjacent state — may transition to FAILED or require new settlement.
DO $$ BEGIN
  ALTER TYPE settlement_status_enum ADD VALUE IF NOT EXISTS 'REVERSED' AFTER 'SETTLED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ──────────────────────────────────────────────────────────────────
   2. TRANSITION GUARD — Prevent invalid transitions at DB level
   ────────────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION fn_guard_settlement_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Block all mutations when in PROCESSING_RAIL except status changes
  -- by the system (rail webhook handler)
  IF OLD.status = 'PROCESSING_RAIL' AND NEW.status = OLD.status THEN
    -- Allow non-status field updates while processing (e.g. updated_at)
    RETURN NEW;
  END IF;

  -- PROCESSING_RAIL can only transition to:
  --   SETTLED, AMBIGUOUS_STATE, FAILED
  IF OLD.status = 'PROCESSING_RAIL' AND NEW.status NOT IN (
    'SETTLED', 'AMBIGUOUS_STATE', 'FAILED', 'PROCESSING_RAIL'
  ) THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: PROCESSING_RAIL can only transition to SETTLED, AMBIGUOUS_STATE, or FAILED. Attempted: %', NEW.status;
  END IF;

  -- AMBIGUOUS_STATE can only transition to:
  --   ESCROW_OPEN (re-process), FAILED, CANCELLED
  IF OLD.status = 'AMBIGUOUS_STATE' AND NEW.status NOT IN (
    'ESCROW_OPEN', 'FAILED', 'CANCELLED', 'AMBIGUOUS_STATE'
  ) THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: AMBIGUOUS_STATE can only transition to ESCROW_OPEN, FAILED, or CANCELLED. Attempted: %', NEW.status;
  END IF;

  -- REVERSED is terminal — no further transitions except FAILED
  IF OLD.status = 'REVERSED' AND NEW.status NOT IN ('FAILED', 'REVERSED') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: REVERSED can only transition to FAILED. Attempted: %', NEW.status;
  END IF;

  -- Terminal states block all transitions
  IF OLD.status IN ('SETTLED', 'FAILED', 'CANCELLED') AND OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: % is terminal — no further transitions allowed. Attempted: %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_settlement_transition_guard ON settlement_cases;
CREATE TRIGGER trg_settlement_transition_guard
  BEFORE UPDATE ON settlement_cases
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.status = 'PROCESSING_RAIL')
  EXECUTE FUNCTION fn_guard_settlement_transition();

/* ──────────────────────────────────────────────────────────────────
   3. AUDIT COLUMN — Track rail submission timestamp
   ────────────────────────────────────────────────────────────────── */

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS rail_submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rail_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rail_reference_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reversal_reason    TEXT,
  ADD COLUMN IF NOT EXISTS reversed_at        TIMESTAMPTZ;

COMMIT;
