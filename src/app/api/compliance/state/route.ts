/* ================================================================
   GET / PATCH  /api/compliance/state
   ================================================================
   Authenticated, user-scoped endpoints for onboarding state
   persistence. The userId is ALWAYS derived from the server
   session — never from query params — to prevent IDOR.

   GET  → returns the user's onboarding_state row (or null)
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

    const state = await getOnboardingState(session.userId);

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
    return NextResponse.json({ state: null, source: "fallback" });
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
