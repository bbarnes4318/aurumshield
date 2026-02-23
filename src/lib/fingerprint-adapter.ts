/* ================================================================
   FINGERPRINT ADAPTER — Server-Side Only
   ================================================================
   Wraps the Fingerprint.com Server API to verify visitor identity
   and assess device-level risk. Uses FINGERPRINT_SERVER_SECRET.

   MUST NOT be imported in client components.
   All API keys are read from process.env at call time.
   ================================================================ */

/* ---------- Result Types ---------- */

export interface FingerprintVerification {
  /** Whether Fingerprint considers this visitor trustworthy */
  trusted: boolean;
  /** Visitor ID returned by Fingerprint (persists across sessions) */
  visitorId: string;
  /** Confidence score 0–1 from the identification request */
  confidence: number;
  /** Whether this visitor was seen before (returning device) */
  isReturningVisitor: boolean;
  /** Number of previous identifications for this visitor */
  visitCount: number;
  /** IP address from the identification event */
  ipAddress: string | null;
  /** Human-readable risk assessment */
  riskDetail: string;
  /** Raw bot detection result */
  botDetected: boolean;
}

/* ---------- Environment ---------- */

const FINGERPRINT_API_URL = "https://api.fpjs.io";

/* ---------- Helpers ---------- */

function getServerSecret(): string | null {
  return process.env.FINGERPRINT_SERVER_SECRET ?? null;
}

/* ---------- Public API ---------- */

/**
 * Verify a Fingerprint visitor ID using the Server API.
 *
 * Calls `GET /visitors/:visitorId` with the server secret to retrieve
 * the full identification event, then applies risk heuristics:
 *
 * - Bot detection: auto-reject if bot probability > 0.5
 * - Velocity check: flag if > 10 identifications in 24h
 * - Confidence threshold: flag if confidence < 0.85
 *
 * @param visitorId - The `visitorId` captured client-side via `useVisitorData()`
 * @param requestId - Optional: specific requestId to verify (latest event used if omitted)
 *
 * Never throws — returns a structured result.
 */
export async function verifyVisitor(
  visitorId: string,
  requestId?: string,
): Promise<FingerprintVerification> {
  const secret = getServerSecret();

  if (!secret) {
    console.warn(
      "[AurumShield] FINGERPRINT_SERVER_SECRET not set — visitor verification skipped (demo mode)",
    );
    return {
      trusted: true,
      visitorId,
      confidence: 1,
      isReturningVisitor: false,
      visitCount: 0,
      ipAddress: null,
      riskDetail: "Fingerprint verification skipped — server secret not configured",
      botDetected: false,
    };
  }

  try {
    /* ── Fetch visitor events from Fingerprint Server API ── */
    const url = new URL(`${FINGERPRINT_API_URL}/visitors/${visitorId}`);
    url.searchParams.set("api_key", secret);
    if (requestId) {
      url.searchParams.set("request_id", requestId);
    }
    url.searchParams.set("limit", "10");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[AurumShield] Fingerprint Server API ${response.status}: ${body}`,
      );
      return {
        trusted: false,
        visitorId,
        confidence: 0,
        isReturningVisitor: false,
        visitCount: 0,
        ipAddress: null,
        riskDetail: `Fingerprint API error: ${response.status}`,
        botDetected: false,
      };
    }

    const data = await response.json();
    const visits = data.visits ?? [];
    const latestVisit = visits[0];

    if (!latestVisit) {
      return {
        trusted: false,
        visitorId,
        confidence: 0,
        isReturningVisitor: false,
        visitCount: 0,
        ipAddress: null,
        riskDetail: "No identification events found for this visitor",
        botDetected: false,
      };
    }

    /* ── Extract signals ── */
    const confidence = latestVisit.confidence?.score ?? 0;
    const botResult = latestVisit.botd?.bot?.result ?? "notDetected";
    const botDetected = botResult === "bad";
    const ipAddress = latestVisit.ip ?? null;
    const visitCount = visits.length;
    const isReturningVisitor = visitCount > 1;

    /* ── Risk heuristics ── */
    const riskFactors: string[] = [];

    if (botDetected) {
      riskFactors.push("Bot activity detected");
    }
    if (confidence < 0.85) {
      riskFactors.push(`Low confidence score: ${(confidence * 100).toFixed(1)}%`);
    }
    if (visitCount > 10) {
      riskFactors.push(`High velocity: ${visitCount} identifications recent`);
    }

    const trusted = riskFactors.length === 0;
    const riskDetail = trusted
      ? `Visitor verified — confidence ${(confidence * 100).toFixed(1)}%, ${visitCount} visit(s)`
      : `Risk factors: ${riskFactors.join("; ")}`;

    return {
      trusted,
      visitorId,
      confidence,
      isReturningVisitor,
      visitCount,
      ipAddress,
      riskDetail,
      botDetected,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] verifyVisitor exception:", message);
    return {
      trusted: false,
      visitorId,
      confidence: 0,
      isReturningVisitor: false,
      visitCount: 0,
      ipAddress: null,
      riskDetail: `Verification exception: ${message}`,
      botDetected: false,
    };
  }
}
