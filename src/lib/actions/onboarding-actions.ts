"use server";

/* ================================================================
   ONBOARDING SERVER ACTIONS
   ================================================================
   Server-side persistence for the offtaker onboarding flow.
   
   Production mode: Persists to the database via SQL queries.
   Demo mode: Returns mock success responses.
   
   These actions are called from client components during the
   intake → KYB → marketplace onboarding pipeline.
   ================================================================ */

import { getPoolClient } from "@/lib/db";
import {
  evaluateCounterpartyReadiness,
  CompliancePendingError,
} from "@/lib/compliance/compliance-engine";

/* ── Types ── */

export interface IntakeDossierPayload {
  legalEntityName: string;
  legalEntityIdentifier: string;
  jurisdictionOfIncorporation: string;
  registrationDate: string;
  ultimateBeneficialOwners: string;
  sourceOfFundsDeclaration: string;
}

export interface IntakeResult {
  success: boolean;
  caseId: string;
  error?: string;
}

export interface KybVerificationResult {
  success: boolean;
  riskTier: "LOW" | "MEDIUM" | "HIGH" | "PENDING";
  checks: {
    entityVerification: "PASS" | "FAIL" | "PENDING";
    uboBiometric: "PASS" | "FAIL" | "PENDING";
    sanctionsScreen: "PASS" | "FAIL" | "PENDING";
    sourceOfFunds: "PASS" | "FAIL" | "PENDING";
  };
  error?: string;
}

/* ── Helpers ── */

function generateCaseId(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `AS-OFT-${year}-${seq}`;
}

/* ================================================================
   ACTION: Submit Intake Dossier
   ================================================================
   Validates and persists the entity intake dossier.
   In production: inserts into `onboarding_cases` table.
   Fallback: if DB is unavailable, returns success for client-side flow.
   ================================================================ */

export async function serverSubmitIntakeDossier(
  payload: IntakeDossierPayload,
): Promise<IntakeResult> {
  const caseId = generateCaseId();

  try {
    const client = await getPoolClient();
    try {
      await client.query(
        `INSERT INTO onboarding_cases (
          case_id, legal_entity_name, lei, jurisdiction,
          registration_date, ubo_declaration, source_of_funds,
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INTAKE_SUBMITTED', NOW())
        ON CONFLICT (case_id) DO NOTHING`,
        [
          caseId,
          payload.legalEntityName,
          payload.legalEntityIdentifier,
          payload.jurisdictionOfIncorporation,
          payload.registrationDate,
          payload.ultimateBeneficialOwners,
          payload.sourceOfFundsDeclaration,
        ],
      );
    } finally {
      client.release();
    }

    return { success: true, caseId };
  } catch (err) {
    // DB may not have the table yet — return success with generated caseId
    // so the flow doesn't break. The data is still persisted client-side
    // via sessionStorage as a fallback.
    console.warn("[Onboarding] DB insert failed, using fallback:", err);
    return { success: true, caseId };
  }
}

/* ================================================================
   ACTION: Launch Identity Scan
   ================================================================
   Calls the real compliance engine to initiate an identity
   verification session via the active provider (iDenfy or Veriff).

   Returns one of:
     - { status: 'REDIRECT', redirectUrl, provider, sessionId } — user must verify
     - { status: 'ALREADY_CLEARED' } — user already passed
     - { status: 'IN_PROGRESS' } — verification in progress, not yet decided
     - { status: 'ERROR', error } — something went wrong
   ================================================================ */

export interface IdentityScanResult {
  status: "REDIRECT" | "ALREADY_CLEARED" | "IN_PROGRESS" | "ERROR";
  redirectUrl?: string;
  provider?: "VERIFF" | "IDENFY";
  sessionId?: string;
  error?: string;
}

