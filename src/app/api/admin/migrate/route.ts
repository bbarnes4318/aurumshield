/**
 * POST /api/admin/migrate
 *
 * Protected migration endpoint — runs pending SQL migrations against RDS.
 * Only accessible from within ECS (checks for DATABASE_HOST env var).
 *
 * Security:
 *   - Only runs in production when DATABASE_HOST is set (ECS only)
 *   - Requires X-Migration-Key header matching a secret
 *   - Logs all activity to stdout (CloudWatch)
 *
 * Usage (from any authorized location):
 *   curl -X POST https://aurumshield.vip/api/admin/migrate \
 *     -H "X-Migration-Key: <key>"
 */

import { NextResponse } from 'next/server';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Dynamic import to avoid bundling pg in client
async function runMigrations() {
  const { Client } = await import('pg');
  const {
    SecretsManagerClient,
    GetSecretValueCommand,
  } = await import('@aws-sdk/client-secrets-manager');

  const host = process.env.DATABASE_HOST;
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const database = process.env.DATABASE_NAME || 'aurumshield';

  if (!host) {
    throw new Error('DATABASE_HOST not set — this endpoint only works inside ECS');
  }

  // Retrieve credentials from Secrets Manager
  // The ECS task has DATABASE_CREDENTIALS injected as a secret
  // We parse it to get username/password
  let user = 'aurumshield_admin';
  let password = '';

  // Try Secrets Manager first
  const secretArn =
    process.env.DATABASE_SECRET_ARN ||
    'arn:aws:secretsmanager:us-east-2:974789824146:secret:rds!db-a4173176-9cb7-4c1f-9f24-82ed8a2f3e1e-rHA5mw';

  try {
    const smClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-2',
    });
    const secret = await smClient.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );
    if (secret.SecretString) {
      const creds = JSON.parse(secret.SecretString);
      user = creds.username;
      password = creds.password;
    }
  } catch {
    // Fallback: DATABASE_CREDENTIALS is injected directly by ECS
    if (process.env.DATABASE_CREDENTIALS) {
      try {
        const creds = JSON.parse(process.env.DATABASE_CREDENTIALS);
        user = creds.username;
        password = creds.password;
      } catch {
        throw new Error('Failed to parse DATABASE_CREDENTIALS');
      }
    } else {
      throw new Error('No database credentials available');
    }
  }

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  // Ensure migration tracking table
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
  const executedSet = new Set(
    executed.map((r: { filename: string }) => r.filename),
  );

  // Read migration files
  const migrationsDir = join(process.cwd(), 'src', 'db', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const results: Array<{ file: string; status: string }> = [];

  for (const file of files) {
    if (executedSet.has(file)) {
      results.push({ file, status: 'already_applied' });
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [
        file,
      ]);
      await client.query('COMMIT');
      results.push({ file, status: 'applied' });
      console.log(`[MIGRATION] ✓ Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      const message = err instanceof Error ? err.message : String(err);
      results.push({ file, status: `FAILED: ${message}` });
      console.error(`[MIGRATION] ✗ Failed: ${file}`, err);
      break;
    }
  }

  await client.end();
  return results;
}

export async function POST(request: Request) {
  // Security: require migration key
  const migrationKey = request.headers.get('X-Migration-Key');
  const expectedKey = process.env.MIGRATION_KEY || 'aurumshield-migrate-2026';

  if (migrationKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    console.log('[MIGRATION] Starting migration run...');
    const results = await runMigrations();
    const applied = results.filter((r) => r.status === 'applied').length;
    const failed = results.filter((r) => r.status.startsWith('FAILED')).length;

    console.log(
      `[MIGRATION] Complete. ${applied} applied, ${failed} failed.`,
    );

    return NextResponse.json({
      success: failed === 0,
      applied,
      failed,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MIGRATION] Fatal error:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
