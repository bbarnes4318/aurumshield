/* ================================================================
   GET  /api/compliance/funding-readiness
   ================================================================
   Authenticated, user-scoped endpoint for server-authoritative
   funding readiness evaluation.

   Returns a FundingReadinessResult indicating whether the user's
   funding configuration is truly ready for first-trade progression.

   The userId is ALWAYS derived from the server session — never
   from query params — to prevent IDOR.
   ================================================================ */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { evaluateFundingReadiness } from "@/lib/compliance/funding-readiness";

/* ----------------------------------------------------------------
   GET /api/compliance/funding-readiness
   ---------------------------------------------------------------- */
export async function GET() {
  try {
    const session = await requireSession();
    const result = await evaluateFundingReadiness(session.userId);

    return NextResponse.json({ result });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const authErr = err as { statusCode: number; message: string };
      return NextResponse.json(
        { error: authErr.message },
        { status: authErr.statusCode },
      );
    }

    console.error(
      "[AurumShield] GET /api/compliance/funding-readiness failed:",
      err,
    );
    return NextResponse.json(
      { error: "Failed to evaluate funding readiness" },
      { status: 503 },
    );
  }
}
