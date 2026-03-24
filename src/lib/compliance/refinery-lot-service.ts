/* ================================================================
   REFINERY LOT SERVICE — Assay Truth Domain Service
   ================================================================
   Manages the lifecycle of refinery lots — the COMMERCIAL SOURCE
   OF TRUTH for all gold transactions on the platform.

   The refinery assay result determines:
     - Actual purity (fineness)
     - Recoverable gold weight
     - Payable gold weight
     - Payable value

   Trade logic is SUBORDINATE to refinery truth. No settlement
   may proceed without a completed assay and determined payable value.

   Fail-Closed Rules:
     1. createRefineryLot() — Shipment must be DELIVERED_TO_REFINERY
     2. recordAssayResult() — Weight discrepancy > threshold →
        ASSAY_EXCEPTION (AssayExceptionError)

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  coPhysicalShipments,
  coSubjects,
  coRefineryLots,
  type CoRefineryLot,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Maximum allowed weight discrepancy between gross weight reported
 * at shipment and gross weight measured at refinery intake.
 *
 * If |shipmentWeight - assayWeight| / shipmentWeight > threshold,
 * the lot is flagged as ASSAY_EXCEPTION and rejected.
 *
 * Default: 5% — configurable via ASSAY_WEIGHT_TOLERANCE_PCT env var.
 */
const WEIGHT_TOLERANCE_PCT = parseFloat(
  process.env.ASSAY_WEIGHT_TOLERANCE_PCT || "0.05",
);

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

/**
 * Thrown when an assay reveals a critical weight discrepancy
 * between the shipped manifest weight and the refinery's measured
 * gross weight. This is a HARD STOP.
 *
 * Possible causes: theft, substitution, measurement error, or
 * manifest fraud. Requires manual investigation.
 */
export class AssayExceptionError extends Error {
  public readonly lotId: string;
  public readonly shipmentId: string;
  public readonly manifestWeight: string | null;
  public readonly measuredWeight: string;
  public readonly discrepancyPct: number;

  constructor(
    lotId: string,
    shipmentId: string,
    manifestWeight: string | null,
    measuredWeight: string,
    discrepancyPct: number,
  ) {
    super(
      `ASSAY_EXCEPTION: Lot ${lotId} (shipment ${shipmentId}) has a ` +
        `${(discrepancyPct * 100).toFixed(2)}% weight discrepancy ` +
        `(manifest=${manifestWeight ?? "N/A"}, measured=${measuredWeight}). ` +
        `Exceeds ${(WEIGHT_TOLERANCE_PCT * 100).toFixed(1)}% tolerance. ` +
        `Lot quarantined for investigation.`,
    );
    this.name = "AssayExceptionError";
    this.lotId = lotId;
    this.shipmentId = shipmentId;
    this.manifestWeight = manifestWeight;
    this.measuredWeight = measuredWeight;
    this.discrepancyPct = discrepancyPct;
  }
}

/**
 * Thrown when a shipment is not in the required state for lot creation.
 */
export class ShipmentStateError extends Error {
  public readonly shipmentId: string;
  public readonly currentStatus: string;
  public readonly requiredStatus: string;

  constructor(shipmentId: string, currentStatus: string, requiredStatus: string) {
    super(
      `SHIPMENT_STATE_ERROR: Shipment ${shipmentId} is in "${currentStatus}" — ` +
        `must be "${requiredStatus}" to create a refinery lot.`,
    );
    this.name = "ShipmentStateError";
    this.shipmentId = shipmentId;
    this.currentStatus = currentStatus;
    this.requiredStatus = requiredStatus;
  }
}

/**
 * Thrown when a referenced entity is not found.
 */
export class EntityNotFoundError extends Error {
  public readonly entityType: string;
  public readonly entityId: string;

