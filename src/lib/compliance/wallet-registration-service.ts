/* ================================================================
   WALLET REGISTRATION SERVICE — Compliance Domain Registration
   ================================================================
   Registers blockchain wallet addresses into the compliance domain
   (co_wallet_addresses) so the screening pipeline has real objects
   to work with.

   Called during institutional funding onboarding when a user enters
   a stablecoin wallet address. Idempotent — repeated calls with
   the same address update chain/asset/updatedAt instead of creating
   duplicates.

   DOES NOT trigger wallet screening (Elliptic KYT). Registration
   moves the wallet from NOT_REGISTERED → NEVER_SCREENED. Actual
   screening is performed at settlement time by the existing
   evaluateWalletForSettlement() pipeline.

   Requires:
     • co_subjects row for the user (created via getOrCreateSubject)
     • co_wallet_addresses row for the address (upserted)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq } from "drizzle-orm";
import {
  coSubjects,
  coWalletAddresses,
  type CoSubject,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface RegisterWalletInput {
  /** Clerk userId (maps to co_subjects.user_id). */
  userId: string;
  /** Blockchain wallet address. */
  address: string;
  /** Blockchain network (e.g., "ethereum", "tron", "solana", "base"). */
  chain: string;
  /** Stablecoin asset (e.g., "USDC", "USDT"). */
  asset: string;
  /** Optional human-readable label (e.g., "Institutional Custody Wallet"). */
  label?: string;
  /** Optional legal name for subject creation (falls back to userId). */
  legalName?: string;
}

export interface RegisterWalletResult {
  walletId: string;
  subjectId: string;
  address: string;
  chain: string;
  asset: string;
  isNew: boolean;
}

// ─── NETWORK NAME → CHAIN MAPPING ──────────────────────────────────────────────

/**
 * Maps the UI network display names from STABLECOIN_NETWORKS to
 * the chain identifiers used in co_wallet_addresses.
 */
const NETWORK_TO_CHAIN: Record<string, string> = {
  "ERC-20 (Ethereum)": "ethereum",
  "TRC-20 (Tron)": "tron",
  "Solana": "solana",
  "Base": "base",
};

/**
 * Resolve a UI network name to the chain identifier.
 * Falls back to lowercasing the input if not mapped.
 */
export function resolveChain(networkName: string): string {
  return NETWORK_TO_CHAIN[networkName] ?? networkName.toLowerCase();
}

// ─── SUBJECT HELPERS ───────────────────────────────────────────────────────────

/**
 * Get or create a compliance subject for a Clerk userId.
 *
 * Idempotent: if a co_subjects row with the given userId already
 * exists, it is returned. Otherwise, a new ENTITY subject is created
 * with ACTIVE status and STANDARD risk tier.
 */
export async function getOrCreateSubject(
  userId: string,
  legalName?: string,
): Promise<CoSubject> {
  const db = await getDb();

  // Step 1: Check for existing subject
  const [existing] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  // Step 2: Create new subject
  const [created] = await db
    .insert(coSubjects)
    .values({
      subjectType: "ENTITY",
      userId,
      legalName: legalName ?? `User ${userId}`,
      riskTier: "STANDARD",
      status: "ACTIVE",
    })
    .returning();

  console.log(
    `[WALLET_REGISTRATION] Created co_subjects row: id=${created.id} userId=${userId}`,
  );

  return created;
}

// ─── WALLET REGISTRATION ───────────────────────────────────────────────────────

/**
 * Register (or update) a blockchain wallet address in the compliance domain.
 *
 * IDEMPOTENCY:
 *   - Looks up co_wallet_addresses by address string.
 *   - If it exists, updates chain/asset/label/updatedAt.
 *   - If it doesn't exist, inserts a new record linked to the user's subject.
 *
 * Does NOT trigger screening. The wallet will be in NEVER_SCREENED state
 * until the Elliptic KYT pipeline processes it.
 */
export async function registerWalletAddress(
  input: RegisterWalletInput,
): Promise<RegisterWalletResult> {
  const db = await getDb();

  const address = input.address.trim();
  const chain = input.chain.trim();
  const asset = input.asset.trim().toUpperCase();
  const label = input.label ?? "Institutional Custody Wallet";

  if (!address) {
    throw new Error("WALLET_REGISTRATION_ERROR: Wallet address is required");
  }

  // Step 1: Ensure a compliance subject exists for this user
  const subject = await getOrCreateSubject(input.userId, input.legalName);

  // Step 2: Check if the wallet address is already registered
  const [existingWallet] = await db
    .select()
    .from(coWalletAddresses)
    .where(eq(coWalletAddresses.address, address))
    .limit(1);

  if (existingWallet) {
    // Update chain/asset/label if they changed
    await db
      .update(coWalletAddresses)
      .set({
        chain,
        asset,
        label,
        updatedAt: new Date(),
      })
      .where(eq(coWalletAddresses.id, existingWallet.id));

    console.log(
      `[WALLET_REGISTRATION] Updated existing wallet: id=${existingWallet.id} address=${address}`,
    );

    return {
      walletId: existingWallet.id,
      subjectId: subject.id,
      address,
      chain,
      asset,
      isNew: false,
    };
  }

  // Step 3: Insert new wallet record
  const [newWallet] = await db
    .insert(coWalletAddresses)
    .values({
      ownerSubjectId: subject.id,
      address,
      chain,
      asset,
      label,
      status: "ACTIVE",
    })
    .returning();

  console.log(
    `[WALLET_REGISTRATION] Created new wallet: id=${newWallet.id} address=${address} ` +
      `chain=${chain} asset=${asset} ownerSubjectId=${subject.id}`,
  );

  return {
    walletId: newWallet.id,
    subjectId: subject.id,
    address,
    chain,
    asset,
    isNew: true,
  };
}
