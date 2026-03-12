/* ================================================================
   TURNKEY MPC ADAPTER — Enterprise Wallet Infrastructure
   ================================================================
   Typed service adapter for the Turnkey API using the official
   @turnkey/sdk-server SDK with X-Stamp cryptographic request signing.

   Provides programmatic access to:
     1. Sub-organization creation (per-settlement isolation)
     2. HD wallet generation within the sub-org
     3. Ethereum address derivation for ERC-20 deposit collection

   Environment:
     TURNKEY_API_PUBLIC_KEY    — Turnkey API public key (X-Stamp signing)
     TURNKEY_API_PRIVATE_KEY   — Turnkey API private key (X-Stamp signing)
     TURNKEY_ORGANIZATION_ID   — Root organization ID
     TURNKEY_API_URL           — Base URL (default: https://api.turnkey.com)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";
import {
  Turnkey,
  type TurnkeyApiClient,
  DEFAULT_ETHEREUM_ACCOUNTS,
} from "@turnkey/sdk-server";
import { isMockMode } from "@/lib/mock-mode";

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

const ENV_PUBLIC_KEY = "TURNKEY_API_PUBLIC_KEY";
const ENV_PRIVATE_KEY = "TURNKEY_API_PRIVATE_KEY";
const ENV_ORG_ID = "TURNKEY_ORGANIZATION_ID";
const ENV_API_URL = "TURNKEY_API_URL";
const DEFAULT_API_URL = "https://api.turnkey.com";

/* ================================================================
   TurnkeyService Class
   ================================================================ */

export class TurnkeyService {
  readonly name = "Turnkey (Enterprise MPC Wallet Infrastructure)";

  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly organizationId: string;
  private readonly baseUrl: string;

  /** Lazily initialized SDK client — created on first use. */
  private _apiClient: TurnkeyApiClient | null = null;

  constructor() {
    this.publicKey = process.env[ENV_PUBLIC_KEY] ?? "";
    this.privateKey = process.env[ENV_PRIVATE_KEY] ?? "";
    this.organizationId = process.env[ENV_ORG_ID] ?? "";
    this.baseUrl = (process.env[ENV_API_URL] ?? DEFAULT_API_URL).replace(
      /\/$/,
      "",
    );
  }

  /* ---------- Configuration Check ---------- */

  /**
   * Check if Turnkey API credentials are present in the environment.
   * Requires both the public/private key pair AND the organization ID.
   */
  isConfigured(): boolean {
    if (isMockMode()) return false;
    return (
      this.publicKey.length > 0 &&
      this.privateKey.length > 0 &&
      this.organizationId.length > 0
    );
  }

  /* ---------- SDK Client Initialization ---------- */

  /**
   * Initialize and return the Turnkey API client with X-Stamp signing.
   * The SDK handles cryptographic request stamping internally —
   * no Bearer tokens, no manual header construction.
   */
  private getApiClient(): TurnkeyApiClient {
    if (this._apiClient) return this._apiClient;

    const turnkeyClient = new Turnkey({
      apiBaseUrl: this.baseUrl,
      apiPublicKey: this.publicKey,
      apiPrivateKey: this.privateKey,
      defaultOrganizationId: this.organizationId,
    });

    this._apiClient = turnkeyClient.apiClient();
    return this._apiClient;
  }

  /* ================================================================
     createDepositWallet — Provision an MPC wallet for settlement
     ================================================================
     Flow:
       1. Create a sub-organization scoped to the settlement
       2. An HD wallet with an Ethereum account is created inline
       3. Extract the Ethereum address from the wallet accounts
       4. Return the address for ERC-20 (USDC/USDT) deposit collection

     The sub-organization provides cryptographic isolation: each
     settlement's private key material is segregated at the MPC level.

     When TURNKEY_API_PUBLIC_KEY / TURNKEY_API_PRIVATE_KEY are absent,
     returns a deterministic mock address derived from SHA-256(settlementId)
     so the UI always renders.
     ================================================================ */

  async createDepositWallet(
    settlementId: string,
  ): Promise<TurnkeyDepositWallet> {
    /* ── Mock mode: API keys not configured ── */
    if (!this.isConfigured()) {
      console.warn(
        `[TURNKEY] API keys not configured — returning mock deposit wallet for settlement=${settlementId}`,
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

    /* ── Live mode: Provision via Turnkey SDK ── */
    const api = this.getApiClient();

    console.log(
      `[TURNKEY] Provisioning MPC deposit wallet for settlement: ${settlementId}`,
    );

    try {
      /* Step 1: Create a sub-organization with an inline wallet */
      const subOrgResponse = await api.createSubOrganization({
        subOrganizationName: `AurumShield Settlement ${settlementId}`,
        rootQuorumThreshold: 1,
        rootUsers: [
          {
            userName: `settlement-${settlementId}`,
            apiKeys: [],
            authenticators: [],
            oauthProviders: [],
          },
        ],
        wallet: {
          walletName: `settlement-${settlementId}`,
          accounts: DEFAULT_ETHEREUM_ACCOUNTS,
        },
      });

      const subOrganizationId = subOrgResponse.subOrganizationId;

      console.log(
        `[TURNKEY] Sub-organization created: ${subOrganizationId}`,
      );

      /* Step 2: Extract wallet ID and Ethereum address */
      // The createSubOrganization response includes wallet details
      // when a wallet parameter is provided
      const walletId = subOrgResponse.wallet?.walletId;

      if (!walletId) {
        throw new TurnkeyApiError({
          message:
            "createSubOrganization did not return a wallet ID. " +
            "The wallet parameter may not have been processed correctly.",
          httpStatus: 0,
          turnkeyErrorCode: "MISSING_WALLET_ID",
          responseBody: JSON.stringify(subOrgResponse),
        });
      }

      // Extract the Ethereum address from wallet accounts
      const walletAddresses = subOrgResponse.wallet?.addresses ?? [];
      let ethereumAddress = walletAddresses[0] ?? "";

      // If addresses aren't in the creation response, query them explicitly
      if (!ethereumAddress) {
        console.log(
          `[TURNKEY] Wallet addresses not in creation response — querying wallet accounts...`,
        );

        const walletAccountsResponse = await api.getWalletAccounts({
          organizationId: subOrganizationId,
          walletId,
        });

        const ethAccount = walletAccountsResponse.accounts?.find(
          (a) => a.address?.startsWith("0x"),
        );

        ethereumAddress = ethAccount?.address ?? "";
      }

      if (!ethereumAddress || !ethereumAddress.startsWith("0x")) {
        throw new TurnkeyApiError({
          message: `Turnkey returned invalid Ethereum address: ${ethereumAddress}`,
          httpStatus: 0,
          turnkeyErrorCode: "INVALID_ADDRESS",
          responseBody: JSON.stringify(subOrgResponse),
        });
      }

      console.log(
        `[TURNKEY] MPC wallet provisioned: walletId=${walletId} address=${ethereumAddress}`,
      );

      return {
        subOrganizationId,
        walletId,
        ethereumAddress,
        settlementId,
        createdAt: new Date().toISOString(),
        isLive: true,
      };
    } catch (err) {
      // Re-throw our structured errors
      if (err instanceof TurnkeyApiError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[TURNKEY] Wallet provisioning FAILED for settlement=${settlementId}:`,
        message,
      );

      throw new TurnkeyApiError({
        message,
        httpStatus: 0,
        turnkeyErrorCode: "SDK_ERROR",
        responseBody: err instanceof Error ? err.stack ?? "" : String(err),
      });
    }
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated Turnkey service for convenience. */
export const turnkeyService = new TurnkeyService();
