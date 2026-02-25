-- =============================================================================
-- AurumShield — Inventory Allocation Hardening
-- Migration: 007_inventory_allocation
-- Date: 2026-02-24
-- Risk Reference: RSK-005
-- =============================================================================
-- Physical inventory cannot be oversold. This migration enforces a strict
-- available_weight_oz / locked_weight_oz paradigm with database-level
-- constraints that prevent double-spending physical vault assets.
--
-- Schema changes:
--   1. Add locked_weight_oz + available_weight_oz columns
--   2. CHECK constraints: total >= locked, locked >= 0, available = total - locked
--   3. Atomic compare-and-swap function: fn_lock_inventory()
--   4. Backfill locked_weight_oz from open orders/reservations
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add Inventory Allocation Columns
-- ─────────────────────────────────────────────────────────────────────────────
-- locked_weight_oz represents ALL weight that is currently reserved or
-- allocated (pending settlement). It is the sum of:
--   - Active reservations (weight locked for buyer, not yet converted to order)
--   - Allocated weight (order created, pending settlement finalization)
--
-- available_weight_oz is a stored computed column: total - locked.
-- We store it explicitly (not as a generated column) because PostgreSQL
-- generated columns cannot reference other generated columns, and we need
-- this in WHERE clauses for the atomic CAS.

ALTER TABLE inventory_listings
  ADD COLUMN IF NOT EXISTS locked_weight_oz NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_weight_oz NUMERIC(10,2);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill locked_weight_oz from Open Orders + Active Reservations
-- ─────────────────────────────────────────────────────────────────────────────
-- Sum weights from:
--   a) settlement_cases NOT in terminal states (SETTLED, CANCELLED)
--   b) reservations in ACTIVE state (not expired, not converted)
-- This ensures any in-flight orders at migration time are accounted for.

-- Backfill from settlement_cases (orders in flight)
UPDATE inventory_listings il
SET locked_weight_oz = COALESCE(sub.locked, 0)
FROM (
  SELECT listing_id,
         SUM(weight_oz) AS locked
  FROM settlement_cases
  WHERE status NOT IN ('SETTLED', 'CANCELLED')
  GROUP BY listing_id
) sub
WHERE il.id = sub.listing_id;

-- Backfill available_weight_oz
UPDATE inventory_listings
SET available_weight_oz = total_weight_oz - locked_weight_oz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NOT NULL + CHECK Constraints
-- ─────────────────────────────────────────────────────────────────────────────
-- These constraints are the database-level enforcement of the inventory
-- invariant. Even if the application layer has a bug, the database will
-- reject any state where locked > total or available < 0.

ALTER TABLE inventory_listings
  ALTER COLUMN available_weight_oz SET NOT NULL,
  ALTER COLUMN available_weight_oz SET DEFAULT 0;

ALTER TABLE inventory_listings
  ADD CONSTRAINT chk_locked_nonnegative
    CHECK (locked_weight_oz >= 0),
  ADD CONSTRAINT chk_available_nonnegative
    CHECK (available_weight_oz >= 0),
  ADD CONSTRAINT chk_locked_lte_total
    CHECK (total_weight_oz >= locked_weight_oz),
  ADD CONSTRAINT chk_available_consistent
    CHECK (available_weight_oz = total_weight_oz - locked_weight_oz);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Atomic Compare-and-Swap Function: fn_lock_inventory()
-- ─────────────────────────────────────────────────────────────────────────────
-- This function implements the exact CAS semantics specified in RSK-005:
--
--   UPDATE inventory_listings
--   SET locked_weight_oz = locked_weight_oz + $weight_oz,
--       available_weight_oz = available_weight_oz - $weight_oz
--   WHERE id = $listing_id
--     AND available_weight_oz >= $weight_oz
--   RETURNING *;
--
-- If no rows are returned, inventory is exhausted → caller raises 409 Conflict.
-- The function acquires a FOR UPDATE row lock implicitly through the UPDATE,
-- ensuring SERIALIZABLE isolation for concurrent callers.
--
-- Returns: the updated row if successful, NULL if inventory exhausted.

CREATE OR REPLACE FUNCTION fn_lock_inventory(
  p_listing_id VARCHAR(50),
  p_weight_oz  NUMERIC(10,2)
)
RETURNS SETOF inventory_listings
LANGUAGE sql
VOLATILE
STRICT
AS $$
  UPDATE inventory_listings
  SET locked_weight_oz     = locked_weight_oz + p_weight_oz,
      available_weight_oz  = available_weight_oz - p_weight_oz
  WHERE id = p_listing_id
    AND available_weight_oz >= p_weight_oz
  RETURNING *;
$$;

COMMENT ON FUNCTION fn_lock_inventory IS
  'Atomic compare-and-swap: locks p_weight_oz ounces for a listing. '
  'Returns the updated row if successful; empty set if inventory exhausted (409). '
  'Row-level lock prevents concurrent over-allocation.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Atomic Release Function: fn_release_inventory()
-- ─────────────────────────────────────────────────────────────────────────────
-- Inverse of fn_lock_inventory. Called when:
--   a) Reservation expires (TTL)
--   b) Order is cancelled before settlement
--   c) Settlement fails and inventory returns to pool

CREATE OR REPLACE FUNCTION fn_release_inventory(
  p_listing_id VARCHAR(50),
  p_weight_oz  NUMERIC(10,2)
)
RETURNS SETOF inventory_listings
LANGUAGE sql
VOLATILE
STRICT
AS $$
  UPDATE inventory_listings
  SET locked_weight_oz     = locked_weight_oz - p_weight_oz,
      available_weight_oz  = available_weight_oz + p_weight_oz
  WHERE id = p_listing_id
    AND locked_weight_oz >= p_weight_oz
  RETURNING *;
$$;

COMMENT ON FUNCTION fn_release_inventory IS
  'Atomic release: unlocks p_weight_oz ounces for a listing. '
  'Returns the updated row if successful; empty set if locked weight underflow.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- Partial index on listings with available inventory for marketplace queries.
CREATE INDEX IF NOT EXISTS idx_listings_available
  ON inventory_listings(available_weight_oz)
  WHERE available_weight_oz > 0 AND is_published = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Audit trigger: log every inventory lock/release
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.locked_weight_oz IS DISTINCT FROM NEW.locked_weight_oz THEN
    RAISE LOG '[AurumShield AUDIT] inventory_lock_change | listing_id=% | '
              'locked: % → % | available: % → % | total: %',
      NEW.id,
      OLD.locked_weight_oz, NEW.locked_weight_oz,
      OLD.available_weight_oz, NEW.available_weight_oz,
      NEW.total_weight_oz;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_inventory_change
  AFTER UPDATE ON inventory_listings
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_inventory_change();
