/* ================================================================
   ELLIPTIC KYT ADAPTER — Wallet Risk Screening (Know Your Transaction)
   ================================================================
   Fail-closed server-side adapter for Elliptic's AML API.
   Screens counterparty wallet addresses for risk exposure BEFORE
   allowing USDT funding into Turnkey non-custodial wallets.

   API Docs: https://docs.elliptic.co
   Endpoint: POST https://api.elliptic.co/v2/wallet/synchronous

   Auth: HMAC-SHA256 signature via x-access-key / x-access-sign /
         x-access-timestamp headers.

   Security: Fail-closed. Any network, parsing, or API error throws
   COMPLIANCE_API_UNAVAILABLE so upstream aborts the deposit flow.
   ================================================================ */

import "server-only";

import * as crypto from "node:crypto";

/* ---------- Environment Bootstrap (fail-fast) ---------- */

if (!process.env.ELLIPTIC_API_KEY) {
  throw new Error(
    "[FATAL] ELLIPTIC_API_KEY is undefined. Compliance engine cannot start."
  );
}
if (!process.env.ELLIPTIC_API_SECRET) {
  throw new Error(
    "[FATAL] ELLIPTIC_API_SECRET is undefined. Compliance engine cannot start."
  );
}

const ELLIPTIC_API_KEY: string = process.env.ELLIPTIC_API_KEY;
const ELLIPTIC_API_SECRET: string = process.env.ELLIPTIC_API_SECRET;

/* ---------- Constants ---------- */

const ELLIPTIC_ENDPOINT = "https://api.elliptic.co/v2/wallet/synchronous";
const ELLIPTIC_PATH = "/v2/wallet/synchronous";
const REQUEST_TIMEOUT_MS = 5_000;

/* ---------- Types ---------- */

export interface EllipticRiskResponse {
  id: string;
  risk_score: number; // 0.00 to 10.00
  risk_tier: number; // 1 to 5
  status: string;
}

interface EllipticPayload {
  subject: {
    asset: "holistic";
    blockchain: "holistic";
    type: "address";
    hash: string;
  };
  type: "wallet_exposure";
  customer_reference: string;
}

/* ---------- HMAC-SHA256 Signature ---------- */

function generateSignature(
  timestamp: string,
  payload: EllipticPayload
): string {
  const requestText =
    timestamp + "POST" + ELLIPTIC_PATH + JSON.stringify(payload);

  const hmac = crypto.createHmac(
    "sha256",
    Buffer.from(ELLIPTIC_API_SECRET, "base64")
  );
  hmac.update(requestText);
  return hmac.digest("base64");
}

/* ---------- Public API ---------- */

/**
 * Screen a wallet address against Elliptic's KYT AML database.
 *
 * Returns the risk assessment if the API responds successfully.
 * Throws `COMPLIANCE_API_UNAVAILABLE` on ANY failure — network timeout,
 * non-2xx status, or malformed response — to enforce fail-closed behavior.
 *
 * @param walletAddress   - The blockchain address to screen
 * @param customerReference - Internal reference ID for audit trail
 */
export async function screenWalletAddress(
  walletAddress: string,
  customerReference: string
): Promise<EllipticRiskResponse> {
  const payload: EllipticPayload = {
    subject: {
      asset: "holistic",
      blockchain: "holistic",
      type: "address",
      hash: walletAddress,
    },
    type: "wallet_exposure",
    customer_reference: customerReference,
  };

  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, payload);

  /* --- AbortController: strict 5s timeout --- */
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ELLIPTIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-key": ELLIPTIC_API_KEY,
        "x-access-sign": signature,
        "x-access-timestamp": timestamp,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `[ELLIPTIC] API returned ${response.status} ${response.statusText} ` +
          `for wallet ${walletAddress}. Customer ref: ${customerReference}.`
      );
      throw new Error("COMPLIANCE_API_UNAVAILABLE");
    }

    const data: unknown = await response.json();

    /* --- Structural validation (fail-closed on malformed response) --- */
    if (
      !data ||
      typeof data !== "object" ||
      !("id" in data) ||
      !("risk_score" in data) ||
      !("risk_tier" in data) ||
      !("status" in data)
    ) {
      console.error(
        `[ELLIPTIC] Malformed response for wallet ${walletAddress}. ` +
          `Missing required fields (id, risk_score, risk_tier, status).`
      );
      throw new Error("COMPLIANCE_API_UNAVAILABLE");
    }

    const result = data as EllipticRiskResponse;

    console.log(
      `[ELLIPTIC] Wallet ${walletAddress} screened — ` +
        `risk_score: ${result.risk_score}, risk_tier: ${result.risk_tier}, ` +
        `status: ${result.status}. Ref: ${customerReference}.`
    );

    return result;
  } catch (err: unknown) {
    /* --- Already our sentinel error — rethrow directly --- */
    if (err instanceof Error && err.message === "COMPLIANCE_API_UNAVAILABLE") {
      throw err;
    }

    /* --- Timeout (AbortError) --- */
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(
        `[ELLIPTIC] Request timed out after ${REQUEST_TIMEOUT_MS}ms ` +
          `for wallet ${walletAddress}. Ref: ${customerReference}.`
      );
      throw new Error("COMPLIANCE_API_UNAVAILABLE");
    }

    /* --- Any other fetch/network/parse failure --- */
    const safeMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[ELLIPTIC] Unexpected failure screening wallet ${walletAddress}: ` +
        `${safeMessage}. Ref: ${customerReference}.`
    );
    throw new Error("COMPLIANCE_API_UNAVAILABLE");
  } finally {
    clearTimeout(timeoutId);
  }
}
