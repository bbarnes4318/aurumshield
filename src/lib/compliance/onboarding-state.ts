/* ================================================================
   ONBOARDING STATE — Server-Side CRUD
   ================================================================
   Persists onboarding progress to PostgreSQL `onboarding_state` table.
   Provides typed get/upsert functions used by the API route.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { z } from "zod";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

export const ONBOARDING_STATUSES = [
  "IN_PROGRESS",
  "PROVIDER_PENDING",
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
  currentStep: z.number().int().min(1).max(4).optional(),
  providerInquiryId: z.string().max(255).nullable().optional(),
  status: z.enum(ONBOARDING_STATUSES).optional(),
  statusReason: z.string().max(2000).nullable().optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional(),
});

export type PatchOnboardingState = z.infer<typeof patchOnboardingStateSchema>;

/* ----------------------------------------------------------------
   Row → Domain mapper
   ---------------------------------------------------------------- */

interface OnboardingStateRow {
  id: string;
  user_id: string;
  org_id: string | null;
  started_at: string;
  last_seen_at: string;
  current_step: number;
  provider_inquiry_id: string | null;
  status: OnboardingStateStatus;
  status_reason: string | null;
  metadata_json: Record<string, unknown>;
  updated_at: string;
}

function rowToDomain(row: OnboardingStateRow): OnboardingState {
  return {
    id: row.id,
    userId: row.user_id,
    orgId: row.org_id,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
    currentStep: row.current_step,
    providerInquiryId: row.provider_inquiry_id,
    status: row.status,
    statusReason: row.status_reason,
    metadataJson: row.metadata_json ?? {},
    updatedAt: row.updated_at,
  };
}

/* ----------------------------------------------------------------
   GET — Retrieve onboarding state for a user
   ---------------------------------------------------------------- */

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState | null> {
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
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    // Build the metadata_json value — merge with existing if only partial
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
