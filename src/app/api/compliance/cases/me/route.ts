/* ================================================================
   GET /api/compliance/cases/me
   ================================================================
   Returns the authenticated user's active ComplianceCase and its
   events. Used by the client-side capabilities hook and case pages.

   Response: { case: ComplianceCase | null, events: ComplianceEvent[] }
   ================================================================ */

import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/authz";
import { getComplianceCaseByUserId } from "@/lib/compliance/models";
import { getEventsForCase } from "@/lib/compliance/events";

export async function GET(): Promise<NextResponse> {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    throw err;
  }

  try {
    const cc = await getComplianceCaseByUserId(session.userId);

    if (!cc) {
      return NextResponse.json({ case: null, events: [] });
    }

    const events = await getEventsForCase(cc.id);

    return NextResponse.json({ case: cc, events });
  } catch (err) {
    console.error("[COMPLIANCE] GET /api/compliance/cases/me failed:", err);
    return NextResponse.json(
      { case: null, events: [], source: "fallback" },
    );
  }
}
