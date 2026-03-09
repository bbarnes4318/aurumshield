/* ================================================================
   MIGRATION 014 — Fee Sweep Columns on settlement_cases
   ================================================================

   Adds two columns to permanently store the platform fee extraction
   and net clearing amount computed by the Admin Clearing Engine
   before settling the asset.

   - platform_fee_usd:    1% platform revenue extracted at clearing
   - clearing_amount_usd: notional minus platform fee (net to vault)

   Run after 013_waitlist_leads.sql.
   Idempotent: uses IF NOT EXISTS.
   ================================================================ */

BEGIN;

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS platform_fee_usd NUMERIC(14,2);

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS clearing_amount_usd NUMERIC(14,2);

COMMENT ON COLUMN settlement_cases.platform_fee_usd IS
  '1% platform fee swept at clearing time. NULL until SETTLED.';

COMMENT ON COLUMN settlement_cases.clearing_amount_usd IS
  'Net clearing liability (notional - platform fee). NULL until SETTLED.';

COMMIT;
