/* ================================================================
   VERIFF KYB ADAPTER — Know Your Business Session Management
   ================================================================
   Server-side adapter for Veriff's KYB verification flow.
   Replaces the former Persona ID verification with institutional-
   grade business entity verification.

   Veriff handles:
     - Business registration document verification
     - UBO (Ultimate Beneficial Owner) identification
     - AML/Sanctions screening (replaces OpenSanctions)
     - Proof of address document verification

   API Docs: https://developers.veriff.com/
   ================================================================ */

import "server-only";

/* ---------- Types ---------- */

export type VeriffSessionStatus =
  | "created"
  | "started"
  | "submitted"
  | "approved"
  | "declined"
  | "resubmission_requested"
  | "expired"
  | "abandoned";

export type VeriffCheckType =
  | "BUSINESS_REGISTRATION"
  | "UBO_VERIFICATION"
  | "AML_SCREENING"
  | "PROOF_OF_ADDRESS"
  | "SOURCE_OF_FUNDS";

export interface VeriffKYBSessionConfig {
  organizationId: string;
  entityName: string;
  leiCode: string;
  jurisdiction: string;
  checkTypes: VeriffCheckType[];
  callbackUrl?: string;
}

export interface VeriffKYBSession {
  sessionId: string;
  sessionUrl: string;
  status: VeriffSessionStatus;
  organizationId: string;
  checkTypes: VeriffCheckType[];
  createdAt: string;
  expiresAt: string;
}

export interface VeriffKYBDecision {
  sessionId: string;
  status: "approved" | "declined" | "resubmission_requested";
  checkResults: VeriffCheckResult[];
  riskScore: number;
  timestamp: string;
}

export interface VeriffCheckResult {
  checkType: VeriffCheckType;
  outcome: "PASS" | "FAIL" | "REVIEW";
  confidence: number;
  detail: string;
  subChecks?: { name: string; status: "PASSED" | "FAILED" | "PENDING" }[];
}

/* ---------- Constants ---------- */

const VERIFF_API_BASE = "https://stationapi.veriff.com/v1";
const SESSION_TTL_MINUTES = 60;

/* ---------- Session Creation ---------- */

/**
 * Create a new Veriff KYB verification session.
 *
 * This replaces the former Persona ID verification flow with
 * a server-side Veriff KYB session that covers:
 * - Business registration verification
 * - UBO identification & verification
 * - Integrated AML/Sanctions screening
 * - Proof of address validation
 *
 * // TODO: API Integration — wire to live Veriff API
 */
export async function createKYBSession(
  config: VeriffKYBSessionConfig,
): Promise<VeriffKYBSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);

  try {
    // TODO: API Integration — replace mock with live Veriff API call
    // const response = await fetch(`${VERIFF_API_BASE}/sessions`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-AUTH-CLIENT": process.env.VERIFF_API_KEY!,
    //   },
    //   body: JSON.stringify({
    //     verification: {
    //       person: { firstName: config.entityName },
    //       vendorData: config.organizationId,
    //       callback: config.callbackUrl,
    //     },
    //   }),
    // });

    console.log(
      `[Veriff KYB] Creating session for org=${config.organizationId}`,
      `entity=${config.entityName} LEI=${config.leiCode}`,
      `checks=${config.checkTypes.join(",")}`,
      `url=${VERIFF_API_BASE}/sessions`,
    );

    // --- Mock implementation for demo mode ---
    const sessionId = `veriff-kyb-${config.organizationId}-${Date.now().toString(36)}`;

    return {
      sessionId,
      sessionUrl: `https://magic.veriff.me/v/${sessionId}`,
      status: "created",
      organizationId: config.organizationId,
      checkTypes: config.checkTypes,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Veriff KYB] Session creation failed:`, message);
    throw new Error(`Veriff KYB session creation failed: ${message}`);
  }
}

/* ---------- Session Status Query ---------- */

/**
 * Query the status of an existing Veriff KYB session.
 *
 * // TODO: API Integration — wire to live Veriff API
 */
export async function getKYBSessionStatus(
  sessionId: string,
): Promise<VeriffKYBSession> {
  try {
    // TODO: API Integration — replace mock with live Veriff API call
    // const response = await fetch(`${VERIFF_API_BASE}/sessions/${sessionId}`, {
    //   headers: { "X-AUTH-CLIENT": process.env.VERIFF_API_KEY! },
    // });

    console.log(`[Veriff KYB] Querying session status: ${sessionId}`);

    // --- Mock: return a submitted session ---
    return {
      sessionId,
      sessionUrl: `https://magic.veriff.me/v/${sessionId}`,
      status: "submitted",
      organizationId: sessionId.split("-")[2] ?? "unknown",
      checkTypes: ["BUSINESS_REGISTRATION", "UBO_VERIFICATION", "AML_SCREENING"],
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Veriff KYB status query failed: ${message}`);
  }
}

/* ---------- Decision Webhook Processing ---------- */

/**
 * Process a Veriff KYB decision webhook payload.
 * Called when Veriff completes its verification checks.
 *
 * // TODO: API Integration — validate webhook signature
 */
export function processKYBDecision(
  webhookPayload: Record<string, unknown>,
): VeriffKYBDecision {
  // TODO: API Integration — parse real Veriff webhook payload
  // const { verification } = webhookPayload;
  // Validate HMAC signature using VERIFF_WEBHOOK_SECRET

  console.log(`[Veriff KYB] Processing decision webhook`);

  const sessionId = (webhookPayload.sessionId as string) ?? "unknown";

  // --- Mock: deterministic approval based on session ID ---
  const lastChar = sessionId.slice(-1);
  const isDeclined = lastChar === "0";

  const checkResults: VeriffCheckResult[] = [
    {
      checkType: "BUSINESS_REGISTRATION",
      outcome: isDeclined ? "FAIL" : "PASS",
      confidence: isDeclined ? 0.3 : 0.95,
      detail: isDeclined
        ? "Business registration could not be verified"
        : "Business registration verified against official registry",
    },
    {
      checkType: "UBO_VERIFICATION",
      outcome: "PASS",
      confidence: 0.92,
      detail: "Ultimate beneficial owners identified and verified",
    },
    {
      checkType: "AML_SCREENING",
      outcome: "PASS",
      confidence: 0.99,
      detail: "No sanctions, PEP, or adverse media matches found",
      subChecks: [
        { name: "OFAC SDN", status: "PASSED" },
        { name: "EU Sanctions", status: "PASSED" },
        { name: "UN Sanctions", status: "PASSED" },
        { name: "PEP Database", status: "PASSED" },
      ],
    },
  ];

  return {
    sessionId,
    status: isDeclined ? "declined" : "approved",
    checkResults,
    riskScore: isDeclined ? 78 : 12,
    timestamp: new Date().toISOString(),
  };
}
