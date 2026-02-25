/* ================================================================
   Migration 010: Global Risk Parameters
   ================================================================
   RSK-010 — Dynamic Operational Risk Parameterization

   Creates a single-row configuration table that stores all
   numeric risk thresholds previously hardcoded in policy-engine.ts.

   Risk Operators can adjust capital limits, ECR thresholds, TRI
   cut-offs, and approval tiers at runtime without a deployment.

   Only ONE active row is permitted (enforced by CHECK + partial
   unique index). Historical rows are retained for audit (is_active
   = false).
   ================================================================ */

CREATE TABLE IF NOT EXISTS global_risk_parameters (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /* ── ECR (Exposure-to-Capital Ratio) ── */
  max_ecr_ratio                   NUMERIC(6,2) NOT NULL DEFAULT 8.00,
  ecr_warn_ratio                  NUMERIC(6,2) NOT NULL DEFAULT 7.00,

  /* ── Hardstop Utilization ── */
  hardstop_util_fail              NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  hardstop_util_warn              NUMERIC(4,3) NOT NULL DEFAULT 0.900,

  /* ── TRI (Transaction Risk Index) Thresholds ── */
  tri_critical_threshold          INTEGER       NOT NULL DEFAULT 8,
  tri_elevated_threshold          INTEGER       NOT NULL DEFAULT 7,
  tri_warn_threshold              INTEGER       NOT NULL DEFAULT 5,
  tri_concentration_factor        NUMERIC(4,3) NOT NULL DEFAULT 0.500,

  /* ── Approval Tier Limits (cents) ── */
  auto_approval_limit_cents       BIGINT        NOT NULL DEFAULT 2500000000,
  desk_head_limit_cents           BIGINT        NOT NULL DEFAULT 5000000000,
  credit_committee_limit_cents    BIGINT        NOT NULL DEFAULT 10000000000,

  /* ── Lifecycle ── */
  is_active                       BOOLEAN       NOT NULL DEFAULT true,
  effective_from                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  effective_until                 TIMESTAMPTZ,
  created_by                      TEXT          NOT NULL DEFAULT 'system',
  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  /* Exactly one active row permitted */
  CONSTRAINT chk_active_until CHECK (
    (is_active = true AND effective_until IS NULL) OR
    (is_active = false)
  )
);

/* Enforce singleton active configuration */
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_params_active
  ON global_risk_parameters (is_active)
  WHERE is_active = true;

/* Seed the default row — these match the previously hardcoded values */
INSERT INTO global_risk_parameters (
  max_ecr_ratio,
  ecr_warn_ratio,
  hardstop_util_fail,
  hardstop_util_warn,
  tri_critical_threshold,
  tri_elevated_threshold,
  tri_warn_threshold,
  tri_concentration_factor,
  auto_approval_limit_cents,
  desk_head_limit_cents,
  credit_committee_limit_cents,
  is_active,
  created_by
) VALUES (
  8.00,
  7.00,
  1.000,
  0.900,
  8,
  7,
  5,
  0.500,
  2500000000,    -- $25M in cents
  5000000000,    -- $50M in cents
  10000000000,   -- $100M in cents
  true,
  'migration-010'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE global_risk_parameters IS 'RSK-010: Dynamic risk parameters for the policy engine. Only one active row permitted.';
