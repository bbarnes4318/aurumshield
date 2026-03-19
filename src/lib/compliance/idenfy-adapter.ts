/* ================================================================
   IDENFY KYB/KYC ADAPTER — Parallel Compliance Provider
   ================================================================
   Server-side adapter for iDenfy identity verification.
   Operates alongside Veriff as a dynamically-routed provider
   controlled by ACTIVE_COMPLIANCE_PROVIDER env variable.

   iDenfy handles:
     - Identity document verification (passport, ID card, etc.)
     - Face match / liveness detection
     - AML/PEP screening
     - Proof of address verification

   API Docs: https://documentation.idenfy.com/
   Token API: POST https://ivs.idenfy.com/api/v2/token
   ================================================================ */

import "server-only";

/* ---------- Types ---------- */

export type IdenfyVerificationStatus =
  | "APPROVED"
  | "DENIED"
  | "SUSPECTED"
  | "REVIEWING"
  | "EXPIRED"
  | "ACTIVE";

export interface IdenfySessionResult {
  /** Always 'IDENFY' for routing traceability */
  provider: "IDENFY";
  /** The iDenfy scanRef — unique session identifier */
  sessionId: string;
  /** Redirect URL for the verification flow */
  url: string;
}

export interface IdenfyTokenResponse {
  /** Unique scan reference for this verification session */
  scanRef: string;
  /** The authentication token for the client SDK / redirect */
  authToken: string;
  /** Client ID echoed back */
  clientId: string;
  /** Expiry timestamp (ISO 8601) */
  expiryTime: number;
}

/* ---------- Constants ---------- */

const IDENFY_TOKEN_ENDPOINT = "https://ivs.idenfy.com/api/v2/token";
const IDENFY_REDIRECT_BASE = "https://ivs.idenfy.com/api/v2/redirect";

/* ---------- Session Generation ---------- */

/**
 * Generate a new iDenfy verification session.
 *
 * Calls the iDenfy token generation API with Basic Auth and returns
 * a standardized payload for the ComplianceEngine routing layer.
 *
 * @param userId  - AurumShield internal user ID (mapped to clientId)
 * @param entityName - Display name for the entity being verified
 * @returns Standardized session result with provider, sessionId, and redirect URL
 */
export async function generateSession(
  userId: string,
  entityName: string,
): Promise<IdenfySessionResult> {
  const apiKey = process.env.IDENFY_API_KEY;
  const apiSecret = process.env.IDENFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "[IDENFY] CRITICAL: IDENFY_API_KEY and IDENFY_API_SECRET must be configured. " +
        "Cannot generate verification session without credentials.",
    );
  }

  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // Per iDenfy docs: clientId is the ONLY required param.
  // Sending wrong firstName/lastName triggers SUSPECTED with NAME/SURNAME mismatch.
  // Only include names if we have real human names (not a Clerk userId like "user_3AW...").
  const isRealName = entityName && !entityName.startsWith("user_") && entityName.includes(" ");

  const requestBody: Record<string, unknown> = {
    clientId: userId,
  };

  if (isRealName) {
    requestBody.firstName = entityName.split(" ")[0];
    requestBody.lastName = entityName.split(" ").slice(1).join(" ");
  }

  console.log(
    `[IDENFY] Generating session for userId=${userId} entity="${entityName}" ` +
      `endpoint=${IDENFY_TOKEN_ENDPOINT} sendingNames=${isRealName}`,
  );

  const response = await fetch(IDENFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body");
    console.error(
      `[IDENFY] Token generation FAILED: HTTP ${response.status} — ${errorBody}`,
    );
    throw new Error(
      `iDenfy token generation failed: HTTP ${response.status} — ${errorBody}`,
    );
  }

  const data: IdenfyTokenResponse = await response.json();

  console.log(
    `[IDENFY] Session created: scanRef=${data.scanRef} clientId=${data.clientId}`,
  );

  return {
    provider: "IDENFY",
    sessionId: data.scanRef,
    url: `${IDENFY_REDIRECT_BASE}?authToken=${data.authToken}`,
  };
}
