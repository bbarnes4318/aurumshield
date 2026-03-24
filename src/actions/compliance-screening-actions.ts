"use server";

/* ================================================================
   AML/PEP SCREENING — Air-Gapped OpenSanctions Engine
   ================================================================
   Server-only action that screens counterparty entities against the
   internally-hosted Yente (OpenSanctions) matching API.

   CRITICAL SECURITY INVARIANT:
     This function NEVER fails open. If the screening engine is
     unreachable, it throws COMPLIANCE_OFFLINE. If a match is found
     above the threshold, it returns REJECTED. The caller MUST treat
     any thrown error as a hard block.

   Threshold: 0.80 (80% match confidence)
   Timeout:   3000ms (AbortController)
   ================================================================ */

import { emitAuditEvent } from "@/lib/audit-logger";

/* ── Result types ── */

export interface ScreeningCleared {
  status: "CLEARED";
}

export interface ScreeningRejected {
  status: "REJECTED";
  reason: "AML_WATCHLIST_MATCH";
  matchId: string;
  matchScore: number;
  matchName: string;
}

export type ScreeningResult = ScreeningCleared | ScreeningRejected;

/* ── Yente response shapes ── */

interface YenteMatchResult {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  referents: string[];
  score: number;
}

interface YenteMatchResponse {
  responses: {
    [queryId: string]: {
      query: Record<string, unknown>;
      results: YenteMatchResult[];
      total: { value: number; relation: string };
    };
  };
}

/* ── Constants ── */

const YENTE_URL = process.env.YENTE_URL || "http://localhost:8000";
const MATCH_THRESHOLD = 0.80;
const TIMEOUT_MS = 3_000;

/* ── Core screening function ── */

/**
 * Screen a counterparty entity against the OpenSanctions watchlists.
 *
 * @param legalName   - The legal name of the entity to screen
 * @param jurisdiction - Optional ISO country code or jurisdiction label
 *
 * @returns ScreeningResult - CLEARED or REJECTED with match details
 * @throws  Error("COMPLIANCE_OFFLINE: ...") if yente is unreachable
 *
 * INVARIANT: This function NEVER returns CLEARED if the fetch fails.
 */
export async function screenCounterpartyEntity(
  legalName: string,
  jurisdiction?: string,
): Promise<ScreeningResult> {
  /* ── Production Auth: Sanctions screening is compliance-critical — demo-mock identity REJECTED ── */
  const { requireProductionAuth } = await import("@/lib/authz");
  await requireProductionAuth();

  // ── 1. Build the Yente match payload ──
  const properties: Record<string, string[]> = {
    name: [legalName],
  };
  if (jurisdiction) {
    properties.country = [jurisdiction];
  }

  const payload = {
    queries: {
      q1: {
        schema: "LegalEntity",
        properties,
      },
    },
  };

  // ── 2. Execute the screening request with hard timeout ──
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${YENTE_URL}/match/default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);

    const detail = err instanceof Error ? err.message : "Unknown fetch error";

    emitAuditEvent("AML_SCREENING_OFFLINE", "P1_ALERT", {
      legalName,
      jurisdiction: jurisdiction ?? "N/A",
      error: detail,
    });

    throw new Error(
      `COMPLIANCE_OFFLINE: Cannot verify entity at this time. Detail: ${detail}`,
    );
  }

  clearTimeout(timeout);

  // ── 3. Parse and validate the response ──
  if (!response.ok) {
    emitAuditEvent("AML_SCREENING_ERROR", "CRITICAL", {
      legalName,
      jurisdiction: jurisdiction ?? "N/A",
      httpStatus: response.status,
      statusText: response.statusText,
    });

    throw new Error(
      `COMPLIANCE_OFFLINE: Yente returned HTTP ${response.status}. Cannot verify entity.`,
    );
  }

  const data: YenteMatchResponse = await response.json();

  // ── 4. Evaluate the match results ──
  const queryResult = data.responses?.q1;
  if (!queryResult || !queryResult.results || queryResult.results.length === 0) {
    // No matches at all — entity is cleared
    emitAuditEvent("AML_SCREENING_CLEARED", "INFO", {
      legalName,
      jurisdiction: jurisdiction ?? "N/A",
      totalResults: 0,
    });

    return { status: "CLEARED" };
  }

  // Get the top match (Yente returns results sorted by score descending)
  const topMatch = queryResult.results[0];

  if (topMatch.score >= MATCH_THRESHOLD) {
    emitAuditEvent("AML_SCREENING_REJECTED", "CRITICAL", {
      legalName,
      jurisdiction: jurisdiction ?? "N/A",
      matchId: topMatch.id,
      matchScore: topMatch.score,
      matchCaption: topMatch.caption,
      matchDatasets: topMatch.datasets,
    });

    return {
      status: "REJECTED",
      reason: "AML_WATCHLIST_MATCH",
      matchId: topMatch.id,
      matchScore: topMatch.score,
      matchName: topMatch.caption,
    };
  }

  // Below threshold — cleared
  emitAuditEvent("AML_SCREENING_CLEARED", "INFO", {
    legalName,
    jurisdiction: jurisdiction ?? "N/A",
    topScore: topMatch.score,
    topMatchId: topMatch.id,
  });

  return { status: "CLEARED" };
}
