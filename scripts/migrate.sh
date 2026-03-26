#!/bin/sh
# Run this on the ECS container to add missing columns to onboarding_state
node -e '
const p = require("pg");
const c = JSON.parse(process.env.DATABASE_CREDENTIALS);
const cl = new p.Client({
  host: process.env.DATABASE_HOST,
  port: 5432,
  database: "aurumshield",
  user: c.username,
  password: c.password,
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await cl.connect();
  console.log("Connected");
  await cl.query("ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS org_id UUID");
  console.log("org_id added");
  await cl.query("ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS provider_inquiry_id VARCHAR(255)");
  console.log("provider_inquiry_id added");
  await cl.query("ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status_reason TEXT");
  console.log("status_reason added");
  const r = await cl.query("SELECT column_name FROM information_schema.columns WHERE table_name = '"'"'onboarding_state'"'"' ORDER BY ordinal_position");
  console.log("Final columns:", r.rows.map(x => x.column_name).join(", "));
  await cl.end();
  console.log("MIGRATION DONE");
})().catch(e => { console.error(e.message); process.exit(1); });
'
