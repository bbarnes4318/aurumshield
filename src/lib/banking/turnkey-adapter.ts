/* ================================================================
   TURNKEY MPC ADAPTER — Enterprise Wallet Infrastructure
   ================================================================
   Typed service adapter for the Turnkey API. Provides programmatic
   access to:
     1. Sub-organization creation (per-settlement isolation)
     2. HD wallet generation within the sub-org
     3. Ethereum address derivation for ERC-20 deposit collection

   Environment:
     TURNKEY_API_KEY           — Turnkey API bearer token
     TURNKEY_ORGANIZATION_ID   — Root organization ID
     TURNKEY_API_URL           — Base URL (default: https://api.turnkey.com)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";

/* ---------- Interfaces ---------- */

/** Result from creating a deposit wallet via Turnkey sub-organization. */
export interface TurnkeyDepositWallet {
  /** Turnkey-assigned sub-organization ID */
  subOrganizationId: string;
  /** Turnkey wallet ID within the sub-organization */
  walletId: string;
  /** Derived Ethereum address (ERC-20 compatible, 0x-prefixed) */
  ethereumAddress: string;
  /** Settlement ID this wallet was provisioned for */
  settlementId: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** Whether this wallet was provisioned via live Turnkey API */
  isLive: boolean;
}

/** Turnkey API error response shape. */
interface TurnkeyErrorBody {
  code?: string;
  message?: string;
  details?: unknown[];
}

/* ---------- Error Class ---------- */

/**
 * Structured error from the Turnkey API.
 * Captures HTTP status, Turnkey error code, and full response body
 * for forensic logging and operational alerting.
 */
export class TurnkeyApiError extends Error {
  public readonly httpStatus: number;
  public readonly turnkeyErrorCode: string;
  public readonly responseBody: string;

  constructor(opts: {
    message: string;
    httpStatus: number;
    turnkeyErrorCode: string;
    responseBody: string;
  }) {
    super(
      `TURNKEY_API_ERROR [${opts.httpStatus}] ${opts.turnkeyErrorCode}: ${opts.message}`,
    );
    this.name = "TurnkeyApiError";
    this.httpStatus = opts.httpStatus;
    this.turnkeyErrorCode = opts.turnkeyErrorCode;
    this.responseBody = opts.responseBody;
  }
}

/* ---------- Environment Key Names ---------- */

const ENV_API_KEY = "TURNKEY_API_KEY";
const ENV_ORG_ID = "TURNKEY_ORGANIZATION_ID";
const ENV_API_URL = "TURNKEY_API_URL";
const DEFAULT_API_URL = "https://api.turnkey.com";

/* ================================================================
   TurnkeyService Class
   ================================================================ */

export class TurnkeyService {
  readonly name = "Turnkey (Enterprise MPC Wallet Infrastructure)";

