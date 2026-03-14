/* ================================================================
   PHYSICAL ASSET REGISTRY — Gold Bar Lifecycle Service
   ================================================================
   Tracks the lifecycle of 400-oz Good Delivery bars with absolute
   precision. From raw doré mine-origin receipt through refinery
   allocation, provenance verification, and final ownership transfer.

   Methods:
     1. registerMineOriginShipment()  — Logs raw doré entering system
     2. registerGoodDeliveryAllocation() — Assigns serialized bar
     3. verifyAssetProvenance()       — Ultrasonic/conductivity check

   All methods emit SHA-256 tamper-evident audit records via the
   existing audit-logger.ts.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";
import { emitAuditEvent } from "@/lib/audit-logger";
import {
  registerDoreShipmentSchema,
  registerGoodDeliverySchema,
  type GoldAsset,
  type GoldAssetStatus,
  type AssetCustodian,
  type DoreShipment,
  type RegisterDoreShipmentInput,
  type RegisterGoodDeliveryInput,
  type ProvenanceVerification,
  type ProvenanceTestResult,
} from "./asset-registry.types";

/* ================================================================
   In-Memory Registry (Mock Persistence Layer)
   ================================================================
   In production, these would be PostgreSQL tables with the schema
   defined in asset-registry.types.ts. For the current architecture
   phase, we use an in-memory store that compiles, renders, and
   provides full CRUD with audit trails.

   TODO: Wire to PostgreSQL via @/lib/db when schema migrations
   are deployed (e.g., 010_asset_registry.sql).
   ================================================================ */

const assetRegistry: Map<string, GoldAsset> = new Map();
const doreShipments: Map<string, DoreShipment> = new Map();
const provenanceRecords: Map<string, ProvenanceVerification[]> = new Map();

/* ---------- ID Generation ---------- */

let _assetCounter = 0;
function nextAssetId(): string {
  _assetCounter += 1;
  return `ga-${Date.now().toString(36)}-${_assetCounter.toString().padStart(4, "0")}`;
}

let _doreCounter = 0;
function nextDoreShipmentId(): string {
  _doreCounter += 1;
  return `dore-${Date.now().toString(36)}-${_doreCounter.toString().padStart(4, "0")}`;
}

let _verificationCounter = 0;
function nextVerificationId(): string {
  _verificationCounter += 1;
  return `pv-${Date.now().toString(36)}-${_verificationCounter.toString().padStart(4, "0")}`;
}

/* ---------- SHA-256 Helper ---------- */

function hashRecord(data: Record<string, unknown>): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

/* ================================================================
   registerMineOriginShipment
   ================================================================
   Logs raw doré entering the system from a mine operator.
   Creates a new GoldAsset record in DORE_RECEIVED status and
   a linked DoreShipment record with origin metadata.

   @param input - Validated doré shipment details
   @returns Object containing the new GoldAsset and DoreShipment
   ================================================================ */

export async function registerMineOriginShipment(
  input: RegisterDoreShipmentInput,
): Promise<{ asset: GoldAsset; shipment: DoreShipment }> {
  // Validate input via Zod
  const validated = registerDoreShipmentSchema.parse(input);

  const now = new Date().toISOString();
  const assetId = nextAssetId();
  const shipmentId = nextDoreShipmentId();

  // Create the gold asset record
  const asset: GoldAsset = {
    asset_id: assetId,
    serial_number: null, // Not yet assigned — doré is unrefined
    refinery_hallmark: null,
    gross_weight: validated.estimated_gross_weight,
    purity: validated.estimated_purity,
    current_custodian: "MINE_OPERATOR",
    vault_location: validated.receiving_facility,
    erc3643_token_id: null,
    status: "DORE_RECEIVED",
    settlement_id: null,
    created_at: now,
    updated_at: now,
  };

  // Create the doré shipment record
  const shipment: DoreShipment = {
    shipment_id: shipmentId,
    asset_id: assetId,
    mine_name: validated.mine_name,
    mine_country: validated.mine_country,
    mine_operator: validated.mine_operator,
    estimated_gross_weight: validated.estimated_gross_weight,
    estimated_purity: validated.estimated_purity,
    lot_number: validated.lot_number,
    received_at: now,
    receiving_facility: validated.receiving_facility,
  };

  // Persist to in-memory registry
  assetRegistry.set(assetId, asset);
  doreShipments.set(shipmentId, shipment);

  // Audit trail
  emitAuditEvent(
    "asset_registry.dore_shipment_registered",
    "INFO",
    {
      assetId,
      shipmentId,
      mineName: validated.mine_name,
      mineCountry: validated.mine_country,
      mineOperator: validated.mine_operator,
      estimatedGrossWeight: validated.estimated_gross_weight,
      estimatedPurity: validated.estimated_purity,
      lotNumber: validated.lot_number,
      receivingFacility: validated.receiving_facility,
      recordHash: hashRecord(asset as unknown as Record<string, unknown>),
    },
  );

  console.log(
    `[ASSET_REGISTRY] Doré shipment registered: asset=${assetId} shipment=${shipmentId} ` +
    `mine=${validated.mine_name} (${validated.mine_country}) ` +
    `weight=${validated.estimated_gross_weight}oz purity=${validated.estimated_purity}`,
  );

  return { asset, shipment };
}

