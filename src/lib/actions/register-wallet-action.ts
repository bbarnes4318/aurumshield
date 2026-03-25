"use server";

/* ================================================================
   SERVER ACTION: Register Funding Wallet
   ================================================================
   Registers a stablecoin wallet address in the compliance domain
   during institutional funding onboarding. Called from the funding
   page after the user enters their wallet details.

   Reuses:
     • registerWalletAddress()  — idempotent wallet upsert
     • resolveChain()           — maps UI network names to chain IDs
     • requireSession()         — auth gate

   Does NOT trigger wallet screening (deferred to settlement).
   ================================================================ */

import { requireSession, AuthError } from "@/lib/authz";
import {
  registerWalletAddress,
  resolveChain,
} from "@/lib/compliance/wallet-registration-service";

/* ── Types ── */

export interface RegisterWalletParams {
  address: string;
  network: string;
  asset: string;
  legalName?: string;
}

export interface RegisterWalletActionResult {
  status: "REGISTERED" | "ERROR";
  walletId?: string;
  isNew?: boolean;
  error?: string;
}

/* ── Action ── */

export async function serverRegisterFundingWallet(
  params: RegisterWalletParams,
): Promise<RegisterWalletActionResult> {
  /* Step 1: Auth */
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: "ERROR", error: err.message };
    }
    throw err;
  }

  const userId = session.userId;

  console.log(
    `[REGISTER_WALLET] ▶ serverRegisterFundingWallet for userId="${userId}" address="${params.address}"`,
  );

  /* Step 2: Register */
  try {
    const chain = resolveChain(params.network);

    const result = await registerWalletAddress({
      userId,
      address: params.address,
      chain,
      asset: params.asset,
      legalName: params.legalName,
    });

    console.log(
      `[REGISTER_WALLET] ✔ Wallet ${result.isNew ? "created" : "updated"}: id=${result.walletId}`,
    );

    return {
      status: "REGISTERED",
      walletId: result.walletId,
      isNew: result.isNew,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[REGISTER_WALLET] ✘ Registration failed:`, message);
    return {
      status: "ERROR",
      error: message,
    };
  }
}