  private readonly apiKey: string;
  private readonly organizationId: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env[ENV_API_KEY] ?? "";
    this.organizationId = process.env[ENV_ORG_ID] ?? "";
    this.baseUrl = (process.env[ENV_API_URL] ?? DEFAULT_API_URL).replace(
      /\/$/,
      "",
    );
  }

  /* ---------- Configuration Check ---------- */

  /**
   * Check if Turnkey API credentials are present in the environment.
   * Must be true before any API calls are attempted.
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.organizationId.length > 0;
  }

  /* ---------- Internal HTTP Helper ---------- */

  /**
   * Execute an authenticated request against the Turnkey API.
   * All Turnkey endpoints use Bearer token auth and JSON request/response.
   *
   * @throws TurnkeyApiError on non-2xx responses
   */
  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new TurnkeyApiError({
        message: `${ENV_API_KEY} or ${ENV_ORG_ID} is not configured. Cannot call Turnkey API.`,
        httpStatus: 0,
        turnkeyErrorCode: "CONFIGURATION_MISSING",
        responseBody: "",
      });
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Organization-Id": this.organizationId,
    };

    console.log(
      `[TURNKEY] ${method} ${path}${body ? ` | payload_keys=${Object.keys(body).join(",")}` : ""}`,
    );

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorCode = "UNKNOWN";
      let errorMessage = responseText;
      try {
        const parsed = JSON.parse(responseText) as TurnkeyErrorBody;
        errorCode = parsed.code ?? "UNKNOWN";
        errorMessage = parsed.message ?? responseText;
      } catch {
        // Response body is not JSON — use raw text
      }

      console.error(
        `[TURNKEY] API error: ${method} ${path} → ${response.status} ${errorCode}: ${errorMessage}`,
      );

      throw new TurnkeyApiError({
        message: errorMessage,
        httpStatus: response.status,
        turnkeyErrorCode: errorCode,
        responseBody: responseText,
      });
    }

    const data = JSON.parse(responseText) as T;
    console.log(`[TURNKEY] ${method} ${path} → ${response.status} OK`);
    return data;
  }

  /* ================================================================
     createDepositWallet — Provision an MPC wallet for settlement
     ================================================================
     Flow:
       1. Create a sub-organization scoped to the settlement
       2. Create an HD wallet within the sub-org
       3. Derive an Ethereum address from the wallet
       4. Return the address for ERC-20 (USDC/USDT) deposit collection

     The sub-organization provides cryptographic isolation: each
     settlement's private key material is segregated at the MPC level.

     When TURNKEY_API_KEY is absent, returns a deterministic mock
     address derived from SHA-256(settlementId) so the UI always renders.
     ================================================================ */

  async createDepositWallet(
    settlementId: string,
  ): Promise<TurnkeyDepositWallet> {
    /* ── Mock mode: TURNKEY_API_KEY not configured ── */
    if (!this.isConfigured()) {
      console.warn(
        `[TURNKEY] API key not configured — returning mock deposit wallet for settlement=${settlementId}`,
      );

      // Derive a deterministic mock address from the settlement ID
      const hash = createHash("sha256")
        .update(`turnkey-mock-${settlementId}`)
        .digest("hex");
      const mockAddress = `0x${hash.slice(0, 40)}`;

      return {
        subOrganizationId: `mock-suborg-${settlementId.slice(0, 8)}`,
        walletId: `mock-wallet-${settlementId.slice(0, 8)}`,
        ethereumAddress: mockAddress,
        settlementId,
        createdAt: new Date().toISOString(),
        isLive: false,
      };
    }

    /* ── Live mode: Provision via Turnkey API ── */
    console.log(
      `[TURNKEY] Provisioning MPC deposit wallet for settlement: ${settlementId}`,
    );

    /* Step 1: Create a sub-organization scoped to this settlement */
    const subOrg = await this.request<{
      subOrganizationId: string;
    }>("POST", "/public/v1/submit/create_sub_organization", {
      type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V4",
      organizationId: this.organizationId,
      timestampMs: Date.now().toString(),
      parameters: {
        subOrganizationName: `AurumShield Settlement ${settlementId}`,
        rootQuorumThreshold: 1,
        rootUsers: [],
        wallet: {
          walletName: `settlement-${settlementId}`,
          accounts: [
            {
              curve: "CURVE_SECP256K1",
              pathFormat: "PATH_FORMAT_BIP32",
              path: "m/44'/60'/0'/0/0",
              addressFormat: "ADDRESS_FORMAT_ETHEREUM",
            },
          ],
        },
      },
    });

    console.log(
      `[TURNKEY] Sub-organization created: ${subOrg.subOrganizationId}`,
    );

    /* Step 2: Extract the wallet and address from the creation response */
    // Turnkey returns wallet details inline with sub-org creation when
    // the `wallet` parameter is provided in the create call.
    const walletDetails = await this.request<{
      wallet: {
        walletId: string;
        addresses: string[];
      };
    }>("POST", "/public/v1/query/list_wallets", {
      organizationId: subOrg.subOrganizationId,
    });

    const walletId = walletDetails.wallet.walletId;
    const ethereumAddress = walletDetails.wallet.addresses[0];

    if (!ethereumAddress || !ethereumAddress.startsWith("0x")) {
      throw new TurnkeyApiError({
        message: `Turnkey returned invalid Ethereum address: ${ethereumAddress}`,
        httpStatus: 0,
        turnkeyErrorCode: "INVALID_ADDRESS",
        responseBody: JSON.stringify(walletDetails),
      });
    }

    console.log(
      `[TURNKEY] MPC wallet provisioned: walletId=${walletId} address=${ethereumAddress}`,
    );

    return {
      subOrganizationId: subOrg.subOrganizationId,
      walletId,
      ethereumAddress,
      settlementId,
      createdAt: new Date().toISOString(),
      isLive: true,
    };
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated Turnkey service for convenience. */
export const turnkeyService = new TurnkeyService();
