/* ================================================================
   CRON: Sanctions / High-Risk Refresh — Proactive Re-Screening
   ================================================================
   Proactively identifies subjects whose SANCTIONS, PEP, and
   ADVERSE_MEDIA checks are approaching expiry (within 30 days)
   and opens PERIODIC_REVIEW cases for re-screening.

   Security:
     - Requires Authorization: Bearer <CRON_SECRET_KEY>
     - Returns 401 if the header is missing or doesn't match

   Endpoint: POST /api/cron/sanctions-refresh
   Recommended Schedule: Weekly on Mondays at 03:00 UTC
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { runSanctionsRefresh } from "@/lib/compliance/rescreening-jobs";

const CRON_SECRET = process.env.CRON_SECRET_KEY;

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.error(
      `[CRON] ⛔ sanctions-refresh: unauthorized attempt from ${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    );
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // ── 2. Run the refresh ──
  try {
    console.log(`[CRON] 🔄 sanctions-refresh: starting...`);

    const result = await runSanctionsRefresh("system-cron");

    console.log(
      `[CRON] ✅ sanctions-refresh: complete — ` +
        `evaluated=${result.subjectsEvaluated}, approaching=${result.checksApproachingExpiry}, ` +
        `triggered=${result.reScreeningsTriggered}`,
    );

    return NextResponse.json(
      {
        status: "ok",
        job: result.jobType,
        subjectsEvaluated: result.subjectsEvaluated,
        checksApproachingExpiry: result.checksApproachingExpiry,
        reScreeningsTriggered: result.reScreeningsTriggered,
        errors: result.errors.length,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON] ❌ sanctions-refresh FAILED:`, message);
    return NextResponse.json(
      { error: "Sanctions refresh failed", detail: message },
      { status: 500 },
    );
  }
}