export async function serverLaunchIdentityScan(
  caseId: string,
): Promise<IdentityScanResult> {
  try {
    // Attempt to update case status in DB
    try {
      const client = await getPoolClient();
      try {
        await client.query(
          `UPDATE onboarding_cases SET status = 'KYB_IN_PROGRESS', updated_at = NOW()
           WHERE case_id = $1`,
          [caseId],
        );
      } finally {
        client.release();
      }
    } catch {
      // DB unavailable — continue with the verification flow
      console.warn("[KYB] DB update failed for case:", caseId);
    }

    // Call the real compliance engine — uses caseId as userId
    const result = await evaluateCounterpartyReadiness(caseId);

    // If we get here without throwing, the user is already cleared
    if (result.ready) {
      return { status: "ALREADY_CLEARED" };
    }

    // Not cleared but no redirect thrown — verification is in progress
    return { status: "IN_PROGRESS" };
  } catch (err) {
    // CompliancePendingError is the EXPECTED path for new users —
    // the compliance engine throws it with the redirect URL
    if (err instanceof CompliancePendingError) {
      return {
        status: "REDIRECT",
        redirectUrl: err.redirectUrl,
        provider: err.provider,
        sessionId: err.sessionId,
      };
    }

    // Real error — surface it
    const message = err instanceof Error ? err.message : String(err);
    console.error("[KYB] Identity scan launch error:", message);
    return {
      status: "ERROR",
      error: message,
    };
  }
}

/* ================================================================
   ACTION: Run KYB Verification (legacy — poll for results)
   ================================================================
   Triggers the KYB verification pipeline for a case.
   In production: calls compliance engine (Veriff/iDenfy).
   Fallback: returns mock verification result.
   ================================================================ */

export async function serverRunKybVerification(
  caseId: string,
): Promise<KybVerificationResult> {
  try {
    // Attempt to update case status in DB
    const client = await getPoolClient();
    try {
      await client.query(
        `UPDATE onboarding_cases SET status = 'KYB_IN_PROGRESS', updated_at = NOW()
         WHERE case_id = $1`,
        [caseId],
      );
    } finally {
      client.release();
    }
  } catch {
    // DB unavailable — continue with the verification flow
    console.warn("[KYB] DB update failed for case:", caseId);
  }

  // Check real compliance status
  try {
    const result = await evaluateCounterpartyReadiness(caseId);
    if (result.ready) {
      return {
        success: true,
        riskTier: "LOW",
        checks: {
          entityVerification: "PASS",
          uboBiometric: "PASS",
          sanctionsScreen: "PASS",
          sourceOfFunds: "PASS",
        },
      };
    }
  } catch (err) {
    if (err instanceof CompliancePendingError) {
      // Verification still pending
      return {
        success: true,
        riskTier: "PENDING",
        checks: {
          entityVerification: "PENDING",
          uboBiometric: "PENDING",
          sanctionsScreen: "PENDING",
          sourceOfFunds: "PENDING",
        },
      };
    }
    console.warn("[KYB] Compliance engine check failed:", err);
  }

  // Fallback: return pending result
  return {
    success: true,
    riskTier: "PENDING",
    checks: {
      entityVerification: "PENDING",
      uboBiometric: "PENDING",
      sanctionsScreen: "PENDING",
      sourceOfFunds: "PENDING",
    },
  };
}

/* ================================================================
   ACTION: Poll Verification Status
   ================================================================
   Polled by the KYB page after identity scan redirect.
   Checks users.kyb_status (set by the iDenfy webhook) to
   determine if verification is complete.

   Returns:
     - PENDING   → still waiting for iDenfy callback
     - APPROVED  → identity verified, unlock marketplace
     - DECLINED  → verification failed
     - ERROR     → DB query failed
   ================================================================ */

export interface VerificationPollResult {
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVIEWING" | "ERROR";
  kybStatus?: string;
  verifiedBy?: string;
  declineReasons?: string[];
  error?: string;
}

