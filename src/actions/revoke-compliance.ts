"use server";

/* ================================================================
   REVOKE COMPLIANCE — Server Action
   ================================================================
   Material Change Reset Engine. When an offtaker elects to amend
   their corporate dossier, this action:

   1. Validates the session (IDOR-proof — userId from server session)
   2. Reverts onboarding status to IN_PROGRESS / step 1
   3. Preserves metadataJson so the form is pre-populated
   4. Calls revalidatePath to flush server-side cache, ensuring the
      sidebar instantly reflects the revoked state before redirect

   Input is Zod-validated even though it carries no user data —
   this satisfies our blanket server action validation mandate.
   ================================================================ */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { upsertOnboardingState } from "@/lib/compliance/onboarding-state";
import { requireProductionAuth } from "@/lib/authz";

/* ── Input Schema (empty — userId comes from session) ── */
const revokeComplianceSchema = z.object({});

/* ── Result Type ── */
export interface RevokeComplianceResult {
  success: boolean;
  error?: string;
}

/* ── Server Action ── */
export async function revokeCompliance(
  _input: z.infer<typeof revokeComplianceSchema> = {},
): Promise<RevokeComplianceResult> {
  /* 1. Validate input */
  const parsed = revokeComplianceSchema.safeParse(_input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request payload" };
  }

  /* 2. Authenticate — userId always from server session */
  let userId: string;
  try {
    const session = await requireProductionAuth();
    userId = session.userId;
  } catch {
    return { success: false, error: "Authentication required" };
  }

  /* 3. Revert compliance state */
  try {
    await upsertOnboardingState(userId, {
      status: "IN_PROGRESS",
      currentStep: 1,
      statusReason: "MATERIAL_CHANGE_REVOCATION",
    });
  } catch (err) {
    console.error("[AurumShield] revokeCompliance DB error:", err);
    return { success: false, error: "Failed to revoke compliance state" };
  }

  /* 4. Flush server-side cache so sidebar + layouts reflect immediately */
  revalidatePath("/", "layout");

  return { success: true };
}