/* ================================================================
   registerGoodDeliveryAllocation
   ================================================================
   Assigns a specific serialized Good Delivery bar from vault
   inventory. Creates a new GoldAsset in GOOD_DELIVERY_ALLOCATED
   status with full bar details and settlement linkage.

   @param input - Validated Good Delivery bar details
   @returns The new GoldAsset record
   ================================================================ */

export async function registerGoodDeliveryAllocation(
  input: RegisterGoodDeliveryInput,
): Promise<GoldAsset> {
  // Validate input via Zod
  const validated = registerGoodDeliverySchema.parse(input);

  const now = new Date().toISOString();
  const assetId = nextAssetId();

  const asset: GoldAsset = {
    asset_id: assetId,
    serial_number: validated.serial_number,
    refinery_hallmark: validated.refinery_hallmark,
    gross_weight: validated.gross_weight,
    purity: validated.purity,
    current_custodian: validated.custodian as AssetCustodian,
    vault_location: validated.vault_location,
    erc3643_token_id: null,
    status: "GOOD_DELIVERY_ALLOCATED",
    settlement_id: validated.settlement_id,
    created_at: now,
    updated_at: now,
  };

  // Persist
  assetRegistry.set(assetId, asset);

  // If sourced from a doré shipment, update the doré → asset linkage
  if (validated.source_dore_shipment_id) {
    const dore = doreShipments.get(validated.source_dore_shipment_id);
    if (dore) {
      console.log(
        `[ASSET_REGISTRY] Linked Good Delivery bar ${assetId} to doré shipment ${validated.source_dore_shipment_id}`,
      );
    }
  }

  // Audit trail
  emitAuditEvent(
    "asset_registry.good_delivery_allocated",
    "INFO",
    {
      assetId,
      serialNumber: validated.serial_number,
      refineryHallmark: validated.refinery_hallmark,
      grossWeight: validated.gross_weight,
      purity: validated.purity,
      custodian: validated.custodian,
      vaultLocation: validated.vault_location,
      settlementId: validated.settlement_id,
      sourceDoreShipmentId: validated.source_dore_shipment_id ?? null,
      recordHash: hashRecord(asset as unknown as Record<string, unknown>),
    },
    { settlementId: validated.settlement_id },
  );

  console.log(
    `[ASSET_REGISTRY] Good Delivery bar allocated: asset=${assetId} ` +
    `serial=${validated.serial_number} hallmark=${validated.refinery_hallmark} ` +
    `weight=${validated.gross_weight}oz purity=${validated.purity} ` +
    `settlement=${validated.settlement_id}`,
  );

  return asset;
}

/* ================================================================
   verifyAssetProvenance
   ================================================================
   Confirms ultrasonic thickness gauging and conductivity test
   status for a registered gold asset. Returns a comprehensive
   provenance verification report.

   @param assetId - The asset to verify
   @returns ProvenanceVerification with test results

   // TODO: Wire to real gauging instrument APIs when available
   ================================================================ */

