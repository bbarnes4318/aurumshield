/* API Route — GET /api/user/kyc-status */

/* ================================================================
   GET /api/user/kyc-status
   ================================================================
   Returns the live `kyc_status` for a user from PostgreSQL.

   Query: ?userId=<string>
   Response: { kycStatus: "PENDING" | "APPROVED" | "ELEVATED" | "REJECTED" }

   Falls back to PENDING if:
     - userId is missing
     - User not found in database
     - Database connection fails (graceful degradation)
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";

type KycStatusValue = "PENDING" | "APPROVED" | "ELEVATED" | "REJECTED";

interface KycStatusRow {
  kyc_status: KycStatusValue;
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { kycStatus: "PENDING" as KycStatusValue, source: "fallback", reason: "no userId" },
      { status: 200 },
    );
  }

  let client: { query: <T>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>; end: () => Promise<void> } | null = null;

  try {
    const { getDbClient } = await import("@/lib/db");
    client = await getDbClient();

    const { rows } = await client.query<KycStatusRow>(
      "SELECT kyc_status FROM users WHERE id = $1",
      [userId],
    );

    if (rows.length === 0) {
      return NextResponse.json({
        kycStatus: "PENDING" as KycStatusValue,
        source: "fallback",
        reason: "user not found",
      });
    }

    return NextResponse.json({
      kycStatus: rows[0].kyc_status,
      source: "postgresql",
    });
  } catch (err) {
    console.warn("[AurumShield] /api/user/kyc-status — DB query failed, falling back to PENDING:", err);
    return NextResponse.json({
      kycStatus: "PENDING" as KycStatusValue,
      source: "fallback",
      reason: "db_error",
    });
  } finally {
    if (client) {
      try { await client.end(); } catch { /* ignore cleanup errors */ }
    }
  }
}
