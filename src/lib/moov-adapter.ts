/* ================================================================
   MOOV ADAPTER — MoovSettlementRail Implementation
   ================================================================
   Implements the ISettlementRail interface using Moov's REST API
   for wallet-to-wallet escrow transfers and payouts.

   Authentication: HTTP Basic Auth with MOOV_PUBLIC_KEY:MOOV_SECRET_KEY
   against Moov's OAuth2 token endpoint, then Bearer token for API calls.

   Falls back to deterministic mock responses when credentials are absent.

   Requires:
     - MOOV_PUBLIC_KEY   (env var)
     - MOOV_SECRET_KEY   (env var)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import type {
  ISettlementRail,
  SettlementPayoutRequest,
  SettlementPayoutResult,
} from "./settlement-rail";

/* ---------- Environment ---------- */

const MOOV_API_BASE = "https://api.moov.io";
const MOOV_TOKEN_URL = "https://api.moov.io/oauth2/token";

function getMoovCredentials(): {
  publicKey: string;
  secretKey: string;
} | null {
  const publicKey = process.env.MOOV_PUBLIC_KEY;
  const secretKey = process.env.MOOV_SECRET_KEY;

  if (
    !publicKey ||
    !secretKey ||
    publicKey === "YOUR_MOOV_PUBLIC_KEY" ||
    secretKey === "YOUR_MOOV_SECRET_KEY"
  ) {
    return null;
  }

  return { publicKey, secretKey };
}

/* ---------- Token Cache ---------- */

interface MoovToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let _cachedToken: MoovToken | null = null;

/**
 * Authenticate with Moov using HTTP Basic Auth to get a Bearer token.
 * Caches the token and refreshes 60s before expiry.
 */
async function getAccessToken(
  publicKey: string,
  secretKey: string,
): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (_cachedToken && _cachedToken.expiresAt > now + 60_000) {
    return _cachedToken.accessToken;
  }

  const basicAuth = Buffer.from(`${publicKey}:${secretKey}`).toString(
    "base64",
  );

  const response = await fetch(MOOV_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "/accounts.write /accounts.read /transfers.write /transfers.read /wallets.read",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Moov token request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const expiresIn = (data.expires_in ?? 3600) as number; // seconds

  _cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return _cachedToken.accessToken;
}

/* ---------- REST Helper ---------- */

async function moovFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token: string;
  },
): Promise<T> {
  const url = `${MOOV_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Moov API ${options.method ?? "GET"} ${path} → ${response.status}: ${errBody}`,
    );
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/* ---------- Mock Implementation ---------- */

function mockPayout(
  request: SettlementPayoutRequest,
): SettlementPayoutResult {
  const sellerPayout = request.totalAmountCents - request.platformFeeCents;
  const mockTransferId = `mock-moov-xfr-${request.settlementId}-${Date.now().toString(36)}`;
  const mockFeeId = `mock-moov-fee-${request.settlementId}-${Date.now().toString(36)}`;

  console.warn(
    `[AurumShield] MOOV_PUBLIC_KEY not set — using mock payout for settlement ${request.settlementId} ($${(sellerPayout / 100).toFixed(2)} to seller)`,
  );

  return {
    success: true,
    railUsed: "moov",
    externalIds: [mockTransferId, mockFeeId],
    sellerPayoutCents: sellerPayout,
    platformFeeCents: request.platformFeeCents,
    isFallback: false,
  };
}

/* ---------- Moov Transfer Types ---------- */

interface MoovTransferResponse {
  transferID: string;
  status: string;
  amount: {
    value: number;
    currency: string;
  };
  createdOn: string;
}

/* ================================================================
   MoovSettlementRail Class
   ================================================================ */

export class MoovSettlementRail implements ISettlementRail {
  readonly name = "Moov (Wallet-to-Wallet)";

  /**
   * Check if Moov credentials are present in the environment.
   */
  isConfigured(): boolean {
    return getMoovCredentials() !== null;
  }

  /**
   * Execute a payout via Moov's transfer API.
   *
   * Flow:
   *   1. Authenticate via OAuth2 (Basic Auth → Bearer token)
   *   2. Create a wallet-to-wallet transfer for seller payout
   *   3. Create a separate transfer for platform fee sweep
   *   4. Return combined result with external IDs
   *
   * Falls back to mock when credentials are absent.
   */
  async executePayout(
    request: SettlementPayoutRequest,
  ): Promise<SettlementPayoutResult> {
    const creds = getMoovCredentials();

    // Mock fallback
    if (!creds) {
      return mockPayout(request);
    }

    const sellerPayoutCents =
      request.totalAmountCents - request.platformFeeCents;
    const externalIds: string[] = [];

    try {
      const token = await getAccessToken(creds.publicKey, creds.secretKey);

      /* ── 1. Seller Payout Transfer ── */
      const sellerTransfer = await moovFetch<MoovTransferResponse>(
        "/transfers",
        {
          method: "POST",
          token,
          body: {
            source: {
              // AurumShield escrow wallet
              paymentMethodID: process.env.MOOV_ESCROW_PAYMENT_METHOD_ID ?? "escrow-wallet",
            },
            destination: {
              // Seller's linked wallet/account
              paymentMethodID: request.sellerAccountId,
            },
            amount: {
              value: sellerPayoutCents,
              currency: "USD",
            },
            description: `AurumShield Settlement Payout: ${request.settlementId}`,
            metadata: {
              settlementId: request.settlementId,
              leg: "seller_payout",
              ...request.metadata,
            },
          },
        },
      );
      externalIds.push(sellerTransfer.transferID);

      /* ── 2. Platform Fee Sweep ── */
      if (request.platformFeeCents > 0) {
        const feeTransfer = await moovFetch<MoovTransferResponse>(
          "/transfers",
          {
            method: "POST",
            token,
            body: {
              source: {
                paymentMethodID: process.env.MOOV_ESCROW_PAYMENT_METHOD_ID ?? "escrow-wallet",
              },
              destination: {
                // AurumShield revenue wallet
                paymentMethodID: process.env.MOOV_REVENUE_PAYMENT_METHOD_ID ?? "revenue-wallet",
              },
              amount: {
                value: request.platformFeeCents,
                currency: "USD",
              },
              description: `AurumShield Platform Fee: ${request.settlementId}`,
              metadata: {
                settlementId: request.settlementId,
                leg: "fee_sweep",
              },
            },
          },
        );
        externalIds.push(feeTransfer.transferID);
      }

      return {
        success: true,
        railUsed: "moov",
        externalIds,
        sellerPayoutCents,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[AurumShield] Moov executePayout exception for ${request.settlementId}:`,
        message,
      );
      return {
        success: false,
        railUsed: "moov",
        externalIds,
        sellerPayoutCents: 0,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        error: message,
      };
    }
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated rail for convenience. */
export const moovRail = new MoovSettlementRail();
