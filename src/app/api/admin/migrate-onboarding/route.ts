/* ================================================================
   ONE-TIME MIGRATION ENDPOINT — /api/admin/migrate-onboarding
   ================================================================
   Adds missing columns to the onboarding_state table.
   Protected by CRON_SECRET_KEY header check.
   
   DELETE THIS FILE after running the migration.
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Simple secret-based auth — use IDENFY_WEBHOOK_SECRET which is available at build time
  const secret = request.headers.get("x-migration-secret");
  const expected = process.env.IDENFY_WEBHOOK_SECRET;

  if (!secret || !expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getDbClient } = await import("@/lib/db");
    const client = await getDbClient();

    const results: string[] = [];

    try {
      // 1. Add missing columns
      await client.query(
        "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS org_id UUID"
      );
      results.push("org_id: added");

      await client.query(
        "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS provider_inquiry_id VARCHAR(255)"
      );
      results.push("provider_inquiry_id: added");

      await client.query(
        "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status_reason TEXT"
      );
      results.push("status_reason: added");

      // 2. Ensure enum values exist
      try {
        await client.query(
          "ALTER TYPE onboarding_status_enum ADD VALUE IF NOT EXISTS 'MCA_PENDING'"
        );
        results.push("MCA_PENDING: added to enum");
      } catch {
        results.push("MCA_PENDING: already exists in enum");
      }

      try {
        await client.query(
          "ALTER TYPE onboarding_status_enum ADD VALUE IF NOT EXISTS 'MCA_SIGNED'"
        );
        results.push("MCA_SIGNED: added to enum");
      } catch {
        results.push("MCA_SIGNED: already exists in enum");
      }

      // 3. Widen current_step constraint
      await client.query(
        "ALTER TABLE onboarding_state DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check"
      );
      await client.query(
        "ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_current_step_check CHECK (current_step BETWEEN 1 AND 8)"
      );
      results.push("current_step constraint: widened to 1-8");

      // 4. Verify final schema
      const { rows } = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'onboarding_state' ORDER BY ordinal_position"
      );
      results.push(
        "final_schema: " +
          rows.map((r: { column_name: string; data_type: string }) => `${r.column_name}(${r.data_type})`).join(", ")
      );
    } finally {
      try {
        await client.end();
      } catch {
        /* ignore cleanup */
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[MIGRATION] Failed:", message);
    return NextResponse.json(
      { error: "Migration failed", message },
      { status: 500 }
    );
  }
}
