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

  /* ================================================================
     sweepToTreasury — Transfer USDT from settlement wallet to treasury
     ================================================================
     After a USDT deposit is confirmed, this method sweeps the full
     balance from the per-settlement MPC wallet to the platform's
     central treasury address.

     Flow:
       1. Resolve the wallet and Ethereum account within the sub-org
       2. Construct a raw ERC-20 transfer(to, amount) transaction
       3. Sign via Turnkey's MPC signing infrastructure
       4. Broadcast the signed transaction to Ethereum mainnet

     Environment:
       TREASURY_WALLET_ADDRESS — Ethereum address for USDT consolidation
       ETHEREUM_RPC_URL        — JSON-RPC endpoint (e.g., Alchemy, Infura)

     CRITICAL: This method handles real funds. The transaction is
     irreversible once broadcast. The caller MUST verify the deposit
     amount matches the settlement notional before calling.
     ================================================================ */

  async sweepToTreasury(opts: {
    subOrganizationId: string;
    walletId: string;
    fromAddress: string;
    amountBaseUnits: string;
    settlementId: string;
  }): Promise<TurnkeySweepResult> {
    const treasuryAddress = process.env.TREASURY_WALLET_ADDRESS ?? "";
    const rpcUrl = process.env.ETHEREUM_RPC_URL ?? "";

    /* ── Mock mode ── */
    if (!this.isConfigured() || !treasuryAddress) {
      const mockTxHash = `0x${"0".repeat(8)}sweep${opts.settlementId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48).padEnd(48, "0")}`;
      console.warn(
        `[TURNKEY] Mock sweep: ${opts.amountBaseUnits} USDT base units ` +
        `from ${opts.fromAddress} → treasury (not configured). ` +
        `Mock txHash=${mockTxHash}`,
      );
      return {
        txHash: mockTxHash,
        fromAddress: opts.fromAddress,
        toAddress: treasuryAddress || "0x_TREASURY_NOT_CONFIGURED",
        amountBaseUnits: opts.amountBaseUnits,
        settlementId: opts.settlementId,
        isLive: false,
        sweptAt: new Date().toISOString(),
      };
    }

    /* ── Live mode: Sign and broadcast ERC-20 transfer ── */
    const api = this.getApiClient();

    console.log(
      `[TURNKEY] Sweeping USDT to treasury: ` +
      `from=${opts.fromAddress} to=${treasuryAddress} ` +
      `amount=${opts.amountBaseUnits} subOrg=${opts.subOrganizationId}`,
    );

    try {
      // Step 1: Get the current nonce for the from address
      const nonce = await this.getEthNonce(rpcUrl, opts.fromAddress);

      // Step 2: Construct the ERC-20 transfer calldata
      // transfer(address,uint256) selector = 0xa9059cbb
      const paddedTo = treasuryAddress.replace("0x", "").padStart(64, "0");
      // Pad amount to 32 bytes (uint256)
      const paddedAmount = BigInt(opts.amountBaseUnits).toString(16).padStart(64, "0");
      const transferData = `0xa9059cbb${paddedTo}${paddedAmount}`;

      // Step 3: Construct the raw transaction
      // Gas estimates for ERC-20 transfer on Ethereum mainnet
      const gasLimit = "0x" + (100_000).toString(16); // 100k gas (ERC-20 transfers ~65k)
      const gasPrice = await this.getGasPrice(rpcUrl);

      const rawTx = {
        to: USDT_CONTRACT,
        value: "0x0",
        data: transferData,
        nonce: "0x" + nonce.toString(16),
        gasLimit,
        gasPrice,
        chainId: 1, // Ethereum mainnet
        type: "0x0", // Legacy transaction
      };

      // Step 4: Sign via Turnkey MPC
      const signResult = await api.signTransaction({
        signWith: opts.fromAddress,
        organizationId: opts.subOrganizationId,
        unsignedTransaction: JSON.stringify(rawTx),
        type: "TRANSACTION_TYPE_ETHEREUM",
      });

      const signedTx = signResult.signedTransaction;

      if (!signedTx) {
        throw new TurnkeyApiError({
          message: "Turnkey signTransaction returned empty signedTransaction",
          httpStatus: 0,
          turnkeyErrorCode: "EMPTY_SIGNED_TX",
          responseBody: JSON.stringify(signResult),
        });
      }

      // Step 5: Broadcast the signed transaction
      const txHash = await this.broadcastTransaction(rpcUrl, signedTx);

      console.log(
        `[TURNKEY] ✓ Treasury sweep broadcast: txHash=${txHash} ` +
        `from=${opts.fromAddress} to=${treasuryAddress} ` +
        `amount=${opts.amountBaseUnits} USDT base units`,
      );

      return {
        txHash,
        fromAddress: opts.fromAddress,
        toAddress: treasuryAddress,
        amountBaseUnits: opts.amountBaseUnits,
        settlementId: opts.settlementId,
        isLive: true,
        sweptAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof TurnkeyApiError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[TURNKEY] Treasury sweep FAILED for settlement=${opts.settlementId}:`,
        message,
      );

      throw new TurnkeyApiError({
        message: `Treasury sweep failed: ${message}`,
        httpStatus: 0,
        turnkeyErrorCode: "SWEEP_ERROR",
        responseBody: err instanceof Error ? err.stack ?? "" : String(err),
      });
    }
  }

  /* ---------- Ethereum RPC Helpers ---------- */

  /** Get the current nonce for an address via JSON-RPC. */
  private async getEthNonce(rpcUrl: string, address: string): Promise<number> {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionCount",
        params: [address, "pending"],
      }),
    });
    const data = await res.json() as { result: string };
    return parseInt(data.result, 16);
  }

  /** Get the current gas price via JSON-RPC. */
  private async getGasPrice(rpcUrl: string): Promise<string> {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_gasPrice",
        params: [],
      }),
    });
    const data = await res.json() as { result: string };
    return data.result;
  }

  /** Broadcast a signed transaction via JSON-RPC. Returns the tx hash. */
  private async broadcastTransaction(rpcUrl: string, signedTx: string): Promise<string> {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [signedTx.startsWith("0x") ? signedTx : `0x${signedTx}`],
      }),
    });
    const data = await res.json() as { result?: string; error?: { message: string } };
    if (data.error) {
      throw new Error(`eth_sendRawTransaction failed: ${data.error.message}`);
    }
    if (!data.result) {
      throw new Error("eth_sendRawTransaction returned no tx hash");
    }
    return data.result;
  }
}

/* ---------- Interfaces ---------- */

/** Result from sweeping USDT from a settlement wallet to treasury. */
export interface TurnkeySweepResult {
  /** Ethereum transaction hash of the sweep */
  txHash: string;
  /** Source address (per-settlement MPC wallet) */
  fromAddress: string;
  /** Destination address (treasury) */
  toAddress: string;
  /** Amount swept in USDT base units (6 decimals) */
  amountBaseUnits: string;
  /** Settlement ID this sweep corresponds to */
  settlementId: string;
  /** Whether this was a live broadcast */
  isLive: boolean;
  /** ISO 8601 timestamp of the sweep */
  sweptAt: string;
}

/** USDT contract address on Ethereum mainnet */
const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/* ---------- Singleton Export ---------- */

/** Pre-instantiated Turnkey service for convenience. */
export const turnkeyService = new TurnkeyService();

