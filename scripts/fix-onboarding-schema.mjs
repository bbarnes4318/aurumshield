/* ================================================================
   ONE-TIME MIGRATION: Add missing columns to onboarding_state
   ================================================================
   Run via: node scripts/fix-onboarding-schema.mjs
   
   Requires DATABASE_URL env var pointing to production RDS.
   ================================================================ */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: Set DATABASE_URL environment variable");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("Connected to database");

  // Check existing columns
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'onboarding_state' ORDER BY ordinal_position`
  );
  const existingCols = rows.map((r) => r.column_name);
  console.log("Existing columns:", existingCols.join(", "));

  // Add missing columns if they don't exist
  const migrations = [
    { col: "org_id", sql: `ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS org_id UUID` },
    { col: "current_step", sql: `ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 1` },
    { col: "provider_inquiry_id", sql: `ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS provider_inquiry_id VARCHAR(255)` },
    { col: "status_reason", sql: `ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status_reason TEXT` },
    { col: "metadata_json", sql: `ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb` },
  ];

  for (const m of migrations) {
    if (!existingCols.includes(m.col)) {
      console.log(`Adding missing column: ${m.col}`);
      await client.query(m.sql);
      console.log(`  ✅ Added ${m.col}`);
    } else {
      console.log(`Column ${m.col} already exists ✓`);
    }
  }

  // Also ensure the status enum has MCA_PENDING and MCA_SIGNED values
  try {
    await client.query(`ALTER TYPE onboarding_status_enum ADD VALUE IF NOT EXISTS 'MCA_PENDING'`);
    console.log("Added MCA_PENDING to enum ✓");
  } catch { console.log("MCA_PENDING already in enum ✓"); }

  try {
    await client.query(`ALTER TYPE onboarding_status_enum ADD VALUE IF NOT EXISTS 'MCA_SIGNED'`);
    console.log("Added MCA_SIGNED to enum ✓");
  } catch { console.log("MCA_SIGNED already in enum ✓"); }

  // Widen current_step check constraint if it exists (allow up to 8)
  try {
    await client.query(`ALTER TABLE onboarding_state DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check`);
    await client.query(`ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_current_step_check CHECK (current_step BETWEEN 1 AND 8)`);
    console.log("Widened current_step constraint to 1-8 ✓");
  } catch (e) { console.log("current_step constraint update:", e.message); }

  // Verify final state
  const { rows: final } = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'onboarding_state' ORDER BY ordinal_position`
  );
  console.log("\nFinal schema:");
  for (const r of final) {
    console.log(`  ${r.column_name}: ${r.data_type}`);
  }

  await client.end();
  console.log("\n✅ Migration complete");
}

main().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
