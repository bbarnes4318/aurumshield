/* ================================================================
   SHARED DATABASE CLIENT FACTORY
   ================================================================
   Returns a connected `pg.Client` for the AurumShield RDS instance
   or a pooled client from a shared `pg.Pool`.

   Resolution order:
     1. DATABASE_URL env var (local / bastion port-forward)
     2. DATABASE_HOST + Secrets Manager (ECS inside VPC)

   Connection Pooling:
     - getDbPool() returns a lazily-initialized singleton pg.Pool
     - getPoolClient() returns a PoolClient from the pool — caller
       MUST call client.release() when finished (NOT client.end())
     - getDbClient() is LEGACY — creates a per-call pg.Client that
       the caller MUST end(). Use getPoolClient() for new code.

   Uses dynamic imports so `pg` and `@aws-sdk/client-secrets-manager`
   are never bundled into the Next.js client bundle.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

/* ---------- Credential resolution ---------- */

interface DbCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: { rejectUnauthorized: false } | undefined;
}

async function resolveCredentials(): Promise<DbCredentials> {
  // ── Option 1: Explicit DATABASE_URL ──
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || "5432", 10),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    };
  }

  // ── Option 2: ECS — DATABASE_HOST + Secrets Manager ──
  const host = process.env.DATABASE_HOST;
  const port = parseInt(process.env.DATABASE_PORT || "5432", 10);
  const database = process.env.DATABASE_NAME || "aurumshield";

  if (!host) {
    throw new Error(
      "No DATABASE_URL or DATABASE_HOST found. " +
        "Run this inside an ECS task or provide DATABASE_URL.",
    );
  }

  let user = "aurumshield_admin";
  let password = "";

  // Try Secrets Manager first
  const secretArn =
    process.env.DATABASE_SECRET_ARN ||
    "arn:aws:secretsmanager:us-east-2:974789824146:secret:rds!db-a4173176-9cb7-4c1f-9f24-82ed8a2f3e1e-rHA5mw";

  try {
    const { SecretsManagerClient, GetSecretValueCommand } =
      await import("@aws-sdk/client-secrets-manager");
    const smClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-2",
    });
    const secret = await smClient.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );
    if (secret.SecretString) {
      const creds = JSON.parse(secret.SecretString) as {
        username: string;
        password: string;
      };
      user = creds.username;
      password = creds.password;
    }
  } catch {
    // Fallback: DATABASE_CREDENTIALS injected directly by ECS
    if (process.env.DATABASE_CREDENTIALS) {
      try {
        const creds = JSON.parse(process.env.DATABASE_CREDENTIALS) as {
          username: string;
          password: string;
        };
        user = creds.username;
        password = creds.password;
      } catch {
        throw new Error("Failed to parse DATABASE_CREDENTIALS");
      }
    } else {
      throw new Error("No database credentials available");
    }
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
  };
}

/* ---------- Connection Pool (singleton) ---------- */

let _pool: InstanceType<typeof import("pg").Pool> | null = null;
let _poolInitPromise: Promise<InstanceType<typeof import("pg").Pool>> | null = null;

/**
 * Get or create the shared connection pool.
 * The pool manages connection lifecycle, reuse, and health checks.
 *
 * Pool settings:
 *   - max: DB_POOL_MAX env var, default 20 connections per container
 *   - idleTimeoutMillis: 30s (reclaim idle connections)
 *   - connectionTimeoutMillis: 2s (fail-fast to prevent cascading hangs)
 */
export async function getDbPool() {
  if (_pool) return _pool;

  // Prevent concurrent initialization
  if (_poolInitPromise) return _poolInitPromise;

  _poolInitPromise = (async () => {
    const { Pool } = await import("pg");
    const creds = await resolveCredentials();

    _pool = new Pool({
      host: creds.host,
      port: creds.port,
      database: creds.database,
      user: creds.user,
      password: creds.password,
      ssl: creds.ssl,
      // Dynamic scaling limit, defaulting to 20 connections per container
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
      idleTimeoutMillis: 30_000,
      // Fail fast: If DB doesn't respond in 2 seconds, throw an error rather than hanging the container
      connectionTimeoutMillis: 2000, 
    });

    // Log pool errors (don't crash the process)
    _pool.on("error", (err) => {
      console.error("[DB-POOL] Unexpected idle client error:", err);
    });

    return _pool;
  })();

  return _poolInitPromise;
}

/**
 * Acquire a client from the connection pool.
 * Caller MUST call `client.release()` when finished — NOT `client.end()`.
 *
 * Usage:
 *   const client = await getPoolClient();
 *   try {
 *     await client.query("SELECT ...");
 *   } finally {
 *     client.release();
 *   }
 */
export async function getPoolClient() {
  const pool = await getDbPool();
  return pool.connect();
}

/* ---------- Legacy: Per-call client (deprecated) ---------- */

/**
 * @deprecated Use getPoolClient() instead. This creates a new connection
 * per call and the caller must call client.end() when finished.
 *
 * Create and return a connected pg.Client.
 *
 * @throws if no credentials or host can be resolved, or if the
 *         connection times out after 10 s.
 */
export async function getDbClient() {
  const { Client } = await import("pg");
  const creds = await resolveCredentials();

  const client = new Client({
    host: creds.host,
    port: creds.port,
    database: creds.database,
    user: creds.user,
    password: creds.password,
    ssl: creds.ssl,
    connectionTimeoutMillis: 10_000,
  });

  await client.connect();
  return client;
}
