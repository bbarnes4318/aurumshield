"use server";

/* ================================================================
   SELLER BANK ONBOARDING — Server Action

   Creates a Modern Treasury Counterparty with the seller's banking
   details.  This file runs ENTIRELY on the server — no API keys or
   raw account numbers are ever exposed to the client boundary.

   IMPORTANT: The routing_number and account_number are NEVER stored
   in any local database.  Only the returned counterparty_id is safe
   to persist in user profile metadata.
   ================================================================ */

import ModernTreasury from "modern-treasury";
import { z } from "zod";

/* ---------- Input Validation ---------- */

const registerSellerBankSchema = z.object({
  name: z.string().min(1, "Account holder name is required"),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, "ABA routing number must be exactly 9 digits"),
  accountNumber: z
    .string()
    .regex(/^\d{4,17}$/, "Account number must be 4–17 digits"),
});

/* ---------- Result Type ---------- */

export interface RegisterBankResult {
  success: boolean;
  counterpartyId?: string;
  error?: string;
}

/* ---------- Environment Key Names ---------- */

const ENV_API_KEY = "MODERN_TREASURY_API_KEY";
const ENV_ORG_ID = "MODERN_TREASURY_ORGANIZATION_ID";

/**
 * Register a seller's bank account as a Modern Treasury Counterparty.
 *
 * The raw `routingNumber` and `accountNumber` are sent directly to
 * Modern Treasury's API and are **never** stored locally.  Only the
 * returned `counterparty.id` should be persisted in the user's
 * profile metadata.
 *
 * @param name           Account holder / legal entity name
 * @param routingNumber  ABA routing number (9 digits)
 * @param accountNumber  Bank account number (4–17 digits)
 */
export async function registerSellerBank(
  name: string,
  routingNumber: string,
  accountNumber: string,
): Promise<RegisterBankResult> {
  /* ── Validate inputs ── */
  const parsed = registerSellerBankSchema.safeParse({
    name,
    routingNumber,
    accountNumber,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  /* ── Guard: env vars must be present ── */
  const apiKey = process.env[ENV_API_KEY];
  const orgId = process.env[ENV_ORG_ID];

  if (!apiKey || !orgId) {
    console.warn(
      `[AurumShield] ${ENV_API_KEY} or ${ENV_ORG_ID} not set — counterparty creation skipped`,
    );
    return {
      success: false,
      error: "Modern Treasury credentials not configured",
    };
  }

  /* ── Initialise client (per-call, never cached) ── */
  const mt = new ModernTreasury({
    apiKey,
    organizationID: orgId,
  });

  try {
    const counterparty = await mt.counterparties.create({
      name: parsed.data.name,
      accounts: [
        {
          account_type: "checking",
          routing_details: [
            {
              routing_number: parsed.data.routingNumber,
              routing_number_type: "aba",
            },
          ],
          account_details: [
            {
              account_number: parsed.data.accountNumber,
            },
          ],
        },
      ],
    });

    console.log(
      `[AurumShield] Counterparty created: id=${counterparty.id}, name="${parsed.data.name}"`,
    );

    return { success: true, counterpartyId: counterparty.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] registerSellerBank exception:", message);
    return { success: false, error: message };
  }
}
