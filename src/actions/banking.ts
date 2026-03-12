"use server";

/* ================================================================
   SETTLEMENT BANKING — Server Action (Column Bank Exclusive)
   ================================================================
   Bridges the client-side TanStack Query hooks to the server-side
   settlement rail. This file runs ENTIRELY on the server — no API
   keys are ever exposed to the client.

   All settlements route through Column Bank (Fedwire).
   There is NO dual-rail routing, NO fallback.
   ================================================================ */

import { type SettlementPayoutResult } from "@/lib/settlement-rail";
import {
  ColumnBankService,
  type ColumnWireDestination,
} from "@/lib/banking/column-adapter";
import { TurnkeyService } from "@/lib/banking/turnkey-adapter";

/**
 * Execute a settlement payout via Column Bank (Fedwire).
 *
 * Instantiates the ColumnBankService and calls initiateOutboundWire()
 * to wire funds from the platform FBO account to the seller's external
 * bank account. If COLUMN_API_KEY is not configured, returns
 * deterministic mock data so the UI always renders in demo mode.
 *
 * @param settlementId    AurumShield settlement ID
 * @param sellerAccountId Column counterparty / FBO account ID for the seller
 * @param amount          Total settlement value in cents
 * @param fee             Platform fee in cents
 */
export async function triggerSettlementPayouts(
  settlementId: string,
  sellerAccountId: string,
  amount: number,
  fee: number,
): Promise<SettlementPayoutResult> {
  const sellerPayoutCents = amount - fee;
  const column = new ColumnBankService();

  /* ── Destination data for the seller's outbound wire ── */
  const destinationData: ColumnWireDestination = {
    routingNumber: "021000089",          // TODO: Pull from seller entity record
    accountNumber: sellerAccountId,
    beneficiaryName: "Seller Entity",    // TODO: Pull from seller entity record
  };

  /* ── Mock mode: COLUMN_API_KEY not configured ── */
  if (!column.isConfigured()) {
    console.warn(
      `[AurumShield] COLUMN_API_KEY not set — returning mock Column payout for settlement=${settlementId}`,
    );

    return {
      success: true,
      railUsed: "column",
      externalIds: [
        `mock-column-wire-${settlementId}`,
        `mock-column-fee-${settlementId}`,
      ],
      sellerPayoutCents,
      platformFeeCents: fee,
      isFallback: false,
      idempotencyKey: `${settlementId}:column:mock`,
    };
  }

  /* ── Live mode: Execute outbound Fedwire via Column ── */
  try {
    const wireResult = await column.initiateOutboundWire(
      sellerAccountId,
      sellerPayoutCents,
      destinationData,
      { settlementId },
    );

    console.log(
      `[AurumShield] Settlement payout via Column Bank for ${settlementId}:`,
      `wireId=${wireResult.id}`,
      `status=${wireResult.status}`,
      `sellerPayout=$${(sellerPayoutCents / 100).toFixed(2)}`,
      `platformFee=$${(fee / 100).toFixed(2)}`,
    );

    return {
      success: true,
      railUsed: "column",
      externalIds: [wireResult.id],
      sellerPayoutCents,
      platformFeeCents: fee,
      isFallback: false,
      idempotencyKey: `${settlementId}:column:${wireResult.id}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[AurumShield] Settlement payout FAILED for ${settlementId}:`,
      message,
    );

    return {
      success: false,
      railUsed: "column",
      externalIds: [],
      sellerPayoutCents: 0,
      platformFeeCents: fee,
      isFallback: false,
      error: message,
      idempotencyKey: `${settlementId}:column:failed`,
    };
  }
}

/* ================================================================
   COLUMN BANK — Dynamic Virtual Account Generation
   ================================================================
   Called from the Settlement Wizard (Step 4 — Review) when the buyer
   selects the Fedwire funding route. Returns a unique FBO virtual
   account that the buyer wires settlement funds into.

   Falls back to mock data when COLUMN_API_KEY is not configured,
   allowing development / demo mode to function without live keys.
   ================================================================ */


/** Structured result for the deposit instructions panel. */
export interface FiatDepositInstructions {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  virtualAccountId: string;
  currency: "USD";
  /** True if data came from the live Column API, false if mock */
  isLive: boolean;
}

/**
 * Generate dynamic Fedwire deposit instructions for a settlement.
 *
 * Instantiates the ColumnBankService, calls createVirtualAccount(),
 * and returns the generated routing/account pair. If Column is not
 * configured, returns deterministic mock data so the UI always renders.
 *
 * @param counterpartyId — Column counterparty ID for the buyer entity
 * @param settlementDescription — Human-readable description embedded in the virtual account
 */
