-- ================================================================
-- 028: Compliance Operating System — Foundation Schema
-- ================================================================
-- Phase 1.1: Refinery-centered domain model for the fail-closed
-- Compliance Operating System.
--
-- OPERATING MODEL:
--   Mine → Armored Logistics → Refinery → Assay → Settlement
--   The refinery assay result is the SOURCE OF TRUTH for the
--   economic transaction.
--
-- Table prefix: co_  (avoids collision with V1 compliance_cases)
-- Idempotent: Uses IF NOT EXISTS / DO $$ throughout.
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_subject_type') THEN
    CREATE TYPE co_subject_type AS ENUM (
      'INDIVIDUAL',
      'ENTITY',
      'SUPPLIER',
      'REFINERY',
      'INTERNAL_USER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_case_type') THEN
    CREATE TYPE co_case_type AS ENUM (
      'ONBOARDING',
      'PERIODIC_REVIEW',
      'EVENT_DRIVEN_REVIEW',
      'WALLET_REVIEW',
      'TRAINING_CERTIFICATION',
      'PHYSICAL_SHIPMENT_REVIEW',
      'REFINERY_INTAKE_REVIEW',
      'SETTLEMENT_AUTHORIZATION'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_case_status') THEN
    CREATE TYPE co_case_status AS ENUM (
      'DRAFT',
      'OPEN',
      'AWAITING_SUBJECT',
      'AWAITING_PROVIDER',
      'AWAITING_INTERNAL_REVIEW',
      'ESCALATED',
      'READY_FOR_DISPOSITION',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
      'EXPIRED',
      'CLOSED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_check_type') THEN
    CREATE TYPE co_check_type AS ENUM (
      'EMAIL',
      'PHONE',
      'KYC_ID',
      'LIVENESS',
      'KYB_REGISTRATION',
      'UBO',
      'LEI',
      'SANCTIONS',
      'PEP',
      'ADVERSE_MEDIA',
      'SOURCE_OF_FUNDS',
      'SOURCE_OF_WEALTH',
      'PROOF_OF_ADDRESS',
      'AUTHORIZED_SIGNATORY',
      'WALLET_KYT',
      'CHAIN_OF_CUSTODY',
      'TRANSPORT_INTEGRITY',
      'SANCTIONS_ORIGIN',
      'REFINERY_ELIGIBILITY',
      'REFINERY_LOT_MATCH',
      'REFINERY_ASSAY_CONFIRMATION',
      'TRAINING_COMPLETION'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_normalized_verdict') THEN
    CREATE TYPE co_normalized_verdict AS ENUM (
      'PASS',
      'FAIL',
      'REVIEW',
      'ERROR',
      'EXPIRED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_shipment_status') THEN
    CREATE TYPE co_shipment_status AS ENUM (
      'CREATED',
      'PENDING_DISPATCH',
      'DISPATCHED',
      'IN_TRANSIT',
      'DELIVERED_TO_REFINERY',
      'RECEIVED_BY_REFINERY',
      'CLEARED_FOR_INTAKE',
      'REJECTED_AT_DELIVERY',
      'QUARANTINED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_assay_status') THEN
    CREATE TYPE co_assay_status AS ENUM (
      'PENDING_RECEIPT',
      'PENDING',
      'IN_PROGRESS',
      'COMPLETE',
      'SETTLEMENT_READY',
      'DISPUTED',
      'FAILED',
      'ASSAY_EXCEPTION'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_custody_event_type') THEN
    CREATE TYPE co_custody_event_type AS ENUM (
      'PICKUP',
      'TRANSFER',
      'TRANSPORT',
      'DELIVERY',
      'REFINERY_RECEIPT',
      'SEAL_CHECK'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_settlement_verdict') THEN
    CREATE TYPE co_settlement_verdict AS ENUM (
      'AUTHORIZED',
      'DENIED',
      'PENDING_REVIEW',
      'EXPIRED'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- SHARED updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_co_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- CORE COMPLIANCE TABLES
-- ─────────────────────────────────────────────────────────────────

-- ── Compliance Subjects ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type    co_subject_type NOT NULL,
  user_id         UUID,
  entity_id       UUID,
  legal_name      VARCHAR(512) NOT NULL,
  risk_tier       VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_subjects_user_id   ON co_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_co_subjects_entity_id ON co_subjects(entity_id);
CREATE INDEX IF NOT EXISTS idx_co_subjects_type      ON co_subjects(subject_type);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_subjects_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_subjects_updated_at
      BEFORE UPDATE ON co_subjects
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Policy Snapshots (IMMUTABLE — no updated_at trigger) ─────────

CREATE TABLE IF NOT EXISTS co_policy_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version         INTEGER NOT NULL,
  effective_at    TIMESTAMPTZ NOT NULL,
  rules_payload   JSONB NOT NULL,
  created_by      VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Compliance Cases ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id            UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  case_type             co_case_type NOT NULL,
  status                co_case_status NOT NULL DEFAULT 'DRAFT',
  priority              INTEGER NOT NULL DEFAULT 0,
  policy_snapshot_id    UUID NOT NULL REFERENCES co_policy_snapshots(id) ON DELETE RESTRICT,
  assigned_reviewer_id  UUID,
  closed_at             TIMESTAMPTZ,
  closed_reason         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_cases_subject_id      ON co_cases(subject_id);
CREATE INDEX IF NOT EXISTS idx_co_cases_status           ON co_cases(status);
CREATE INDEX IF NOT EXISTS idx_co_cases_policy_snapshot  ON co_cases(policy_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_co_cases_reviewer         ON co_cases(assigned_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_co_cases_type             ON co_cases(case_type);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_cases_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_cases_updated_at
      BEFORE UPDATE ON co_cases
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Compliance Checks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_checks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES co_cases(id) ON DELETE RESTRICT,
  check_type          co_check_type NOT NULL,
  provider            VARCHAR(100) NOT NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  result_code         VARCHAR(100),
  normalized_verdict  co_normalized_verdict,
  raw_payload_ref     TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_checks_case_id  ON co_checks(case_id);
CREATE INDEX IF NOT EXISTS idx_co_checks_type     ON co_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_co_checks_verdict  ON co_checks(normalized_verdict);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_checks_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_checks_updated_at
      BEFORE UPDATE ON co_checks
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Compliance Decisions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES co_cases(id) ON DELETE RESTRICT,
  subject_id      UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  decision_type   VARCHAR(20) NOT NULL,
  decision        VARCHAR(50) NOT NULL,
  reason_codes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_hash   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_decisions_case_id    ON co_decisions(case_id);
CREATE INDEX IF NOT EXISTS idx_co_decisions_subject_id ON co_decisions(subject_id);
CREATE INDEX IF NOT EXISTS idx_co_decisions_expires    ON co_decisions(expires_at);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_co_decision_type_valid'
  ) THEN
    ALTER TABLE co_decisions
      ADD CONSTRAINT chk_co_decision_type_valid
      CHECK (decision_type IN ('INTERIM', 'FINAL'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_decisions_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_decisions_updated_at
      BEFORE UPDATE ON co_decisions
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Compliance Audit Events (IMMUTABLE — no updated_at trigger) ──

CREATE TABLE IF NOT EXISTS co_audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type  VARCHAR(100) NOT NULL,
  aggregate_id    UUID NOT NULL,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash            TEXT NOT NULL,
  previous_hash   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_audit_aggregate  ON co_audit_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_co_audit_event_type ON co_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_co_audit_created    ON co_audit_events(created_at);

-- ─────────────────────────────────────────────────────────────────
-- PHYSICAL SUPPLY CHAIN TABLES
-- ─────────────────────────────────────────────────────────────────

-- ── Physical Shipments (Mine → Refinery via Brink's) ─────────────

CREATE TABLE IF NOT EXISTS co_physical_shipments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_subject_id   UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  mine_reference        VARCHAR(255) NOT NULL,
  origin_country        VARCHAR(100) NOT NULL,
  brinks_reference      VARCHAR(255),
  armored_carrier_name  VARCHAR(255) NOT NULL,
  shipment_status       co_shipment_status NOT NULL DEFAULT 'PENDING_DISPATCH',
  dispatched_at         TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  refinery_subject_id   UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_shipments_supplier ON co_physical_shipments(supplier_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_shipments_refinery ON co_physical_shipments(refinery_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_shipments_status   ON co_physical_shipments(shipment_status);
CREATE INDEX IF NOT EXISTS idx_co_shipments_brinks   ON co_physical_shipments(brinks_reference);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_shipments_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_shipments_updated_at
      BEFORE UPDATE ON co_physical_shipments
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Chain of Custody Events ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_chain_of_custody_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id           UUID NOT NULL REFERENCES co_physical_shipments(id) ON DELETE RESTRICT,
  event_type            co_custody_event_type NOT NULL,
  location              VARCHAR(512),
  event_timestamp       TIMESTAMPTZ NOT NULL,
  party_from            VARCHAR(255),
  party_to              VARCHAR(255),
  seal_number           VARCHAR(100),
  verification_status   VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_coc_shipment   ON co_chain_of_custody_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_co_coc_event_type ON co_chain_of_custody_events(event_type);
CREATE INDEX IF NOT EXISTS idx_co_coc_timestamp  ON co_chain_of_custody_events(event_timestamp);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_coc_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_coc_updated_at
      BEFORE UPDATE ON co_chain_of_custody_events
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- REFINERY TRUTH TABLES
-- ─────────────────────────────────────────────────────────────────

-- ── Refinery Lots — COMMERCIAL SOURCE OF TRUTH ───────────────────
-- The refinery assay determines the actual economic value.
-- Buyer pays ONLY for assay-confirmed payable output.
-- Trade logic is SUBORDINATE to this table.

CREATE TABLE IF NOT EXISTS co_refinery_lots (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id               UUID NOT NULL REFERENCES co_physical_shipments(id) ON DELETE RESTRICT,
  supplier_subject_id       UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  refinery_subject_id       UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  intake_case_id            UUID REFERENCES co_cases(id) ON DELETE RESTRICT,
  received_at               TIMESTAMPTZ,
  assay_status              co_assay_status NOT NULL DEFAULT 'PENDING',
  gross_weight              NUMERIC(12,4),
  net_weight                NUMERIC(12,4),
  fineness                  NUMERIC(8,6),
  recoverable_gold_weight   NUMERIC(12,4),
  payable_gold_weight       NUMERIC(12,4),
  payable_value             NUMERIC(15,2),
  assay_certificate_ref     TEXT,
  settlement_ready          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_lots_shipment        ON co_refinery_lots(shipment_id);
CREATE INDEX IF NOT EXISTS idx_co_lots_supplier        ON co_refinery_lots(supplier_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_lots_refinery        ON co_refinery_lots(refinery_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_lots_assay_status    ON co_refinery_lots(assay_status);
CREATE INDEX IF NOT EXISTS idx_co_lots_settlement_ready ON co_refinery_lots(settlement_ready);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_lots_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_lots_updated_at
      BEFORE UPDATE ON co_refinery_lots
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- SETTLEMENT AUTHORIZATION
-- ─────────────────────────────────────────────────────────────────
-- Settlement happens AFTER refinery truth is known.
-- Fail-closed: ALL preconditions must be satisfied.

CREATE TABLE IF NOT EXISTS co_settlement_authorizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refinery_lot_id       UUID NOT NULL REFERENCES co_refinery_lots(id) ON DELETE RESTRICT,
  buyer_subject_id      UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  compliance_case_id    UUID NOT NULL REFERENCES co_cases(id) ON DELETE RESTRICT,
  verdict               co_settlement_verdict NOT NULL,
  payable_value         NUMERIC(15,2) NOT NULL,
  payment_rail          VARCHAR(100) NOT NULL,
  policy_snapshot_id    UUID NOT NULL REFERENCES co_policy_snapshots(id) ON DELETE RESTRICT,
  decision_hash         TEXT NOT NULL,
  expires_at            TIMESTAMPTZ,
  authorized_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_settle_lot     ON co_settlement_authorizations(refinery_lot_id);
CREATE INDEX IF NOT EXISTS idx_co_settle_buyer   ON co_settlement_authorizations(buyer_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_settle_case    ON co_settlement_authorizations(compliance_case_id);
CREATE INDEX IF NOT EXISTS idx_co_settle_verdict ON co_settlement_authorizations(verdict);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_settle_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_settle_updated_at
      BEFORE UPDATE ON co_settlement_authorizations
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- WALLET / CRYPTO RAIL TABLES
-- ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_wallet_risk_tier') THEN
    CREATE TYPE co_wallet_risk_tier AS ENUM (
      'LOW',
      'MEDIUM',
      'HIGH',
      'SEVERE'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_wallet_status') THEN
    CREATE TYPE co_wallet_status AS ENUM (
      'ACTIVE',
      'FROZEN',
      'BLOCKED',
      'PENDING_REVIEW'
    );
  END IF;
END $$;

-- ── Wallet Addresses ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS co_wallet_addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_subject_id    UUID NOT NULL REFERENCES co_subjects(id) ON DELETE RESTRICT,
  address             VARCHAR(255) NOT NULL,
  chain               VARCHAR(50) NOT NULL,
  asset               VARCHAR(50) NOT NULL,
  label               VARCHAR(255),
  status              co_wallet_status NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_wallets_owner   ON co_wallet_addresses(owner_subject_id);
CREATE INDEX IF NOT EXISTS idx_co_wallets_address ON co_wallet_addresses(address);
CREATE INDEX IF NOT EXISTS idx_co_wallets_chain   ON co_wallet_addresses(chain);
CREATE INDEX IF NOT EXISTS idx_co_wallets_status  ON co_wallet_addresses(status);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_wallets_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_wallets_updated_at
      BEFORE UPDATE ON co_wallet_addresses
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ── Wallet Screenings (append-only — no updated_at trigger) ──────

CREATE TABLE IF NOT EXISTS co_wallet_screenings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_id     UUID NOT NULL REFERENCES co_wallet_addresses(id) ON DELETE RESTRICT,
  provider              VARCHAR(100) NOT NULL,
  risk_score            NUMERIC(5,2),
  risk_tier             co_wallet_risk_tier NOT NULL,
  sanctions_exposure    BOOLEAN NOT NULL DEFAULT FALSE,
  illicit_activity_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload_ref       TEXT,
  screened_at           TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_screenings_wallet   ON co_wallet_screenings(wallet_address_id);
CREATE INDEX IF NOT EXISTS idx_co_screenings_risk     ON co_wallet_screenings(risk_tier);
CREATE INDEX IF NOT EXISTS idx_co_screenings_screened ON co_wallet_screenings(screened_at);

-- ─────────────────────────────────────────────────────────────────
-- CASE TASKS
-- ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_case_task_status') THEN
    CREATE TYPE co_case_task_status AS ENUM (
      'PENDING',
      'COMPLETED',
      'WAIVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS co_case_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES co_cases(id) ON DELETE RESTRICT,
  task_type     VARCHAR(100) NOT NULL,
  description   TEXT NOT NULL,
  status        co_case_task_status NOT NULL DEFAULT 'PENDING',
  assignee_id   UUID,
  required      BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID,
  completion_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_case_tasks_case     ON co_case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_co_case_tasks_status   ON co_case_tasks(status);
CREATE INDEX IF NOT EXISTS idx_co_case_tasks_assignee ON co_case_tasks(assignee_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_co_case_tasks_updated_at'
  ) THEN
    CREATE TRIGGER trg_co_case_tasks_updated_at
      BEFORE UPDATE ON co_case_tasks
      FOR EACH ROW EXECUTE FUNCTION set_co_updated_at();
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- ADDENDUM: co_subject_status ENUM + column migration
-- Finding #4: Convert co_subjects.status from VARCHAR(50) to pgEnum
-- Canonical values: PENDING, ACTIVE, SUSPENDED, FROZEN, BLOCKED, DEACTIVATED
-- ════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'co_subject_status') THEN
    CREATE TYPE co_subject_status AS ENUM (
      'PENDING',
      'ACTIVE',
      'SUSPENDED',
      'FROZEN',
      'BLOCKED',
      'DEACTIVATED'
    );
  END IF;
END $$;

-- Safely convert co_subjects.status from VARCHAR(50) to co_subject_status.
-- Any existing values that don't match the enum will be mapped to 'PENDING'.
DO $$ BEGIN
  -- First, normalize any unexpected values to 'PENDING'
  UPDATE co_subjects
    SET status = 'PENDING'
    WHERE status NOT IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'FROZEN', 'BLOCKED', 'DEACTIVATED');

  -- Then alter the column type using the enum cast
  ALTER TABLE co_subjects
    ALTER COLUMN status TYPE co_subject_status
    USING status::co_subject_status;

  -- Set the default to use the enum value
  ALTER TABLE co_subjects
    ALTER COLUMN status SET DEFAULT 'ACTIVE'::co_subject_status;
EXCEPTION
  WHEN others THEN
    -- Column may already be the correct type — safe to skip
    RAISE NOTICE 'co_subjects.status may already be co_subject_status type: %', SQLERRM;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- END: 028_compliance_os_foundation.sql
-- ════════════════════════════════════════════════════════════════════

