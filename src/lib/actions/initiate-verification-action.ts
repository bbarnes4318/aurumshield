"use server";

/* ================================================================
   SERVER ACTION: Initiate Verification
   ================================================================
   Purpose-built server action for the institutional guided
   verification flow. Creates (or reuses) a compliance case and
   routes the user to the active compliance provider (iDenfy/Veriff).

   Reuses:
     • createComplianceCase()          — idempotent upsert
     • evaluateCounterpartyReadiness() — multi-vendor provider routing
     • CompliancePendingError          — redirect URL extraction

   Called from: POST /api/compliance/cases/me/initiate
   ================================================================ */

import { requireSession, AuthError } from "@/lib/authz";
import {
  createComplianceCase,
} from "@/lib/compliance/models";
import {
  evaluateCounterpartyReadiness,
  CompliancePendingError,
} from "@/lib/compliance/compliance-engine";

/* ── Result Type ── */

export interface InitiateVerificationResult {
  status: "REDIRECT" | "ALREADY_CLEARED" | "IN_PROGRESS" | "ERROR";
  redirectUrl?: string;
  provider?: "VERIFF" | "IDENFY";
  sessionId?: string;
  error?: string;
}

/* ── Action ── */

export async function serverInitiateVerification(): Promise<InitiateVerificationResult> {
  /* ── Step 1: Authenticate ── */
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: "ERROR", error: err.message };
    }
    throw err;
  }

  const userId = session.userId;

  console.log(
    `[INITIATE_VERIFICATION] ▶ serverInitiateVerification called for userId="${userId}"`,
  );

  /* ── Step 2: Ensure compliance case exists (idempotent upsert) ── */
  try {
    const cc = await createComplianceCase({
      userId,
      status: "OPEN",
      entityType: "company",
    });

    console.log(
      `[INITIATE_VERIFICATION] Step 2 ✔ Compliance case ensured: id=${cc.id} status=${cc.status}`,
    );

    /* If the case is already APPROVED, no initiation needed */
    if (cc.status === "APPROVED") {
      console.log("[INITIATE_VERIFICATION] Case already APPROVED — returning ALREADY_CLEARED");
      return { status: "ALREADY_CLEARED" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[INITIATE_VERIFICATION] ✘ Failed to ensure compliance case:", message);
    return {
      status: "ERROR",
      error: `Failed to create verification case: ${message}`,
    };
  }

  /* ── Step 3: Call the compliance engine ── */
  try {
    console.log(
      `[INITIATE_VERIFICATION] Step 3: Calling evaluateCounterpartyReadiness("${userId}")`,
    );

    const result = await evaluateCounterpartyReadiness(userId);

    /* If we get here without throwing, the user is already cleared or in-progress */
    if (result.ready) {
      console.log("[INITIATE_VERIFICATION] Step 3 ✔ User is CLEARED");
      return { status: "ALREADY_CLEARED" };
    }

    /* Not ready but no CompliancePendingError — verification is in a transitional state */
    console.log(
      `[INITIATE_VERIFICATION] Step 3 ✔ Verification in progress (status=${result.complianceCaseStatus})`,
    );
    return { status: "IN_PROGRESS" };
  } catch (err) {
    /* CompliancePendingError is the EXPECTED path for new users —
       the engine throws it with the provider redirect URL */
    if (err instanceof CompliancePendingError) {
      console.log(
        `[INITIATE_VERIFICATION] Step 3 ✔ CompliancePendingError caught (EXPECTED)`,
      );
      console.log(`[INITIATE_VERIFICATION]   provider=${err.provider}`);
      console.log(`[INITIATE_VERIFICATION]   sessionId=${err.sessionId}`);
      console.log(`[INITIATE_VERIFICATION]   redirectUrl=${err.redirectUrl}`);
      return {
        status: "REDIRECT",
        redirectUrl: err.redirectUrl,
        provider: err.provider,
        sessionId: err.sessionId,
      };
    }

    /* Real error — surface it */
    const message = err instanceof Error ? err.message : String(err);
    console.error("[INITIATE_VERIFICATION] ✘✘✘ Initiation FAILED:", message);
    return {
      status: "ERROR",
      error: message,
    };
  }
}
