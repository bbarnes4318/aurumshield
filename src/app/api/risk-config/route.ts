import { NextResponse } from "next/server";
import { getActiveRiskConfig } from "@/lib/risk-config-server";
import { requireSession, AuthError } from "@/lib/authz";

/**
 * GET /api/risk-config
 *
 * Returns the active RiskConfiguration from the database.
 * Falls back to DEFAULT_RISK_CONFIG if the DB is unavailable
 * (e.g., when running on mock data without a live database).
 *
 * Cached aggressively server-side (60s TTL in getActiveRiskConfig)
 * and client-side (staleTime in the TanStack Query hook).
 */
export async function GET() {
  try {
    await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getActiveRiskConfig();
    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60",
      },
    });
  } catch {
    // Should never reach here — getActiveRiskConfig has its own fallback
    const { DEFAULT_RISK_CONFIG } = await import("@/lib/policy-engine");
    return NextResponse.json(DEFAULT_RISK_CONFIG);
  }
}
