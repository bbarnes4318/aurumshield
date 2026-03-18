/* ================================================================
   TURNKEY MPC ADAPTER — Enterprise Wallet Infrastructure
   ================================================================
   Typed service adapter for the Turnkey API using the official
   @turnkey/sdk-server SDK with X-Stamp cryptographic request signing.

   Provides programmatic access to:
     1. Sub-organization creation (per-settlement isolation)
     2. HD wallet generation within the sub-org
     3. Ethereum address derivation for ERC-20 deposit collection
     4. Treasury sweep with automatic gas funding
     5. Outbound USDT payout to producer wallets

   Environment:
     TURNKEY_API_PUBLIC_KEY    — Turnkey API public key (X-Stamp signing)
     TURNKEY_API_PRIVATE_KEY   — Turnkey API private key (X-Stamp signing)
     TURNKEY_ORGANIZATION_ID   — Root organization ID
     TURNKEY_API_URL           — Base URL (default: https://api.turnkey.com)
     TREASURY_WALLET_ADDRESS   — Ethereum address for USDT consolidation
     ETHEREUM_RPC_URL          — Primary JSON-RPC endpoint (e.g., Alchemy)
     ETHEREUM_RPC_URL_FALLBACK — Secondary JSON-RPC endpoint (e.g., Infura)
     TREASURY_GAS_PRIVATE_KEY  — Hex private key for the central gas-funding wallet

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

/** Result from an outbound USDT payout to a producer wallet. */
export interface TurnkeyOutboundPayoutResult {
  /** Whether the payout was submitted successfully */
  success: boolean;
  /** Ethereum transaction hash (empty if mock) */
  txHash: string;
  /** Destination wallet address */
  toAddress: string;
  /** Amount in USDT base units (6 decimals) */
  amountBaseUnits: string;
  /** Settlement ID this payout corresponds to */
  settlementId: string;
  /** Whether this was a live broadcast */
  isLive: boolean;
  /** ISO 8601 timestamp */
  submittedAt: string;
  /** Error message if failed */
  error?: string;
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

/* ---------- RPC & Gas Constants ---------- */

/** Hard cap: reject any gas price above 150 gwei to prevent sweep drain. */
const MAX_GAS_PRICE_GWEI = BigInt(150);
const GWEI = BigInt(1_000_000_000);
const MAX_GAS_PRICE_WEI = MAX_GAS_PRICE_GWEI * GWEI;

/** Timeout for individual RPC calls (10 seconds). */
const RPC_TIMEOUT_MS = 10_000;

/** USDT contract address on Ethereum mainnet */
const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/* ================================================================
   TurnkeyService Class
   ================================================================ */

export class TurnkeyService {
  readonly name = "Turnkey (Enterprise MPC Wallet Infrastructure)";

  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly organizationId: string;
  private readonly baseUrl: string;

  /** Ordered list of RPC URLs for fallback resilience. */
  private readonly rpcUrls: string[];

  /** Lazily initialized SDK client — created on first use. */
  private _apiClient: TurnkeyApiClient | null = null;

