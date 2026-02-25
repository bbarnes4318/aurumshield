/* ================================================================
   RISK CONFIG SERVER — Database-backed risk parameter fetch
   ================================================================
   Extracted from policy-engine.ts to prevent the pg module
   from leaking into client component bundles.

   This file MUST NEVER be statically imported by client components.
   Only server-side API routes and server actions should import it.
   Client-side callers must use dynamic import: await import().
   ================================================================ */

import type { RiskConfiguration } from "./policy-engine";
import { DEFAULT_RISK_CONFIG } from "./policy-engine";

/* ────────────────────────────────────────────────────────────────
   TTL-CACHED CONFIG FETCH
   Aggressive in-memory cache (60s TTL) so the DB is only hit
   once per minute across all request paths. Falls back to
   DEFAULT_RISK_CONFIG if the DB is unreachable.
   ──────────────────────────────────────────────────────────────── */

const CONFIG_TTL_MS = 60_000; // 60 seconds

let _cachedConfig: RiskConfiguration | null = null;
let _cachedAt = 0;

/**
 * Fetch the active RiskConfiguration from the database.
 * Returns cached value if within TTL window.
 * Falls back to DEFAULT_RISK_CONFIG on DB failure.
 */
export async function getActiveRiskConfig(): Promise<RiskConfiguration> {
  const now = Date.now();
  if (_cachedConfig && now - _cachedAt < CONFIG_TTL_MS) {
    return _cachedConfig;
  }

  try {
    const { getDbClient } = await import("@/lib/db");
    const client = await getDbClient();

    try {
      const { rows } = await client.query<{
        max_ecr_ratio: string;
        ecr_warn_ratio: string;
        hardstop_util_fail: string;
        hardstop_util_warn: string;
        tri_critical_threshold: number;
        tri_elevated_threshold: number;
        tri_warn_threshold: number;
        tri_concentration_factor: string;
        auto_approval_limit_cents: string;
        desk_head_limit_cents: string;
        credit_committee_limit_cents: string;
      }>(
        `SELECT * FROM global_risk_parameters WHERE is_active = true LIMIT 1`,
      );

      if (rows.length === 0) {
        console.warn("[RISK-CONFIG] No active risk parameters row — using defaults");
        _cachedConfig = { ...DEFAULT_RISK_CONFIG };
      } else {
        const r = rows[0];
        _cachedConfig = {
          maxEcrRatio: parseFloat(r.max_ecr_ratio),
          ecrWarnRatio: parseFloat(r.ecr_warn_ratio),
          hardstopUtilFail: parseFloat(r.hardstop_util_fail),
          hardstopUtilWarn: parseFloat(r.hardstop_util_warn),
          triCriticalThreshold: r.tri_critical_threshold,
          triElevatedThreshold: r.tri_elevated_threshold,
          triWarnThreshold: r.tri_warn_threshold,
          triConcentrationFactor: parseFloat(r.tri_concentration_factor),
          autoApprovalLimitCents: parseInt(r.auto_approval_limit_cents, 10),
          deskHeadLimitCents: parseInt(r.desk_head_limit_cents, 10),
          creditCommitteeLimitCents: parseInt(r.credit_committee_limit_cents, 10),
        };
      }

      _cachedAt = now;
      return _cachedConfig;
    } finally {
      try { await client.end(); } catch { /* ignore cleanup */ }
    }
  } catch (err) {
    console.error("[RISK-CONFIG] DB fetch failed — using defaults:", err);
    return _cachedConfig ?? { ...DEFAULT_RISK_CONFIG };
  }
}

/**
 * Force-invalidate the cached configuration.
 * Call after an admin updates risk parameters.
 */
export function invalidateRiskConfigCache(): void {
  _cachedConfig = null;
  _cachedAt = 0;
}

// Visible for testing
export { _cachedConfig as __testCachedConfig, _cachedAt as __testCachedAt };
