/* ================================================================
   POST /api/compliance/cases/me/initiate
   ================================================================
   HTTP bridge for the serverInitiateVerification() action.
   Called by the client-side useInitiateVerification() mutation.

   Creates (or reuses) a compliance case for the authenticated user
   and routes them to the active compliance provider (iDenfy/Veriff).

   Response shape mirrors InitiateVerificationResult:
     { status, redirectUrl?, provider?, sessionId?, error? }
   ================================================================ */

import { NextResponse } from "next/server";
import { serverInitiateVerification } from "@/lib/actions/initiate-verification-action";

export async function POST(): Promise<NextResponse> {
  try {
    const result = await serverInitiateVerification();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[COMPLIANCE] POST /api/compliance/cases/me/initiate failed:", err);
    return NextResponse.json(
      {
        status: "ERROR" as const,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
