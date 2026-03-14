/* ================================================================
   GOLD ASSET TYPES — Physical Asset Registry Schema
   ================================================================
   Domain types for tracking the lifecycle of 400-oz Good Delivery
   bars with absolute precision. Supports the full chain from raw
   doré mine origin through refined Good Delivery allocation to
   ERC-3643 tokenization.

   Schema fields per mandate:
     asset_id, serial_number, refinery_hallmark, gross_weight,
     purity, current_custodian, vault_location, erc3643_token_id
   ================================================================ */

import { z } from "zod";

/* ================================================================
   Core Gold Asset
   ================================================================ */

/** Lifecycle status of a gold asset in the registry. */
export type GoldAssetStatus =
  | "DORE_RECEIVED"
  | "REFINING_IN_PROGRESS"
  | "GOOD_DELIVERY_ALLOCATED"
  | "IN_VAULT"
  | "IN_TRANSIT"
  | "OWNERSHIP_TRANSFERRED"
  | "TOKENIZED"
  | "RETIRED";

/** Recognized custodians in the sovereign logistics network. */
export type AssetCustodian =
  | "MINE_OPERATOR"
  | "REFINERY"
  | "MALCA_AMIT"
  | "BRINKS"
  | "AURUMSHIELD_VAULT"
  | "BUYER";

/**
 * The canonical Gold Asset record.
 * Represents a single physical gold bar or doré shipment
 * tracked through the AurumShield clearinghouse.
 */
export interface GoldAsset {
  /** System-generated unique asset identifier */
  asset_id: string;
  /** Bar serial number (assigned at refinery) — null for doré */
  serial_number: string | null;
  /** LBMA refinery hallmark (e.g., "METALOR", "PAMP") — null for doré */
  refinery_hallmark: string | null;
  /** Gross weight in troy ounces */
  gross_weight: number;
  /** Fine gold purity (e.g., 999.9 for .9999 fine) */
  purity: number;
  /** Current physical custodian */
  current_custodian: AssetCustodian;
  /** Physical vault location identifier */
  vault_location: string;
  /** ERC-3643 security token ID — null until tokenized */
  erc3643_token_id: string | null;
  /** Current lifecycle status */
  status: GoldAssetStatus;
  /** Settlement ID this asset is allocated to — null if unallocated */
  settlement_id: string | null;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last update timestamp */
  updated_at: string;
}

/* ================================================================
   Doré Shipment (Mine Origin)
   ================================================================ */

/**
 * Raw doré shipment metadata logged when unrefined gold
 * enters the system from a mine operator.
 */
export interface DoreShipment {
  /** Unique doré shipment identifier */
  shipment_id: string;
  /** Linked asset ID in the registry */
  asset_id: string;
  /** Source mine name */
  mine_name: string;
  /** Mine operating country (ISO 3166-1 alpha-2) */
  mine_country: string;
  /** Mine operator / producing company */
  mine_operator: string;
  /** Estimated gross weight in troy ounces (pre-refining) */
  estimated_gross_weight: number;
  /** Estimated purity (pre-assay) */
  estimated_purity: number;
  /** Shipment lot / batch number */
  lot_number: string;
  /** ISO 8601 timestamp when doré was received */
  received_at: string;
  /** Receiving facility */
  receiving_facility: string;
}

/** Input for registering a mine origin shipment. */
export const registerDoreShipmentSchema = z.object({
  mine_name: z.string().min(1, "Mine name is required"),
  mine_country: z.string().length(2, "Country must be ISO 3166-1 alpha-2"),
  mine_operator: z.string().min(1, "Mine operator is required"),
  estimated_gross_weight: z.number().positive("Weight must be positive"),
  estimated_purity: z.number().min(0).max(999.9, "Purity cannot exceed 999.9"),
  lot_number: z.string().min(1, "Lot number is required"),
  receiving_facility: z.string().min(1, "Receiving facility is required"),
});

export type RegisterDoreShipmentInput = z.infer<typeof registerDoreShipmentSchema>;

/* ================================================================
   Good Delivery Allocation
   ================================================================ */

/** Input for allocating a Good Delivery bar from vault inventory. */
export const registerGoodDeliverySchema = z.object({
  serial_number: z.string().min(1, "Serial number is required"),
  refinery_hallmark: z.string().min(1, "Refinery hallmark is required"),
  gross_weight: z.number().positive("Weight must be positive"),
  purity: z.number().min(995.0, "Good Delivery minimum purity is 995.0").max(999.9),
  vault_location: z.string().min(1, "Vault location is required"),
  custodian: z.enum([
    "MINE_OPERATOR",
    "REFINERY",
    "MALCA_AMIT",
    "BRINKS",
    "AURUMSHIELD_VAULT",
    "BUYER",
  ]),
  settlement_id: z.string().min(1, "Settlement ID is required"),
  /** Optional: link doré shipment this bar was refined from */
  source_dore_shipment_id: z.string().optional(),
});

export type RegisterGoodDeliveryInput = z.infer<typeof registerGoodDeliverySchema>;

/* ================================================================
   Provenance Verification
   ================================================================ */

/** Verification method used for provenance confirmation. */
export type VerificationMethod =
  | "ULTRASONIC_THICKNESS"
  | "CONDUCTIVITY_TEST"
  | "XRF_ANALYSIS"
  | "FIRE_ASSAY"
  | "VISUAL_INSPECTION";

/** Individual test result within a provenance verification. */
export interface ProvenanceTestResult {
  method: VerificationMethod;
  passed: boolean;
  measured_value: string;
  expected_range: string;
  confidence: number;
  detail: string;
  tested_at: string;
}

/** Full provenance verification result for an asset. */
export interface ProvenanceVerification {
  asset_id: string;
  verification_id: string;
  overall_passed: boolean;
  tests: ProvenanceTestResult[];
  verified_by: string;
  verified_at: string;
  /** SHA-256 hash of the verification result */
  verification_hash: string;
}
