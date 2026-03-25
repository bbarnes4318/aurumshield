/* ================================================================
   FUNDING STAGE — Zod Schema
   ================================================================
   Validation schema for the guided Funding stage at:
     /institutional/get-started/funding

   Captures the funding method selection and the associated
   details needed to configure institutional fund flow.

   Two funding modes (reused from BankDetailsForm architecture):
     Phase 1: Digital Stablecoin Bridge (USDC/USDT)
     Phase 2: Legacy Correspondent Banking (wire)

   Persisted in metadata_json.__funding via the standard
   PATCH /api/compliance/state path.
   ================================================================ */

import { z } from "zod";

/* ── Funding Method ── */

export const FUNDING_METHODS = ["digital_stablecoin", "legacy_wire"] as const;
export type FundingMethod = (typeof FUNDING_METHODS)[number];

/* ── Network & Asset Constants ── */

export const STABLECOIN_NETWORKS = [
  { value: "ERC-20 (Ethereum)", label: "ERC-20 (Ethereum)" },
  { value: "TRC-20 (Tron)", label: "TRC-20 (Tron)" },
  { value: "Solana", label: "Solana" },
  { value: "Base", label: "Base" },
] as const;

export const STABLECOIN_ASSETS = [
  { value: "USDC", label: "USDC (Circle)" },
  { value: "USDT", label: "USDT (Tether)" },
] as const;

/* ── Funding Stage Schema ── */

export const fundingStageSchema = z.object({
  /** Selected funding method */
  fundingMethod: z.enum(FUNDING_METHODS),

  /* ── Stablecoin fields ── */
  walletAddress: z.string().max(255),
  walletNetwork: z.string().max(100),
  stablecoinAsset: z.string().max(20),

  /* ── Wire fields ── */
  bankName: z.string().max(255),
  bankRoutingNumber: z.string().max(20),
  bankAccountNumber: z.string().max(40),
  bankSwiftCode: z.string().max(20),

  /** True once the user has submitted valid funding configuration */
  isFundingConfigured: z.boolean(),
});

/* ── Inferred Type ── */

export type FundingStageData = z.infer<typeof fundingStageSchema>;

/* ── Default Values — used by useForm and state restoration ── */

export const FUNDING_STAGE_DEFAULTS: FundingStageData = {
  fundingMethod: "digital_stablecoin",
  walletAddress: "",
  walletNetwork: "",
  stablecoinAsset: "",
  bankName: "",
  bankRoutingNumber: "",
  bankAccountNumber: "",
  bankSwiftCode: "",
  isFundingConfigured: false,
};

/**
 * Returns true when funding has been sufficiently configured to
 * allow progression to the first-trade stages.
 *
 * Fail-closed: returns false unless all required fields for the
 * selected method are populated AND isFundingConfigured is true.
 */
export function isFundingReady(data: FundingStageData): boolean {
  if (!data.isFundingConfigured) return false;

  if (data.fundingMethod === "digital_stablecoin") {
    return (
      data.walletAddress.trim().length > 0 &&
      data.walletNetwork.trim().length > 0 &&
      data.stablecoinAsset.trim().length > 0
    );
  }

  if (data.fundingMethod === "legacy_wire") {
    return (
      data.bankName.trim().length > 0 &&
      data.bankRoutingNumber.trim().length > 0 &&
      data.bankAccountNumber.trim().length > 0 &&
      data.bankSwiftCode.trim().length > 0
    );
  }

  return false;
}
