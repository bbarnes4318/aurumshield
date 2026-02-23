/* ================================================================
   SHARED DATABASE CLIENT FACTORY
   ================================================================
   Returns a connected `pg.Client` for the AurumShield RDS instance.

   Resolution order:
     1. DATABASE_URL env var (local / bastion port-forward)
     2. DATABASE_HOST + Secrets Manager (ECS inside VPC)

   Caller MUST call `client.end()` when finished.

   Uses dynamic imports so `pg` and `@aws-sdk/client-secrets-manager`
   are never bundled into the Next.js client bundle.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

/**
 * Create and return a connected pg.Client.
 *
 * @throws if no credentials or host can be resolved, or if the
 *         connection times out after 10 s.
 */
export async function getDbClient() {
  const { Client } = await import("pg");

  // ── Option 1: Explicit DATABASE_URL ──
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    const client = new Client({
      host: url.hostname,
      port: parseInt(url.port || "5432", 10),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
    return client;
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

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  await client.connect();
  return client;
}
