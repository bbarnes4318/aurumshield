/* ================================================================
   MIGRATION 008 — Immutable Double-Entry Clearing Ledger (RSK-006)
   ================================================================

   Problem:
     A single settlement_cases.status = 'SETTLED' is legally insufficient
     for Tier-1 clearing. If a DB update fails mid-flight, funds are lost
     with no compensating record.

   Solution:
     Implement a classical double-entry ledger where every fund movement
     produces a balanced journal (debits === credits). Mapped 1:1 to
     external Moov / Modern Treasury API calls.

   Tables:
     1. ledger_accounts — Named accounts (escrow, buyer, seller, fee)
     2. ledger_journals — Settlement-scoped journal headers
     3. ledger_entries  — Individual debit/credit lines

   Constraints:
     - direction ENUM: exactly CREDIT or DEBIT
     - amount_cents > 0  (never zero, never negative)
     - journal immutability: no UPDATE/DELETE triggers
     - idempotency_key on settlement_cases

   Run after 007_inventory_allocation.sql.
   Idempotent: all CREATE/ALTER use IF NOT EXISTS.
   ================================================================ */

BEGIN;

/* ──────────────────────────────────────────────────────────────────
   1. ENUM — Entry direction
   ────────────────────────────────────────────────────────────────── */

DO $$ BEGIN
  CREATE TYPE ledger_direction AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/* ──────────────────────────────────────────────────────────────────
   2. LEDGER ACCOUNTS — Named buckets for fund movement
   ────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) UNIQUE NOT NULL,    -- e.g. 'BUYER_ESCROW', 'SELLER_PROCEEDS', 'PLATFORM_FEE'
  name        VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'liability',
  currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Seed canonical accounts (idempotent via ON CONFLICT) */
INSERT INTO ledger_accounts (code, name, account_type) VALUES
  ('BUYER_ESCROW',     'Buyer Escrow Holding',     'liability'),
  ('SELLER_PROCEEDS',  'Seller Settlement Proceeds', 'liability'),
  ('PLATFORM_FEE',     'Platform Clearing Fee',    'revenue'),
  ('SETTLEMENT_ESCROW','Settlement Escrow Control', 'liability'),
  ('GOLD_CUSTODY',     'Gold Custody Account',     'asset')
ON CONFLICT (code) DO NOTHING;

/* ──────────────────────────────────────────────────────────────────
   3. LEDGER JOURNALS — One per settlement event (immutable headers)
   ────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS ledger_journals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_case_id  VARCHAR(50) NOT NULL,
  idempotency_key     UUID UNIQUE NOT NULL,
  description         TEXT NOT NULL,
  posted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  -- FK to settlement_cases.id
  CONSTRAINT fk_journal_settlement
    FOREIGN KEY (settlement_case_id)
    REFERENCES settlement_cases(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ledger_journals_settlement
  ON ledger_journals (settlement_case_id);

CREATE INDEX IF NOT EXISTS idx_ledger_journals_idempotency
  ON ledger_journals (idempotency_key);

/* ──────────────────────────────────────────────────────────────────
   4. LEDGER ENTRIES — Individual debit/credit lines (immutable)
   ────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS ledger_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id  UUID NOT NULL,
  account_id  UUID NOT NULL,
  direction   ledger_direction NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- FK constraints
  CONSTRAINT fk_entry_journal
    FOREIGN KEY (journal_id)
    REFERENCES ledger_journals(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_entry_account
    FOREIGN KEY (account_id)
    REFERENCES ledger_accounts(id)
    ON DELETE RESTRICT,
  -- amount_cents must be strictly positive
  CONSTRAINT chk_amount_positive
    CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal
  ON ledger_entries (journal_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account
  ON ledger_entries (account_id);

/* ──────────────────────────────────────────────────────────────────
   5. IMMUTABILITY TRIGGERS — Prevent UPDATE/DELETE on journal data
   ────────────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION fn_immutable_ledger_guard()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_LEDGER_VIOLATION: % on % is prohibited. Ledger entries are append-only.', TG_OP, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Guard journals
DROP TRIGGER IF EXISTS trg_journals_immutable ON ledger_journals;
CREATE TRIGGER trg_journals_immutable
  BEFORE UPDATE OR DELETE ON ledger_journals
  FOR EACH ROW
  EXECUTE FUNCTION fn_immutable_ledger_guard();

-- Guard entries
DROP TRIGGER IF EXISTS trg_entries_immutable ON ledger_entries;
CREATE TRIGGER trg_entries_immutable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_immutable_ledger_guard();

/* ──────────────────────────────────────────────────────────────────
   6. BALANCED JOURNAL ASSERTION — Runtime check function
   ────────────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION fn_assert_journal_balanced(p_journal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_debits  BIGINT;
  v_credits BIGINT;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'DEBIT'  THEN amount_cents END), 0),
    COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_cents END), 0)
  INTO v_debits, v_credits
  FROM ledger_entries
  WHERE journal_id = p_journal_id;

  IF v_debits <> v_credits THEN
    RAISE EXCEPTION 'UNBALANCED_JOURNAL: journal_id=% debits=% credits=%',
      p_journal_id, v_debits, v_credits;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

/* ──────────────────────────────────────────────────────────────────
   7. IDEMPOTENCY KEY on settlement_cases
   ────────────────────────────────────────────────────────────────── */

ALTER TABLE settlement_cases
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Backfill existing rows with random UUIDs
UPDATE settlement_cases
  SET idempotency_key = gen_random_uuid()
  WHERE idempotency_key IS NULL;

-- Now enforce NOT NULL + UNIQUE
ALTER TABLE settlement_cases
  ALTER COLUMN idempotency_key SET NOT NULL;

-- Add unique constraint if not exists
DO $$ BEGIN
  ALTER TABLE settlement_cases
    ADD CONSTRAINT uq_settlement_idempotency_key UNIQUE (idempotency_key);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

COMMIT;
`, "Complexity": 7, "Description": "Production-grade SQL migration for the immutable double-entry clearing ledger with journals, entries, direction enum, immutability triggers, balanced journal assertion function, and idempotency_key on settlement_cases.", "EmptyFile": false, "IsArtifact": false, "Overwrite": false, "TargetFile": "c:\\Users\\jimbo\\OneDrive\\Desktop\\gold\\src\\db\\migrations\\008_clearing_ledger.sql"}
