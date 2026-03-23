/* ================================================================
   GET /api/compliance/aml-status
   ================================================================
   Returns the authenticated user's AML training completion status.
   Consumed by the useAmlStatus() TanStack Query hook.

   Response:
     { isComplete: boolean, completedAt: string | null, certifiedName: string | null }

   Auth: Reads userId from Clerk session. Returns 401 if not authenticated.
   ================================================================ */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { isComplete: false, completedAt: null, certifiedName: null },
        { status: 401 },
      );
    }

    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();

    try {
      const { rows } = await client.query<{
        completed_at: string;
        user_id: string;
        role: string;
      }>(
        `SELECT completed_at, user_id, role
         FROM aml_training_logs
         WHERE user_id = $1
         LIMIT 1`,
        [userId],
      );

      if (rows.length === 0) {
        return NextResponse.json({
          isComplete: false,
          completedAt: null,
          certifiedName: null,
        });
      }

      return NextResponse.json({
        isComplete: true,
        completedAt: rows[0].completed_at,
        certifiedName: null, // Name is on the certificate, not stored in DB
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[AML_STATUS] Failed to query aml_training_logs:", err);
    // Fail-open for status checks — don't block UI on DB errors
    return NextResponse.json(
      { isComplete: false, completedAt: null, certifiedName: null },
      { status: 500 },
    );
  }
}
