"use server";

/* ================================================================
   GLEIF LEI VERIFICATION — Server Action
   ================================================================
   Wraps the gleif-adapter to expose LEI validation as a Next.js
   server action callable from client components.

   Returns the full LEIValidationResult so the UI can auto-populate
   entity name, jurisdiction, and display verification status.
   ================================================================ */

import {
  validateLEI,
  type LEIValidationResult,
} from "@/lib/compliance/gleif-adapter";

/**
 * Verify a Legal Entity Identifier against the GLEIF registry.
 *
 * Called from StepCorporateIdentity when the user clicks
 * [ VERIFY LEI VIA GLEIF ].
 */
export async function verifyLEI(lei: string): Promise<LEIValidationResult> {
  const normalized = lei.trim().toUpperCase();

  if (!normalized || normalized.length !== 20) {
    return {
      valid: false,
      lei: normalized,
      entityName: null,
      jurisdiction: null,
      status: null,
      registrationDate: null,
      lastUpdateDate: null,
      managingLOU: null,
      error: "LEI must be exactly 20 alphanumeric characters",
    };
  }

  return validateLEI(normalized);
}
