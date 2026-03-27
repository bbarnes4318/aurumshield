/* ================================================================
   ONBOARDING STATE — Server-Side CRUD
   ================================================================
   Persists onboarding progress to PostgreSQL `onboarding_state` table.
   Provides typed get/upsert functions used by the API route.

   SCHEMA SELF-HEALING:
   On first call per process, ensureSchema() queries information_schema
   to verify all required columns exist. Any missing columns are added
   via ALTER TABLE before any data query runs. This eliminates the need
   for manual migration scripts or admin endpoints.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { z } from "zod";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

export const ONBOARDING_STATUSES = [
  "IN_PROGRESS",
  "PROVIDER_PENDING",
  "MCA_PENDING",
  "MCA_SIGNED",
  "REVIEW",
  "COMPLETED",
  "ABANDONED",
] as const;

export type OnboardingStateStatus = (typeof ONBOARDING_STATUSES)[number];

export interface OnboardingState {
  id: string;
  userId: string;
  orgId: string | null;
  startedAt: string;
  lastSeenAt: string;
  currentStep: number;
  providerInquiryId: string | null;
  status: OnboardingStateStatus;
  statusReason: string | null;
  metadataJson: Record<string, unknown>;
  updatedAt: string;
}

/* ----------------------------------------------------------------
   Zod Schemas — PATCH validation
   ---------------------------------------------------------------- */

export const patchOnboardingStateSchema = z.object({
  orgId: z.string().uuid().nullable().optional(),
  currentStep: z.number().int().min(1).max(8).optional(),
  providerInquiryId: z.string().max(255).nullable().optional(),
  status: z.enum(ONBOARDING_STATUSES).optional(),
  statusReason: z.string().max(2000).nullable().optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional(),
});

export type PatchOnboardingState = z.infer<typeof patchOnboardingStateSchema>;

/* ----------------------------------------------------------------
   Row → Domain mapper (tolerates missing columns gracefully)
   ---------------------------------------------------------------- */

interface OnboardingStateRow {
  id: string;
  user_id: string;
  org_id?: string | null;
  started_at: string;
  last_seen_at: string;
  current_step?: number;
  provider_inquiry_id?: string | null;
  status: OnboardingStateStatus;
  status_reason?: string | null;
  metadata_json?: Record<string, unknown>;
  updated_at: string;
}

function rowToDomain(row: OnboardingStateRow): OnboardingState {
  return {
    id: row.id,
    userId: row.user_id,
    orgId: row.org_id ?? null,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
    currentStep: row.current_step ?? 1,
    providerInquiryId: row.provider_inquiry_id ?? null,
    status: row.status,
    statusReason: row.status_reason ?? null,
    metadataJson: row.metadata_json ?? {},
    updatedAt: row.updated_at,
  };
}

/* ================================================================
   SCHEMA SELF-HEALING — runs ONCE per ECS container lifetime
   ================================================================
   Before any data query, we verify the schema by querying
   information_schema.columns. Every column the code references
   is checked, and any missing column is added immediately.
   After the first successful run, the check is skipped for the
   lifetime of the process.
   ================================================================ */

