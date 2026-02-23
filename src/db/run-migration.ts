/**
 * AurumShield — Database Migration Runner
 *
 * Retrieves RDS credentials from AWS Secrets Manager and executes SQL migrations.
 *
 * Usage:
 *   LOCAL (with port-forwarding or bastion):
 *     DATABASE_URL=postgresql://user:pass@localhost:5432/aurumshield npx tsx src/db/run-migration.ts
 *
 *   ECS (inside VPC — preferred):
 *     npx tsx src/db/run-migration.ts
 *     (Reads DATABASE_HOST, DATABASE_PORT, DATABASE_NAME env vars + DATABASE_CREDENTIALS secret)
 *
 *   AWS CLI one-liner (from local with SSM port-forward active):
 *     DATABASE_URL=$(node -e "...") npx tsx src/db/run-migration.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// ─── Resolve connection string ───────────────────────────────────────────────
async function resolveConnectionConfig(): Promise<{
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}> {
  // Option 1: Explicit DATABASE_URL takes precedence
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  }

  // Option 2: ECS environment (DATABASE_HOST + Secrets Manager)
  const host = process.env.DATABASE_HOST;
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const database = process.env.DATABASE_NAME || 'aurumshield';

  if (!host) {
    throw new Error(
      'No DATABASE_URL or DATABASE_HOST found. ' +
        'Run this script inside an ECS task or provide DATABASE_URL.',
    );
  }

  // Retrieve credentials from Secrets Manager
  const secretArn =
    process.env.DATABASE_SECRET_ARN ||
    'arn:aws:secretsmanager:us-east-2:974789824146:secret:rds!db-a4173176-9cb7-4c1f-9f24-82ed8a2f3e1e-rHA5mw';

  const smClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-2' });
  const secret = await smClient.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  if (!secret.SecretString) {
    throw new Error('Failed to retrieve database credentials from Secrets Manager');
  }

  const creds = JSON.parse(secret.SecretString) as {
    username: string;
    password: string;
  };

  return {
    host,
    port,
    database,
    user: creds.username,
    password: creds.password,
  };
}

// ─── Run migrations ──────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  AurumShield — Database Migration Runner');
  console.log('═══════════════════════════════════════════════════');

  const config = await resolveConnectionConfig();
  console.log(`\n→ Connecting to ${config.host}:${config.port}/${config.database} as ${config.user}`);

  const client = new Client({
    ...config,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  console.log('✓ Connected to PostgreSQL\n');

  // Ensure migration tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Load executed migrations
  const { rows: executed } = await client.query(
    'SELECT filename FROM _migrations ORDER BY id',
  );
  const executedSet = new Set(executed.map((r: { filename: string }) => r.filename));

  // Read migration files
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;

  for (const file of files) {
    if (executedSet.has(file)) {
      console.log(`  ⊘ ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`  ▶ Applying ${file}...`);

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`  ✓ ${file} applied successfully`);
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${file} FAILED:`, err);
      process.exit(1);
    }
  }

  await client.end();

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  Done. ${applied} migration(s) applied, ${executedSet.size} previously applied.`);
  console.log(`═══════════════════════════════════════════════════\n`);
}

main().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