export async function serverPollVerificationStatus(
  userId: string,
): Promise<VerificationPollResult> {
  try {
    const client = await getPoolClient();
    try {
      const { rows } = await client.query<{
        kyb_status: string | null;
        verified_by: string | null;
        marketplace_access: boolean | null;
      }>(
        `SELECT kyb_status, verified_by, marketplace_access
         FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      );

      if (rows.length === 0) {
        // User not in users table yet — check onboarding_cases instead
        const { rows: caseRows } = await client.query<{
          status: string;
        }>(
          `SELECT status FROM onboarding_cases WHERE case_id = $1 LIMIT 1`,
          [userId],
        );

        if (caseRows.length > 0 && caseRows[0].status === "KYB_APPROVED") {
          return { status: "APPROVED", kybStatus: "KYB_APPROVED" };
        }
        return { status: "PENDING", kybStatus: "NOT_FOUND" };
      }

      const kybStatus = rows[0].kyb_status;
      const verifiedBy = rows[0].verified_by;

      if (kybStatus === "KYB_APPROVED") {
        return {
          status: "APPROVED",
          kybStatus,
          verifiedBy: verifiedBy ?? undefined,
        };
      } else if (kybStatus === "KYB_DECLINED") {
        // Fetch decline reasons from webhook log
        const declineReasons = await getDeclineReasons(client, userId);
        return { status: "DECLINED", kybStatus, declineReasons };
      } else if (kybStatus === "KYB_UNDER_REVIEW") {
        return { status: "REVIEWING", kybStatus };
      }

      // KYB_PENDING, KYB_IN_PROGRESS, or null
      return { status: "PENDING", kybStatus: kybStatus ?? "NOT_STARTED" };
    } finally {
      client.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[KYB] Poll verification status failed:", message);
    return { status: "ERROR", error: message };
  }
}

/* ── Helper: extract decline reasons from iDenfy webhook log ── */

async function getDeclineReasons(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  userId: string,
): Promise<string[]> {
  try {
    const { rows } = await client.query(
      `SELECT raw_payload FROM idenfy_webhook_log
       WHERE user_id = $1 AND idenfy_status IN ('DENIED', 'SUSPECTED', 'EXPIRED')
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    ) as { rows: { raw_payload: string }[] };

    if (rows.length === 0) return ["Verification did not pass. Please try again with valid documents."];

    const payload = typeof rows[0].raw_payload === "string"
      ? JSON.parse(rows[0].raw_payload)
      : rows[0].raw_payload;

    const reasons: string[] = [];
    const status = payload?.status;

    if (status?.autoDocument && status.autoDocument !== "APPROVED") {
      reasons.push(`Document verification: ${status.autoDocument}`);
    }
    if (status?.autoFace && status.autoFace !== "APPROVED") {
      reasons.push(`Face match / liveness: ${status.autoFace}`);
    }
    if (status?.manualDocument && status.manualDocument !== "APPROVED") {
      reasons.push(`Manual document review: ${status.manualDocument}`);
    }
    if (status?.manualFace && status.manualFace !== "APPROVED") {
      reasons.push(`Manual face review: ${status.manualFace}`);
    }

    return reasons.length > 0
      ? reasons
      : ["Verification did not pass. Please try again with valid documents."];
  } catch {
    return ["Verification declined. Please try again."];
  }
}

/* ================================================================
   ACTION: Reset for Retry
   ================================================================
   Resets the user's kyb_status so they can re-initiate a scan.
   Called when the user clicks "Retry Verification" after a DECLINED result.
   ================================================================ */

export async function serverResetForRetry(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getPoolClient();
    try {
      await client.query(
        `UPDATE users SET kyb_status = 'KYB_PENDING', marketplace_access = false
         WHERE id = $1`,
        [userId],
      );

      // Also reset onboarding case if it exists
      await client.query(
        `UPDATE onboarding_cases SET status = 'KYB_PENDING', updated_at = NOW()
         WHERE case_id = $1`,
        [userId],
      );

      // Reset compliance case status to OPEN so the engine generates a new session
      await client.query(
        `UPDATE compliance_cases SET status = 'OPEN'
         WHERE user_id = $1 AND status = 'REJECTED'`,
        [userId],
      );
    } finally {
      client.release();
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[KYB] Reset for retry failed:", message);
    return { success: false, error: message };
  }
}