const REQUIRED_COLUMNS: { name: string; ddl: string }[] = [
  { name: "org_id",              ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS org_id UUID" },
  { name: "current_step",       ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 1" },
  { name: "provider_inquiry_id", ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS provider_inquiry_id VARCHAR(255)" },
  { name: "status",             ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS'" },
  { name: "status_reason",      ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS status_reason TEXT" },
  { name: "metadata_json",      ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb" },
  { name: "started_at",         ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
  { name: "last_seen_at",       ddl: "ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
];

let _schemaVerified = false;
let _schemaVerifyPromise: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (_schemaVerified) return;
  if (_schemaVerifyPromise) return _schemaVerifyPromise;

  _schemaVerifyPromise = (async () => {
    const { getDbClient } = await import("@/lib/db");
    const client = await getDbClient();

    try {
      // 1. Query what columns actually exist RIGHT NOW in the database
      const { rows } = await client.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'onboarding_state'"
      );
      const existing = new Set(rows.map((r) => r.column_name));
      console.info(
        `[OnboardingState] Schema check: found ${existing.size} columns: ${[...existing].join(", ")}`
      );

      // 2. Add every single missing column in one pass
      const missing = REQUIRED_COLUMNS.filter((c) => !existing.has(c.name));
      if (missing.length > 0) {
        console.warn(
          `[OnboardingState] AUTO-MIGRATING ${missing.length} missing columns: ${missing.map((c) => c.name).join(", ")}`
        );
        for (const col of missing) {
          await client.query(col.ddl);
          console.warn(`[OnboardingState]   ✅ Added column: ${col.name}`);
        }
      } else {
        console.info("[OnboardingState] All required columns present — no migration needed");
      }

      // 3. Ensure enum values exist
      for (const val of ["MCA_PENDING", "MCA_SIGNED"]) {
        try {
          await client.query(`ALTER TYPE onboarding_status_enum ADD VALUE IF NOT EXISTS '${val}'`);
        } catch {
          // Already exists or pg version doesn't support IF NOT EXISTS for ADD VALUE
        }
      }

      // 4. Widen current_step constraint to allow 1-8
      try {
        await client.query("ALTER TABLE onboarding_state DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check");
        await client.query("ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_current_step_check CHECK (current_step BETWEEN 1 AND 8)");
      } catch {
        // Constraint management — non-fatal if it fails
      }

      _schemaVerified = true;
      console.info("[OnboardingState] ✅ Schema verification complete — all columns confirmed");
    } catch (err) {
      console.error("[OnboardingState] Schema verification failed:", err);
      // Don't cache failure — retry on next call
      _schemaVerifyPromise = null;
      throw err;
    } finally {
      try { await client.end(); } catch { /* ignore cleanup */ }
    }
  })();

  return _schemaVerifyPromise;
}

/* ----------------------------------------------------------------
   GET — Retrieve onboarding state for a user
   ---------------------------------------------------------------- */

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState | null> {
  await ensureSchema();

  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const { rows } = await client.query<OnboardingStateRow>(
      "SELECT * FROM onboarding_state WHERE user_id = $1",
      [userId],
    );
    return rows.length > 0 ? rowToDomain(rows[0]) : null;
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/* ----------------------------------------------------------------
   UPSERT — Create or update onboarding state
   ---------------------------------------------------------------- */

export async function upsertOnboardingState(
  userId: string,
  patch: PatchOnboardingState,
): Promise<OnboardingState> {
  await ensureSchema();

  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const metadataValue = patch.metadataJson
      ? JSON.stringify(patch.metadataJson)
      : "{}";

    const { rows } = await client.query<OnboardingStateRow>(
      `INSERT INTO onboarding_state (
        user_id,
        org_id,
        current_step,
        provider_inquiry_id,
        status,
        status_reason,
        metadata_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET
        org_id              = COALESCE($2, onboarding_state.org_id),
        current_step        = COALESCE($3, onboarding_state.current_step),
        provider_inquiry_id = COALESCE($4, onboarding_state.provider_inquiry_id),
        status              = COALESCE($5, onboarding_state.status),
        status_reason       = COALESCE($6, onboarding_state.status_reason),
        metadata_json       = CASE
          WHEN $7::jsonb IS NOT NULL AND $7::jsonb != '{}'::jsonb
          THEN onboarding_state.metadata_json || $7::jsonb
          ELSE onboarding_state.metadata_json
        END
      RETURNING *`,
      [
        userId,
        patch.orgId ?? null,
        patch.currentStep ?? 1,
        patch.providerInquiryId ?? null,
        patch.status ?? "IN_PROGRESS",
        patch.statusReason ?? null,
        metadataValue,
      ],
    );

    return rowToDomain(rows[0]);
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}
