"use server";

/* ================================================================
   AML TRAINING — Server Actions
   ================================================================
   Strictly-typed server actions for the AML training compliance
   tracker (aml_training_logs table).

   Actions:
     1. getTrainingStatus  — Check if a user has completed training
     2. certifyAmlCompletion — Insert completion record + revalidate

   Connection: getPoolClient() with try/finally { client.release() }
   ================================================================ */

import { revalidatePath } from "next/cache";

/* ================================================================
   1. GET TRAINING STATUS
   ================================================================
   Returns true if a completion record exists for this user.
   ================================================================ */

export async function getTrainingStatus(
  userId: string,
): Promise<boolean> {
  if (!userId) return false;

  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM aml_training_logs WHERE user_id = $1
       ) AS exists`,
      [userId],
    );

    return rows[0]?.exists ?? false;
  } finally {
    client.release();
  }
}

/* ================================================================
   2. CERTIFY AML COMPLETION
   ================================================================
   Inserts a new training completion record with a mock SHA-256
   attestation hash. Uses ON CONFLICT to handle re-certification
   (updates the existing record's timestamp and hash).

   Calls revalidatePath to bust the cache for the training page.
   ================================================================ */

export interface CertifyResult {
  success: boolean;
  certificateId?: string;
  attestationHash?: string;
  error?: string;
}

export async function certifyAmlCompletion(
  userId: string,
  role: string,
): Promise<CertifyResult> {
  if (!userId || !role) {
    return { success: false, error: "userId and role are required" };
  }

  // Generate mock SHA-256 attestation hash
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  const attestationHash = `sha256:${randomHex}${timestamp}`;

  // Certificate ID for display
  const certHex = randomHex.substring(0, 4).toUpperCase();
  const certificateId = `CERT-AML-2026-${certHex}`;

  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    await client.query(
      `INSERT INTO aml_training_logs (user_id, role, attestation_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         role = EXCLUDED.role,
         completed_at = NOW(),
         attestation_hash = EXCLUDED.attestation_hash`,
      [userId, role, attestationHash],
    );

    revalidatePath("/compliance/training");

    console.log(
      `[AML_TRAINING] Certification issued: ${certificateId} — ` +
        `user=${userId}, role=${role}, hash=${attestationHash.substring(0, 20)}...`,
    );

    return {
      success: true,
      certificateId,
      attestationHash,
    };
  } catch (err) {
    console.error("[AML_TRAINING] certifyAmlCompletion failed:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unknown error during certification",
    };
  } finally {
    client.release();
  }
}
