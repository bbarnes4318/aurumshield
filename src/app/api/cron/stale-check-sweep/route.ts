/* ================================================================
   CRON: Stale Check Sweep — Periodic TTL Freshness Evaluation
   ================================================================
   Scans all ACTIVE compliance subjects and evaluates check
   freshness. Expired checks are marked and PERIODIC_REVIEW
   cases opened where needed.

   Security:
     - Requires Authorization: Bearer <CRON_SECRET_KEY>
     - Returns 401 if the header is missing or doesn't match

   Endpoint: POST /api/cron/stale-check-sweep
   Recommended Schedule: Daily at 02:00 UTC
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { runStaleCheckSweep } from "@/lib/compliance/rescreening-jobs";

const CRON_SECRET = process.env.CRON_SECRET_KEY;

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.error(
      `[CRON] ⛔ stale-check-sweep: unauthorized attempt from ${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    );
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // ── 2. Run the sweep ──
  try {
    console.log(`[CRON] 🔄 stale-check-sweep: starting...`);

    const result = await runStaleCheckSweep("system-cron");

    console.log(
      `[CRON] ✅ stale-check-sweep: complete — ` +
        `scanned=${result.subjectsScanned}, expired=${result.subjectsWithExpiredChecks}, ` +
        `checksMarked=${result.totalChecksMarkedExpired}, casesOpened=${result.casesOpened}`,
    );

    return NextResponse.json(
      {
        status: "ok",
        job: result.jobType,
        subjectsScanned: result.subjectsScanned,
        subjectsWithExpiredChecks: result.subjectsWithExpiredChecks,
        totalChecksMarkedExpired: result.totalChecksMarkedExpired,
        casesOpened: result.casesOpened,
        errors: result.errors.length,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON] ❌ stale-check-sweep FAILED:`, message);
    return NextResponse.json(
      { error: "Stale check sweep failed", detail: message },
      { status: 500 },
    );
  }
}