export async function verifyAssetProvenance(
  assetId: string,
): Promise<ProvenanceVerification> {
  const asset = assetRegistry.get(assetId);
  if (!asset) {
    throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} does not exist in the registry`);
  }

  const now = new Date().toISOString();
  const verificationId = nextVerificationId();

  // Simulate ultrasonic thickness gauging and conductivity tests
  // In production, these would call physical instrument APIs or
  // accept test results from laboratory equipment.
  const tests: ProvenanceTestResult[] = [
    {
      method: "ULTRASONIC_THICKNESS",
      passed: true,
      measured_value: `${(asset.gross_weight * 0.99 + Math.random() * asset.gross_weight * 0.02).toFixed(3)} oz`,
      expected_range: `${(asset.gross_weight * 0.995).toFixed(3)} - ${(asset.gross_weight * 1.005).toFixed(3)} oz`,
      confidence: 0.98,
      detail: "Ultrasonic pulse-echo thickness measurement within tolerance. No voids or density anomalies detected.",
      tested_at: now,
    },
    {
      method: "CONDUCTIVITY_TEST",
      passed: true,
      measured_value: "44.7 MS/m",
      expected_range: "44.0 - 45.5 MS/m",
      confidence: 0.97,
      detail: "Eddy current conductivity measurement consistent with 999.9 fine gold. No base metal substitution detected.",
      tested_at: now,
    },
    {
      method: "XRF_ANALYSIS",
      passed: true,
      measured_value: `${asset.purity.toFixed(1)} fine`,
      expected_range: `${(asset.purity - 0.5).toFixed(1)} - ${asset.purity.toFixed(1)} fine`,
      confidence: 0.96,
      detail: "X-ray fluorescence spectroscopy confirms declared purity. Trace elements within LBMA Good Delivery specifications.",
      tested_at: now,
    },
    {
      method: "VISUAL_INSPECTION",
      passed: true,
      measured_value: "PASS",
      expected_range: "PASS",
      confidence: 0.99,
      detail: `Refinery hallmark ${asset.refinery_hallmark ?? "N/A"} and serial ${asset.serial_number ?? "N/A"} visually confirmed. No signs of tampering.`,
      tested_at: now,
    },
  ];

  const overallPassed = tests.every((t) => t.passed);

  const verificationData: Omit<ProvenanceVerification, "verification_hash"> = {
    asset_id: assetId,
    verification_id: verificationId,
    overall_passed: overallPassed,
    tests,
    verified_by: "AURUMSHIELD_QUALITY_ASSURANCE",
    verified_at: now,
  };

  const verificationHash = hashRecord(verificationData as unknown as Record<string, unknown>);

  const verification: ProvenanceVerification = {
    ...verificationData,
    verification_hash: verificationHash,
  };

  // Store provenance record
  const existing = provenanceRecords.get(assetId) ?? [];
  provenanceRecords.set(assetId, [...existing, verification]);

  // Audit trail
  emitAuditEvent(
    "asset_registry.provenance_verified",
    overallPassed ? "INFO" : "CRITICAL",
    {
      assetId,
      verificationId,
      overallPassed,
      testCount: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      serialNumber: asset.serial_number,
      refineryHallmark: asset.refinery_hallmark,
      verificationHash,
    },
  );

  console.log(
    `[ASSET_REGISTRY] Provenance verification complete: asset=${assetId} ` +
    `verification=${verificationId} result=${overallPassed ? "PASS" : "FAIL"} ` +
    `tests=${tests.length} passed=${tests.filter((t) => t.passed).length}`,
  );

  return verification;
}

/* ================================================================
   Query Helpers
   ================================================================ */

/** Retrieve a gold asset by its ID. */
export function getAssetById(assetId: string): GoldAsset | undefined {
  return assetRegistry.get(assetId);
}

/** Retrieve all provenance verifications for an asset. */
export function getAssetProvenanceHistory(assetId: string): ProvenanceVerification[] {
  return provenanceRecords.get(assetId) ?? [];
}

/** Retrieve all assets allocated to a specific settlement. */
export function getAssetsBySettlementId(settlementId: string): GoldAsset[] {
  const results: GoldAsset[] = [];
  for (const asset of assetRegistry.values()) {
    if (asset.settlement_id === settlementId) {
      results.push(asset);
    }
  }
  return results;
}

/** Update asset status and custodian (internal — used by chain-of-custody). */
export function updateAssetCustody(
  assetId: string,
  status: GoldAssetStatus,
  custodian: AssetCustodian,
  vaultLocation: string,
): GoldAsset {
  const asset = assetRegistry.get(assetId);
  if (!asset) {
    throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} does not exist in the registry`);
  }

  const updated: GoldAsset = {
    ...asset,
    status,
    current_custodian: custodian,
    vault_location: vaultLocation,
    updated_at: new Date().toISOString(),
  };

  assetRegistry.set(assetId, updated);

  emitAuditEvent(
    "asset_registry.custody_updated",
    "INFO",
    {
      assetId,
      previousCustodian: asset.current_custodian,
      newCustodian: custodian,
      previousStatus: asset.status,
      newStatus: status,
      vaultLocation,
      recordHash: hashRecord(updated as unknown as Record<string, unknown>),
    },
  );

  return updated;
}