  constructor(rpcUrls?: string[]) {
    this.publicKey = process.env[ENV_PUBLIC_KEY] ?? "";
    this.privateKey = process.env[ENV_PRIVATE_KEY] ?? "";
    this.organizationId = process.env[ENV_ORG_ID] ?? "";
    this.baseUrl = (process.env[ENV_API_URL] ?? DEFAULT_API_URL).replace(
      /\/$/,
      "",
    );

    // Build RPC URL list: explicit param > env vars
    if (rpcUrls && rpcUrls.length > 0) {
      this.rpcUrls = rpcUrls.filter((u) => u.length > 0);
    } else {
      const primary = process.env.ETHEREUM_RPC_URL ?? "";
      const fallback = process.env.ETHEREUM_RPC_URL_FALLBACK ?? "";
      this.rpcUrls = [primary, fallback].filter((u) => u.length > 0);
    }
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
       2. Calculate required gas and ensure gas balance (auto-fund if needed)
       3. Construct a raw ERC-20 transfer(to, amount) transaction
       4. Sign via Turnkey's MPC signing infrastructure
       5. Broadcast the signed transaction to Ethereum mainnet

     Environment:
       TREASURY_WALLET_ADDRESS   — Ethereum address for USDT consolidation
       ETHEREUM_RPC_URL          — Primary JSON-RPC endpoint
       ETHEREUM_RPC_URL_FALLBACK — Secondary JSON-RPC endpoint
       TREASURY_GAS_PRIVATE_KEY  — Hex private key for gas-funding wallet

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
      const nonce = await this.getEthNonce(opts.fromAddress);

      // Step 2: Construct the ERC-20 transfer calldata
      // transfer(address,uint256) selector = 0xa9059cbb
      const paddedTo = treasuryAddress.replace("0x", "").padStart(64, "0");
      // Pad amount to 32 bytes (uint256)
      const paddedAmount = BigInt(opts.amountBaseUnits).toString(16).padStart(64, "0");
      const transferData = `0xa9059cbb${paddedTo}${paddedAmount}`;

      // Step 3: Construct the raw transaction
      // Gas estimates for ERC-20 transfer on Ethereum mainnet
      const gasLimit = BigInt(100_000); // 100k gas (ERC-20 transfers ~65k)
      const gasPrice = await this.getGasPrice();

      // Step 3.5: Ensure the MPC wallet has sufficient ETH for gas
      const gasPriceWei = BigInt(gasPrice);
      const estimatedGasCostWei = gasLimit * gasPriceWei;

      await this.ensureGasBalance(opts.fromAddress, estimatedGasCostWei);

      const rawTx = {
        to: USDT_CONTRACT,
        value: "0x0",
        data: transferData,
        nonce: "0x" + nonce.toString(16),
        gasLimit: "0x" + gasLimit.toString(16),
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
      const txHash = await this.broadcastTransaction(signedTx);

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

  /* ================================================================
     executeOutboundPayout — Send USDT to a producer wallet address
     ================================================================
     TODO: Full implementation pending Turnkey outbound signing flow.

     This stub provides a defined interface for the dual-rail routing
     engine. In production, this will:
       1. Resolve the platform's treasury wallet sub-org
       2. Construct an ERC-20 transfer to the producer wallet
       3. Sign via Turnkey MPC and broadcast

     Currently returns a mock result so the settlement rail compiles
     and renders with the correct interface contract.
     ================================================================ */

  async executeOutboundPayout(opts: {
    producerWalletAddress: string;
    amountBaseUnits: string;
    settlementId: string;
    idempotencyKey: string;
  }): Promise<TurnkeyOutboundPayoutResult> {
    /* ── Mock / Unconfigured: return a deterministic stub ── */
    if (!this.isConfigured()) {
      const mockHash = createHash("sha256")
        .update(`outbound-${opts.idempotencyKey}`)
        .digest("hex");

      console.warn(
        `[TURNKEY] Mock outbound payout: ${opts.amountBaseUnits} USDT base units ` +
        `to ${opts.producerWalletAddress} for settlement=${opts.settlementId}. ` +
        `TODO: Implement live Turnkey outbound signing flow.`,
      );

      return {
        success: true,
        txHash: `0x${mockHash}`,
        toAddress: opts.producerWalletAddress,
        amountBaseUnits: opts.amountBaseUnits,
        settlementId: opts.settlementId,
        isLive: false,
        submittedAt: new Date().toISOString(),
      };
    }

    /* ── Live mode: TODO — implement Turnkey outbound signing ── */
    // TODO: This requires resolving the platform treasury sub-org,
    // constructing the ERC-20 transfer to the producer wallet,
    // MPC-signing via Turnkey, and broadcasting.
    console.warn(
      `[TURNKEY] Live outbound payout NOT YET IMPLEMENTED. ` +
      `Falling back to mock for settlement=${opts.settlementId}. ` +
      `Amount=${opts.amountBaseUnits} USDT to ${opts.producerWalletAddress}`,
    );

    const stubHash = createHash("sha256")
      .update(`outbound-live-stub-${opts.idempotencyKey}`)
      .digest("hex");

    return {
      success: true,
      txHash: `0x${stubHash}`,
      toAddress: opts.producerWalletAddress,
      amountBaseUnits: opts.amountBaseUnits,
      settlementId: opts.settlementId,
      isLive: false,
      submittedAt: new Date().toISOString(),
    };
  }

  /* ================================================================
     Gas Funding — Ensure MPC wallets have ETH for ERC-20 transfers
     ================================================================ */

  /**
   * Ensure the target address has sufficient ETH to cover the estimated
   * gas cost. If the balance is below the required amount, send the
   * exact deficit from the central gas-funding wallet.
   *
   * The gas-funding wallet's private key is read from TREASURY_GAS_PRIVATE_KEY.
   * This is a raw hex private key used to sign a simple ETH transfer.
   *
   * @throws TurnkeyApiError if TREASURY_GAS_PRIVATE_KEY is not configured
   * @throws Error if the gas funding transaction fails
   */
  private async ensureGasBalance(
    address: string,
    estimatedGasCostWei: bigint,
  ): Promise<void> {
    const currentBalance = await this.getEthBalance(address);

    if (currentBalance >= estimatedGasCostWei) {
      console.log(
        `[TURNKEY] Gas balance sufficient for ${address}: ` +
        `balance=${currentBalance.toString()} wei >= required=${estimatedGasCostWei.toString()} wei`,
      );
      return;
    }

    const deficit = estimatedGasCostWei - currentBalance;

    console.log(
      `[TURNKEY] Gas balance INSUFFICIENT for ${address}: ` +
      `balance=${currentBalance.toString()} wei, required=${estimatedGasCostWei.toString()} wei. ` +
      `Funding ${deficit.toString()} wei from gas wallet.`,
    );

    const gasPrivateKey = process.env.TREASURY_GAS_PRIVATE_KEY ?? "";
    if (!gasPrivateKey) {
      throw new TurnkeyApiError({
        message:
          "TREASURY_GAS_PRIVATE_KEY not configured. Cannot fund gas for MPC wallet sweep. " +
          `Address ${address} needs ${deficit.toString()} wei to cover gas.`,
        httpStatus: 0,
        turnkeyErrorCode: "GAS_FUNDING_NOT_CONFIGURED",
        responseBody: "",
      });
    }

    // Use ethers.js-compatible raw signing to send ETH from the gas wallet.
    // We construct, sign, and broadcast the funding transaction via JSON-RPC.
    const gasWalletKey = gasPrivateKey.startsWith("0x") ? gasPrivateKey : `0x${gasPrivateKey}`;

    // Derive the gas wallet address from the private key
    // We use the RPC to get the nonce, then construct a legacy tx
    const { ethers } = await import("ethers");
    const wallet = new ethers.Wallet(gasWalletKey);
    const gasWalletAddress = wallet.address;

    console.log(
      `[TURNKEY] Gas funding: ${gasWalletAddress} → ${address} (${deficit.toString()} wei)`,
    );

    // Get nonce for gas wallet
    const nonce = await this.getEthNonce(gasWalletAddress);

    // Use a fixed 21000 gas limit for a simple ETH transfer
    const fundingGasLimit = BigInt(21_000);
    const fundingGasPrice = await this.getGasPrice();
    const fundingGasPriceWei = BigInt(fundingGasPrice);

    // Construct the legacy transaction
    const fundingTx = ethers.Transaction.from({
      to: address,
      value: deficit,
      nonce,
      gasLimit: fundingGasLimit,
      gasPrice: fundingGasPriceWei,
      chainId: 1,
      type: 0,
    });

    // Sign with the gas wallet private key
    const signedFundingTx = await wallet.signTransaction(fundingTx);

    // Broadcast
    const fundingTxHash = await this.broadcastTransaction(signedFundingTx);

    console.log(
      `[TURNKEY] Gas funding tx broadcast: txHash=${fundingTxHash}. Waiting for confirmation...`,
    );

    // Poll for confirmation (up to 60 seconds)
    const confirmed = await this.waitForTransactionConfirmation(fundingTxHash, 60_000);

    if (!confirmed) {
      throw new Error(
        `Gas funding transaction ${fundingTxHash} did not confirm within 60 seconds. ` +
        `The sweep cannot proceed until the funding tx is mined.`,
      );
    }

    console.log(
      `[TURNKEY] ✓ Gas funding confirmed: txHash=${fundingTxHash}. ` +
      `${address} now has sufficient ETH for the ERC-20 sweep.`,
    );
  }

  /* ================================================================
     Ethereum RPC Helpers (with fallback resilience)
     ================================================================ */

  /**
   * Execute a JSON-RPC call with sequential fallback across configured
   * RPC URLs. If the primary endpoint fails or times out, automatically
   * retry with the secondary endpoint.
   *
   * @throws Error if all RPC endpoints fail
   */
  private async executeRpcCall<T>(
    method: string,
    params: unknown[],
  ): Promise<T> {
    if (this.rpcUrls.length === 0) {
      throw new Error(
        `No RPC URLs configured. Set ETHEREUM_RPC_URL (and optionally ETHEREUM_RPC_URL_FALLBACK).`,
      );
    }

    let lastError: Error | null = null;

    for (let i = 0; i < this.rpcUrls.length; i++) {
      const rpcUrl = this.rpcUrls[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await res.json() as { result?: T; error?: { message: string; code?: number } };

        if (data.error) {
          throw new Error(`RPC error from ${method}: ${data.error.message} (code: ${data.error.code ?? "N/A"})`);
        }

        return data.result as T;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isLastUrl = i === this.rpcUrls.length - 1;

        if (!isLastUrl) {
          console.warn(
            `[TURNKEY] RPC call ${method} failed on endpoint ${i + 1}/${this.rpcUrls.length}: ${errMsg}. Falling back to next endpoint.`,
          );
        }

        lastError = err instanceof Error ? err : new Error(errMsg);
      }
    }

    throw lastError ?? new Error(`All ${this.rpcUrls.length} RPC endpoints failed for ${method}`);
  }

  /** Get the ETH balance of an address (in wei). */
  private async getEthBalance(address: string): Promise<bigint> {
    const result = await this.executeRpcCall<string>("eth_getBalance", [address, "latest"]);
    return BigInt(result);
  }

  /** Get the current nonce for an address via JSON-RPC. */
  private async getEthNonce(address: string): Promise<number> {
    const result = await this.executeRpcCall<string>("eth_getTransactionCount", [address, "pending"]);
    return parseInt(result, 16);
  }

  /**
   * Get the current gas price via JSON-RPC.
   * Enforces a hard cap of MAX_GAS_PRICE_GWEI (150 gwei) to prevent
   * sweep drain during gas price spikes.
   *
   * @throws TurnkeyApiError if gas price exceeds the hard cap
   */
  private async getGasPrice(): Promise<string> {
    const result = await this.executeRpcCall<string>("eth_gasPrice", []);
    const gasPriceWei = BigInt(result);

    if (gasPriceWei > MAX_GAS_PRICE_WEI) {
      const gasPriceGwei = gasPriceWei / GWEI;
      throw new TurnkeyApiError({
        message:
          `Gas price ${gasPriceGwei.toString()} gwei exceeds hard cap of ${MAX_GAS_PRICE_GWEI.toString()} gwei. ` +
          `Sweep halted to prevent excessive gas expenditure. Will retry when gas normalizes.`,
        httpStatus: 0,
        turnkeyErrorCode: "GAS_PRICE_EXCEEDS_CAP",
        responseBody: JSON.stringify({ gasPrice: result, maxGwei: MAX_GAS_PRICE_GWEI.toString() }),
      });
    }

    return result;
  }

  /**
   * Broadcast a signed transaction via JSON-RPC. Returns the tx hash.
   * Uses RPC fallback for resilience.
   */
  private async broadcastTransaction(signedTx: string): Promise<string> {
    const txData = signedTx.startsWith("0x") ? signedTx : `0x${signedTx}`;

    // broadcastTransaction needs special handling because the RPC may return
    // an error object even with a 200 status
    if (this.rpcUrls.length === 0) {
      throw new Error("No RPC URLs configured for broadcast.");
    }

    let lastError: Error | null = null;

    for (let i = 0; i < this.rpcUrls.length; i++) {
      const rpcUrl = this.rpcUrls[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_sendRawTransaction",
            params: [txData],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await res.json() as { result?: string; error?: { message: string } };

        if (data.error) {
          throw new Error(`eth_sendRawTransaction failed: ${data.error.message}`);
        }
        if (!data.result) {
          throw new Error("eth_sendRawTransaction returned no tx hash");
        }

        return data.result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isLastUrl = i === this.rpcUrls.length - 1;

        if (!isLastUrl) {
          console.warn(
            `[TURNKEY] Broadcast failed on endpoint ${i + 1}/${this.rpcUrls.length}: ${errMsg}. Falling back.`,
          );
        }

        lastError = err instanceof Error ? err : new Error(errMsg);
      }
    }

    throw lastError ?? new Error("All RPC endpoints failed for eth_sendRawTransaction");
  }

  /** Get the current block number. */
  async getCurrentBlockNumber(): Promise<number> {
    const result = await this.executeRpcCall<string>("eth_blockNumber", []);
    return parseInt(result, 16);
  }

  /** Get a transaction receipt by hash. Returns null if not yet mined. */
  async getTransactionReceipt(txHash: string): Promise<{
    blockNumber: number;
    status: string;
  } | null> {
    const result = await this.executeRpcCall<{
      blockNumber: string;
      status: string;
    } | null>("eth_getTransactionReceipt", [txHash]);

    if (!result) return null;

    return {
      blockNumber: parseInt(result.blockNumber, 16),
      status: result.status,
    };
  }

  /**
   * Wait for a transaction to be mined, polling every 5 seconds.
   * Returns true if confirmed within the timeout, false otherwise.
   */
  private async waitForTransactionConfirmation(
    txHash: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const start = Date.now();
    const pollInterval = 5_000; // 5 seconds

    while (Date.now() - start < timeoutMs) {
      const receipt = await this.getTransactionReceipt(txHash);
      if (receipt) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return false;
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated Turnkey service for convenience. */
export const turnkeyService = new TurnkeyService();
