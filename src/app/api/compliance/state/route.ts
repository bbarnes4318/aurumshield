/* ================================================================
   GET / PATCH  /api/compliance/state
   ================================================================
   Authenticated, user-scoped endpoints for onboarding state
   persistence. The userId is ALWAYS derived from the server
   session — never from query params — to prevent IDOR.

   GET  → returns the user's onboarding_state row (or null).
          If the user has an APPROVED compliance_case but the
          onboarding_state is not COMPLETED, auto-promotes it.
   PATCH → upserts partial onboarding state
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import {
  getOnboardingState,
  upsertOnboardingState,
  patchOnboardingStateSchema,
} from "@/lib/compliance/onboarding-state";
import { requireSession } from "@/lib/authz";

/* ----------------------------------------------------------------
   GET /api/compliance/state
   ---------------------------------------------------------------- */
export async function GET() {
  try {
    const session = await requireSession();

    let state = await getOnboardingState(session.userId);

    // ── Bridge: check compliance_cases as authoritative source ──
    // The iDenfy/Veriff webhooks update compliance_cases to APPROVED
    // but never update onboarding_state. If a user is approved in
    // compliance_cases but their onboarding_state is missing or not
    // COMPLETED, auto-promote it so the portal doesn't redirect them.
    if (!state || state.status !== "COMPLETED") {
      try {
        const { getComplianceCaseByUserId } = await import(
          "@/lib/compliance/models"
        );
        const cc = await getComplianceCaseByUserId(session.userId);

        if (cc && cc.status === "APPROVED") {
          // User is compliance-approved but onboarding_state is stale — fix it
          state = await upsertOnboardingState(session.userId, {
            status: "COMPLETED",
            currentStep: 4,
          });
          console.log(
            `[AurumShield] Auto-promoted onboarding_state to COMPLETED for user ${session.userId} (compliance_case APPROVED)`,
          );
        }
      } catch (bridgeErr) {
        // Non-fatal: if the compliance case check fails, return whatever
        // onboarding_state we have — don't block the user
        console.warn(
          "[AurumShield] compliance_case bridge check failed:",
          bridgeErr,
        );
      }
    }

    return NextResponse.json({ state });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const authErr = err as { statusCode: number; message: string };
      return NextResponse.json(
        { error: authErr.message },
        { status: authErr.statusCode },
      );
    }

    console.warn("[AurumShield] GET /api/compliance/state failed:", err);
    // CRITICAL: Return a 503 error so the client can distinguish between
    // "user has no state" (state: null, 200) vs "API failed" (503).
    return NextResponse.json(
      { error: "Failed to fetch onboarding state" },
      { status: 503 },
    );
  }
}

/* ----------------------------------------------------------------
   PATCH /api/compliance/state
   ---------------------------------------------------------------- */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();

    const body = await request.json();
    const parsed = patchOnboardingStateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const state = await upsertOnboardingState(session.userId, parsed.data);

    return NextResponse.json({ state });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const authErr = err as { statusCode: number; message: string };
      return NextResponse.json(
        { error: authErr.message },
        { status: authErr.statusCode },
      );
    }

    console.error("[AurumShield] PATCH /api/compliance/state failed:", err);
    return NextResponse.json(
      { error: "Failed to save onboarding state" },
      { status: 503 },
    );
  }
}

