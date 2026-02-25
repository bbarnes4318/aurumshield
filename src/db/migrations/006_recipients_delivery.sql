/* ================================================================
   MIGRATION 006 — Recipients, Delivery Audit, KMS Signature Columns
   ================================================================

   Three concerns:
     1. Pre-verified delivery recipients (delegates, custodians)
     2. Append-only delivery_changes audit log (post-DVP_READY lock)
     3. KMS digital signature columns on certificates table

   Run after 005_dvp_escrow.sql.

   Idempotent: all CREATE/ALTER use IF NOT EXISTS.
   ================================================================ */

BEGIN;

/* ──────────────────────────────────────────────────────────────────
   1. RECIPIENTS — Pre-verified delivery delegates
   ────────────────────────────────────────────────────────────────── */

DO $$ BEGIN
  CREATE TYPE recipient_relationship AS ENUM ('self', 'delegate', 'custodian');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS recipients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR(50)  NOT NULL,          -- owner (the buyer)
  name              VARCHAR(255) NOT NULL,
  relationship      recipient_relationship NOT NULL DEFAULT 'self',
  verified_user_id  VARCHAR(50),                    -- if set, must match authenticated user at pickup
  address_json      JSONB,                          -- optional pre-registered address
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipients_user_id
  ON recipients (user_id);

CREATE INDEX IF NOT EXISTS idx_recipients_verified_uid
  ON recipients (verified_user_id)
  WHERE verified_user_id IS NOT NULL;

/* ──────────────────────────────────────────────────────────────────
   2. DELIVERY CHANGES — Append-only audit log
   ────────────────────────────────────────────────────────────────── */

DO $$ BEGIN
  CREATE TYPE delivery_change_type AS ENUM (
    'ADDRESS_CHANGE',
    'RECIPIENT_CHANGE',
    'METHOD_CHANGE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS delivery_changes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          VARCHAR(50)  NOT NULL,
  settlement_id     VARCHAR(50),
  actor_user_id     VARCHAR(50)  NOT NULL,
  change_type       delivery_change_type NOT NULL,
  old_value         JSONB        NOT NULL,
  new_value         JSONB        NOT NULL,
  step_up_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  reason            TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_changes_order
  ON delivery_changes (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_changes_settlement
  ON delivery_changes (settlement_id)
  WHERE settlement_id IS NOT NULL;

/* ──────────────────────────────────────────────────────────────────
   3. KMS SIGNATURE COLUMNS — On certificates table
   ────────────────────────────────────────────────────────────────── */

-- These columns are nullable for backward compatibility with
-- certificates issued before the KMS signing upgrade.

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS signature_alg  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kms_key_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signature      TEXT,
  ADD COLUMN IF NOT EXISTS signed_at      TIMESTAMPTZ;

COMMIT;