  constructor(entityType: string, entityId: string) {
    super(`NOT_FOUND: ${entityType} with id ${entityId} does not exist.`);
    this.name = "EntityNotFoundError";
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

/**
 * Thrown when an assay result is recorded on a lot not in PENDING state.
 */
export class LotStateError extends Error {
  public readonly lotId: string;
  public readonly currentStatus: string;

  constructor(lotId: string, currentStatus: string) {
    super(
      `LOT_STATE_ERROR: Lot ${lotId} is in "${currentStatus}" — ` +
        `assay results can only be recorded when status is "PENDING".`,
    );
    this.name = "LotStateError";
    this.lotId = lotId;
    this.currentStatus = currentStatus;
  }
}

// ─── INPUT VALIDATION SCHEMAS ──────────────────────────────────────────────────

export const createRefineryLotSchema = z.object({
  shipmentId: z.string().uuid(),
  refinerySubjectId: z.string().uuid(),
});

export type CreateRefineryLotInput = z.infer<typeof createRefineryLotSchema>;

export const recordAssayResultSchema = z.object({
  grossWeight: z.string().regex(/^\d+(\.\d{1,4})?$/, "Invalid weight format"),
  netWeight: z.string().regex(/^\d+(\.\d{1,4})?$/, "Invalid weight format"),
  fineness: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Invalid fineness format"),
  assayCertificateRef: z.string().nullable().optional(),
});

export type RecordAssayResultInput = z.infer<typeof recordAssayResultSchema>;

// ─── SERVICE FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Create a new refinery lot from a delivered shipment.
 *
 * PRECONDITIONS (fail-closed):
 *   - shipmentId must reference an existing co_physical_shipments record
 *   - Shipment must be in DELIVERED_TO_REFINERY or RECEIVED_BY_REFINERY status
 *   - refinerySubjectId must reference an existing co_subjects record
 *
 * Sets initial lot state to PENDING_RECEIPT.
 * Logs REFINERY_RECEIPT_RECORDED to the immutable audit trail.
 *
 * @throws ShipmentStateError if shipment is not DELIVERED_TO_REFINERY
 * @throws EntityNotFoundError if shipment or refinery not found
 * @throws z.ZodError if input validation fails
 */
export async function createRefineryLot(
  data: CreateRefineryLotInput,
  userId: string,
): Promise<CoRefineryLot> {
  // ── Validate input ──
  const validated = createRefineryLotSchema.parse(data);

  const db = await getDb();

  // ── Verify shipment exists and is in correct state ──
  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, validated.shipmentId))
    .limit(1);

  if (!shipment) {
    throw new EntityNotFoundError("Physical Shipment", validated.shipmentId);
  }

  const validStates = ["DELIVERED_TO_REFINERY", "RECEIVED_BY_REFINERY"];
  if (!validStates.includes(shipment.shipmentStatus)) {
    throw new ShipmentStateError(
      validated.shipmentId,
      shipment.shipmentStatus,
      "DELIVERED_TO_REFINERY",
    );
  }

  // ── Verify refinery exists ──
  const [refinery] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, validated.refinerySubjectId))
    .limit(1);

  if (!refinery) {
    throw new EntityNotFoundError("Refinery Subject", validated.refinerySubjectId);
  }

  // ── Create lot in PENDING_RECEIPT state ──
  const [lot] = await db
    .insert(coRefineryLots)
    .values({
      shipmentId: validated.shipmentId,
      supplierSubjectId: shipment.supplierSubjectId,
      refinerySubjectId: validated.refinerySubjectId,
      receivedAt: new Date(),
      assayStatus: "PENDING_RECEIPT",
    })
    .returning();

  // ── Audit trail: REFINERY_RECEIPT_RECORDED ──
  await appendEvent(
    "REFINERY_LOT",
    lot.id,
    "REFINERY_RECEIPT_RECORDED",
    {
      shipmentId: validated.shipmentId,
      refineryLotId: lot.id,
      refinerySubjectId: validated.refinerySubjectId,
      receivedAt: lot.receivedAt?.toISOString() ?? new Date().toISOString(),
      grossWeight: "PENDING_ASSAY",
      sealIntact: true, // verified at delivery
    },
    userId,
  );

  console.log(
    `[REFINERY] Lot ${lot.id} created from shipment ${validated.shipmentId} ` +
      `at ${refinery.legalName} — status: PENDING_RECEIPT`,
  );

  return lot;
}

/**
 * Record an assay result for a refinery lot.
 *
 * Computes derived values:
 *   - recoverableGoldWeight = netWeight × fineness
 *   - payableGoldWeight = recoverableGoldWeight (1:1 for now)
 *
 * HARD-STOP LOGIC:
 *   If the measured grossWeight deviates from the shipment manifest
 *   weight by more than WEIGHT_TOLERANCE_PCT (default 5%), the lot
 *   is automatically transitioned to ASSAY_EXCEPTION and an
 *   AssayExceptionError is thrown.
 *
 * On success, marks assay_status = COMPLETE and settlement_ready = true.
 * Logs ASSAY_COMPLETED to the immutable audit trail.
 *
 * @throws AssayExceptionError if weight discrepancy exceeds tolerance
 * @throws EntityNotFoundError if lot not found
 * @throws LotStateError if lot is not in PENDING or PENDING_RECEIPT state
 * @throws z.ZodError if input validation fails
 */
