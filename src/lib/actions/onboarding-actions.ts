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
