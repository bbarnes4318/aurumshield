/* ================================================================
   ONE-TIME MIGRATION ENDPOINT — /api/admin/migrate-kycaid
   ================================================================
   Creates the kycaid_webhook_log table for callback idempotency.
   Protected by CRON_SECRET_KEY header check.

   DELETE THIS FILE after running the migration.
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-migration-secret");
  const expected = process.env.CRON_SECRET_KEY || process.env.IDENFY_WEBHOOK_SECRET;

  if (!secret || !expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getDbClient } = await import("@/lib/db");
    const client = await getDbClient();
    const results: string[] = [];

    try {
      // 1. Create kycaid_webhook_log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS kycaid_webhook_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id VARCHAR(255) NOT NULL UNIQUE,
          verification_id VARCHAR(255) NOT NULL,
          applicant_id VARCHAR(255),
          user_id VARCHAR(255) NOT NULL,
          callback_type VARCHAR(100) NOT NULL,
          verification_status VARCHAR(50),
          verified BOOLEAN,
          raw_payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      results.push("kycaid_webhook_log: table created");

      // 2. Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_kycaid_wh_verification
          ON kycaid_webhook_log(verification_id)
      `);
      results.push("idx_kycaid_wh_verification: index created");

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_kycaid_wh_user
          ON kycaid_webhook_log(user_id)
      `);
      results.push("idx_kycaid_wh_user: index created");

      // 3. Verify
      const { rows } = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'kycaid_webhook_log' ORDER BY ordinal_position"
      );
      results.push(
        "schema: " +
          rows
            .map((r: { column_name: string; data_type: string }) => `${r.column_name}(${r.data_type})`)
            .join(", ")
      );
    } finally {
      try { await client.end(); } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[KYCAID-MIGRATION] Failed:", message);
    return NextResponse.json({ error: "Migration failed", message }, { status: 500 });
  }
}