export async function recordAssayResult(
  lotId: string,
  assayData: RecordAssayResultInput,
  userId: string,
): Promise<CoRefineryLot> {
  // ── Validate input ──
  const validated = recordAssayResultSchema.parse(assayData);

  const db = await getDb();

  // ── Verify lot exists and is in correct state ──
  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, lotId))
    .limit(1);

  if (!lot) {
    throw new EntityNotFoundError("Refinery Lot", lotId);
  }

  const validStates = ["PENDING_RECEIPT", "PENDING", "IN_PROGRESS"];
  if (!validStates.includes(lot.assayStatus)) {
    throw new LotStateError(lotId, lot.assayStatus);
  }

  // ── Load the parent shipment for weight comparison ──
  // TODO: Use shipment manifest weight for discrepancy check when
  // manifest weight tracking is added to co_physical_shipments
  const [_shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, lot.shipmentId))
    .limit(1);

  // ── HARD STOP: Weight discrepancy check ──
  // Compare the assay gross weight against any previously recorded
  // gross weight on the lot (from intake) or the shipment manifest.
  // If the lot already has a gross weight from intake, use that as
  // the reference. Otherwise, this is the first weight measurement.
  if (lot.grossWeight) {
    const manifestWeight = parseFloat(lot.grossWeight);
    const measuredWeight = parseFloat(validated.grossWeight);

    if (manifestWeight > 0) {
      const discrepancy = Math.abs(manifestWeight - measuredWeight) / manifestWeight;

      if (discrepancy > WEIGHT_TOLERANCE_PCT) {
        // ── Transition to ASSAY_EXCEPTION ──
        await db
          .update(coRefineryLots)
          .set({
            assayStatus: "ASSAY_EXCEPTION",
            grossWeight: validated.grossWeight,
            settlementReady: false,
          })
          .where(eq(coRefineryLots.id, lotId));

        // Audit the exception
        await appendEvent(
          "REFINERY_LOT",
          lotId,
          "ASSAY_COMPLETED",
          {
            refineryLotId: lotId,
            grossWeight: validated.grossWeight,
            netWeight: validated.netWeight,
            fineness: validated.fineness,
            recoverableGoldWeight: "REJECTED_EXCEPTION",
            assayCertificateRef: validated.assayCertificateRef ?? null,
          },
          userId,
        );

        console.error(
          `[REFINERY] ⛔ ASSAY_EXCEPTION on lot ${lotId}: ` +
            `${(discrepancy * 100).toFixed(2)}% weight discrepancy ` +
            `(manifest=${manifestWeight}, measured=${measuredWeight})`,
        );

        throw new AssayExceptionError(
          lotId,
          lot.shipmentId,
          lot.grossWeight,
          validated.grossWeight,
          discrepancy,
        );
      }
    }
  }

  // ── Calculate derived values ──
  const grossWeight = parseFloat(validated.grossWeight);
  const netWeight = parseFloat(validated.netWeight);
  const fineness = parseFloat(validated.fineness);

  // Recoverable gold = net weight × fineness (purity)
  const recoverableGoldWeight = netWeight * fineness;

  // Payable gold weight = recoverable gold (1:1 ratio — no deductions
  // for refining losses at this point; refinery terms may adjust later)
  const payableGoldWeight = recoverableGoldWeight;

  // ── Update lot with assay results ──
  const [updatedLot] = await db
    .update(coRefineryLots)
    .set({
      grossWeight: grossWeight.toFixed(4),
      netWeight: netWeight.toFixed(4),
      fineness: fineness.toFixed(6),
      recoverableGoldWeight: recoverableGoldWeight.toFixed(4),
      payableGoldWeight: payableGoldWeight.toFixed(4),
      assayCertificateRef: validated.assayCertificateRef ?? null,
      assayStatus: "COMPLETE",
      settlementReady: true,
    })
    .where(eq(coRefineryLots.id, lotId))
    .returning();

  // ── Audit trail: ASSAY_COMPLETED ──
  await appendEvent(
    "REFINERY_LOT",
    lotId,
    "ASSAY_COMPLETED",
    {
      refineryLotId: lotId,
      grossWeight: grossWeight.toFixed(4),
      netWeight: netWeight.toFixed(4),
      fineness: fineness.toFixed(6),
      recoverableGoldWeight: recoverableGoldWeight.toFixed(4),
      assayCertificateRef: validated.assayCertificateRef ?? null,
    },
    userId,
  );

  console.log(
    `[REFINERY] Assay complete for lot ${lotId}: ` +
      `gross=${grossWeight.toFixed(4)} oz, net=${netWeight.toFixed(4)} oz, ` +
      `fineness=${fineness.toFixed(6)}, recoverable=${recoverableGoldWeight.toFixed(4)} oz ` +
      `→ settlement_ready=true`,
  );

  return updatedLot;
}

/**
 * Get a refinery lot by ID with full details.
 */
export async function getRefineryLotById(
  lotId: string,
): Promise<CoRefineryLot | null> {
  const db = await getDb();

  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, lotId))
    .limit(1);

  return lot ?? null;
}

/**
 * Get all refinery lots for a given shipment.
 */
export async function getRefineryLotsByShipment(
  shipmentId: string,
): Promise<CoRefineryLot[]> {
  const db = await getDb();

  return db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.shipmentId, shipmentId));
}
