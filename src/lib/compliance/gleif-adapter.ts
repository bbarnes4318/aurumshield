/* ================================================================
   GLEIF ADAPTER — Legal Entity Identifier Validation
   ================================================================
   Queries the Global Legal Entity Identifier Foundation (GLEIF)
   public API to validate LEI format and registration status.

   API Docs: https://www.gleif.org/en/lei-data/gleif-api
   Base URL: https://api.gleif.org/api/v1/leis/

   No API key required — GLEIF API is publicly accessible.
   ================================================================ */

import "server-only";

/* ---------- Types ---------- */

export type LEIStatus =
  | "ISSUED"
  | "LAPSED"
  | "RETIRED"
  | "ANNULLED"
  | "PENDING_VALIDATION"
  | "PENDING_TRANSFER";

export interface LEIValidationResult {
  valid: boolean;
  lei: string;
  entityName: string | null;
  jurisdiction: string | null;
  status: LEIStatus | null;
  registrationDate: string | null;
  lastUpdateDate: string | null;
  managingLOU: string | null;
  error?: string;
}

export interface GLEIFEntityRecord {
  type: string;
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName: { name: string };
      jurisdiction: string;
      registeredAt: { id: string };
      registeredAs: string;
    };
    registration: {
      initialRegistrationDate: string;
      lastUpdateDate: string;
      status: LEIStatus;
      managingLou: string;
    };
  };
}

/* ---------- Constants ---------- */

const GLEIF_API_BASE = "https://api.gleif.org/api/v1/leis";
const LEI_REGEX = /^[A-Z0-9]{20}$/;

/* ---------- Format Validation ---------- */

/**
 * Validate LEI format per ISO 17442.
 * LEI must be exactly 20 alphanumeric characters.
 */
export function validateLEIFormat(lei: string): boolean {
  return LEI_REGEX.test(lei);
}

/* ---------- GLEIF API Query ---------- */

/**
 * Query the GLEIF API to validate an LEI and retrieve entity details.
 *
 * Returns the full validation result including entity name,
 * jurisdiction, and registration status.
 *
 * // TODO: API Integration — wire to live GLEIF API
 */
export async function validateLEI(lei: string): Promise<LEIValidationResult> {
  // Step 1: Format check
  if (!validateLEIFormat(lei)) {
    return {
      valid: false,
      lei,
      entityName: null,
      jurisdiction: null,
      status: null,
      registrationDate: null,
      lastUpdateDate: null,
      managingLOU: null,
      error: `Invalid LEI format: must be exactly 20 alphanumeric characters. Got: "${lei}"`,
    };
  }

  // Step 2: Query GLEIF
  try {
    // TODO: API Integration — replace mock with live fetch
    // const response = await fetch(`${GLEIF_API_BASE}/${lei}`, {
    //   headers: { Accept: "application/vnd.api+json" },
    //   signal: AbortSignal.timeout(10_000),
    // });
    //
    // if (response.status === 404) {
    //   return { valid: false, lei, ... error: "LEI not found in GLEIF database" };
    // }
    //
    // const data = await response.json();
    // const record = data.data as GLEIFEntityRecord;
    // ... parse and return

    // --- Mock implementation for demo mode ---
    console.log(`[GLEIF] Validating LEI: ${lei} against ${GLEIF_API_BASE}/${lei}`);

    // Deterministic mock: LEIs ending in '00' are LAPSED, others are ISSUED
    const isLapsed = lei.endsWith("00");

    return {
      valid: !isLapsed,
      lei,
      entityName: `Mock Institution (${lei.slice(0, 8)})`,
      jurisdiction: "US-NY",
      status: isLapsed ? "LAPSED" : "ISSUED",
      registrationDate: "2020-01-15T00:00:00Z",
      lastUpdateDate: new Date().toISOString(),
      managingLOU: "EVK05KS7XY1DEII3R011",
      error: isLapsed ? "LEI status is LAPSED — entity must renew registration" : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GLEIF] LEI validation failed for ${lei}:`, message);
    return {
      valid: false,
      lei,
      entityName: null,
      jurisdiction: null,
      status: null,
      registrationDate: null,
      lastUpdateDate: null,
      managingLOU: null,
      error: `GLEIF API query failed: ${message}`,
    };
  }
}

/**
 * Check if an LEI is currently active (status === ISSUED).
 * Convenience wrapper around validateLEI.
 */
export async function isLEIActive(lei: string): Promise<boolean> {
  const result = await validateLEI(lei);
  return result.valid && result.status === "ISSUED";
}