export async function generateFiatDepositInstructions(
  counterpartyId: string,
  settlementDescription?: string,
): Promise<FiatDepositInstructions> {
  const column = new ColumnBankService();

  /* ── Live mode: Column API is configured ── */
  if (column.isConfigured()) {
    try {
      const virtualAccount = await column.createVirtualAccount(
        counterpartyId,
        settlementDescription,
      );

      console.log(
        `[AurumShield] Generated live deposit instructions: ` +
          `virtualAccountId=${virtualAccount.id} ` +
          `routing=${virtualAccount.routingNumber} ` +
          `account=${virtualAccount.accountNumber}`,
      );

      return {
        bankName: "Column N.A.",
        routingNumber: virtualAccount.routingNumber,
        accountNumber: virtualAccount.accountNumber,
        virtualAccountId: virtualAccount.id,
        currency: "USD",
        isLive: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[AurumShield] Column virtual account creation failed — falling back to mock:`,
        message,
      );
      // Fall through to mock data below
    }
  }

  /* ── Demo / development mode: return deterministic mock data ── */
  console.log(
    `[AurumShield] Column not configured — returning mock deposit instructions for counterparty=${counterpartyId}`,
  );

  return {
    bankName: "Column N.A.",
    routingNumber: "021000089",
    accountNumber: "7441920038561",
    virtualAccountId: `mock-va-${counterpartyId.slice(0, 8)}`,
    currency: "USD",
    isLive: false,
  };
}

/* ================================================================
   DIGITAL ASSET DEPOSIT — Turnkey MPC Wallet Address Generation
   ================================================================
   Called from the OTC Trading Terminal when the buyer selects the
   stablecoin (USDC/USDT) funding route. Provisions a unique ERC-20
   deposit wallet via Turnkey's Enterprise MPC infrastructure.

   Each settlement gets a dedicated sub-organization and HD wallet,
   providing cryptographic isolation at the MPC shard level.

   Falls back to a deterministic mock address when TURNKEY_API_PUBLIC_KEY
   is not configured, allowing demo mode to function without live keys.
   ================================================================ */

/** Structured result for the digital asset deposit instructions panel. */
export interface DigitalDepositInstructions {
  /** ERC-20 compatible deposit wallet address (0x...) */
  depositAddress: string;
  /** Supported network label */
  network: string;
  /** Accepted stablecoin tickers */
  acceptedTokens: string;
  /** ISO 8601 expiration timestamp for the deposit window */
  expiresAt: string;
  /** Duration in minutes for the deposit window */
  expirationMinutes: number;
  /** True if data came from a live MPC provider, false if mock */
  isLive: boolean;
  /** Turnkey sub-organization ID (for audit trail) */
  turnkeySubOrgId?: string;
  /** Turnkey wallet ID (for reconciliation) */
  turnkeyWalletId?: string;
}

/**
 * Generate digital asset deposit instructions for a stablecoin settlement.
 *
 * Instantiates the TurnkeyService and calls createDepositWallet() to
 * provision an MPC-isolated Ethereum address. If TURNKEY_API_PUBLIC_KEY is not
 * configured, returns a deterministic mock address so the UI always renders.
 *
 * @param amount        — Settlement amount in USD (used for logging / metadata)
 * @param settlementId  — AurumShield settlement ID (scopes the Turnkey sub-org)
 */
export async function generateDigitalDepositInstructions(
  amount: number,
  settlementId?: string,
): Promise<DigitalDepositInstructions> {
  const effectiveSettlementId = settlementId ?? `adhoc-${Date.now()}`;
  const turnkey = new TurnkeyService();

  const expirationMinutes = 15;
  const expiresAt = new Date(
    Date.now() + expirationMinutes * 60 * 1000,
  ).toISOString();

  try {
    const wallet = await turnkey.createDepositWallet(effectiveSettlementId);

    console.log(
      `[AurumShield] Generated digital deposit instructions via Turnkey: ` +
        `address=${wallet.ethereumAddress} ` +
        `amount=$${amount.toLocaleString()} ` +
        `isLive=${wallet.isLive} ` +
        `expires=${expiresAt}`,
    );

    return {
      depositAddress: wallet.ethereumAddress,
      network: "Ethereum (ERC-20)",
      acceptedTokens: "USDC / USDT",
      expiresAt,
      expirationMinutes,
      isLive: wallet.isLive,
      turnkeySubOrgId: wallet.subOrganizationId,
      turnkeyWalletId: wallet.walletId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[AurumShield] Turnkey wallet provisioning failed — returning error:`,
      message,
    );

    // Surface the failure to the caller; do NOT silently swallow
    throw new Error(
      `TURNKEY_WALLET_PROVISION_FAILED: ${message}`,
    );
  }
}
