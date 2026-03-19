/**
 * GET /api/fix-schema?key=aurumshield-migrate-2026
 *
 * One-shot schema fix endpoint. Adds all missing columns and tables
 * that migrations 015–018 should have created. No Clerk auth needed —
 * protected by migration key only.
 *
 * TODO: Delete this file after the database is fixed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPoolClient } from "@/lib/db";

const MIGRATION_KEY = "aurumshield-migrate-2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== MIGRATION_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ sql: string; status: string }> = [];
  const client = await getPoolClient();

  const statements = [
    // Migration 015: clerk_id on users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT`,

    // Columns used by iDenfy webhook on users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyb_status VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS marketplace_access BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20)`,

    // Migration 018: idenfy_webhook_log table
    `CREATE TABLE IF NOT EXISTS idenfy_webhook_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       scan_ref VARCHAR(255) NOT NULL UNIQUE,
       user_id VARCHAR(255),
       idenfy_status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
       mapped_kyb_status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
       raw_payload JSONB DEFAULT '{}'::jsonb,
       processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,

    // Patch columns on idenfy_webhook_log if table existed from partial migration
    `ALTER TABLE idenfy_webhook_log ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`,
    `ALTER TABLE idenfy_webhook_log ADD COLUMN IF NOT EXISTS idenfy_status VARCHAR(50) DEFAULT 'UNKNOWN'`,
    `ALTER TABLE idenfy_webhook_log ADD COLUMN IF NOT EXISTS mapped_kyb_status VARCHAR(50) DEFAULT 'UNKNOWN'`,
    `ALTER TABLE idenfy_webhook_log ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE idenfy_webhook_log ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW()`,

    // Compliance tables
    `CREATE TABLE IF NOT EXISTS compliance_cases (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id VARCHAR(255),
       status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PROVIDER',
       tier VARCHAR(50) NOT NULL DEFAULT 'BROWSE',
       inquiry_id TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    `CREATE TABLE IF NOT EXISTS compliance_events (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       case_id UUID REFERENCES compliance_cases(id),
       event_id TEXT UNIQUE,
       source VARCHAR(50),
       event_type VARCHAR(100),
       metadata JSONB DEFAULT '{}'::jsonb,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Onboarding state table
    `CREATE TABLE IF NOT EXISTS onboarding_state (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id VARCHAR(255),
       step VARCHAR(100),
       data JSONB DEFAULT '{}'::jsonb,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     )`,
  ];

  try {
    for (const sql of statements) {
      try {
        await client.query(sql);
        const label = sql.trim().substring(0, 80).replace(/\s+/g, " ");
        results.push({ sql: label, status: "OK" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const label = sql.trim().substring(0, 80).replace(/\s+/g, " ");
        results.push({ sql: label, status: `FAILED: ${msg}` });
      }
    }
  } finally {
    client.release();
  }

  const failed = results.filter((r) => r.status.startsWith("FAILED"));

  return NextResponse.json({
    success: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results,
  });
}
