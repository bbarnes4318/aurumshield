/* ================================================================
   SHIPMENT SERVICE — Physical Logistics Domain Service
   ================================================================
   Manages the lifecycle of physical gold shipments from mine to
   refinery via armored logistics (Brink's or equivalent).

   Fail-Closed Rules:
     1. createShipment() — Supplier must be APPROVED before dispatch
     2. recordCustodyEvent() — FAILED verification → automatic
        QUARANTINE of the parent shipment (ShipmentQuarantinedError)

   All mutations are logged to the immutable audit trail via the
   Phase 2.1 AuditLogger.

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  coSubjects,
  coPhysicalShipments,
  coChainOfCustodyEvents,
  type CoPhysicalShipment,
  type CoChainOfCustodyEvent,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

/**
 * Thrown when a shipment is quarantined due to a custody chain
 * integrity failure (broken seal, failed verification, etc.).
 * This is a HARD STOP — no further operations are permitted on
 * this shipment until manual investigation and resolution.
 */
export class ShipmentQuarantinedError extends Error {
  public readonly shipmentId: string;
  public readonly custodyEventId: string;
  public readonly reason: string;

  constructor(shipmentId: string, custodyEventId: string, reason: string) {
    super(
      `SHIPMENT_QUARANTINED: Shipment ${shipmentId} quarantined due to ` +
        `failed custody verification (eventId=${custodyEventId}): ${reason}`,
    );
    this.name = "ShipmentQuarantinedError";
    this.shipmentId = shipmentId;
    this.custodyEventId = custodyEventId;
    this.reason = reason;
  }
}

/**
 * Thrown when a supplier is not in APPROVED status.
 */
export class SupplierNotApprovedError extends Error {
  public readonly subjectId: string;
  public readonly currentStatus: string;

  constructor(subjectId: string, currentStatus: string) {
    super(
      `SUPPLIER_NOT_APPROVED: Subject ${subjectId} has status "${currentStatus}" — ` +
        `must be "ACTIVE" with approved compliance to create shipments.`,
    );
    this.name = "SupplierNotApprovedError";
    this.subjectId = subjectId;
    this.currentStatus = currentStatus;
  }
}

/**
 * Thrown when a referenced entity is not found in the database.
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

// ─── INPUT VALIDATION SCHEMAS ──────────────────────────────────────────────────

export const createShipmentSchema = z.object({
  supplierSubjectId: z.string().uuid(),
  refinerySubjectId: z.string().uuid(),
  mineReference: z.string().min(1, "Mine reference is required"),
  originCountry: z.string().min(1, "Origin country is required"),
  armoredCarrierName: z.string().min(1, "Armored carrier name is required"),
  brinksReference: z.string().nullable().optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const recordCustodyEventSchema = z.object({
  eventType: z.enum([
    "PICKUP",
    "TRANSFER",
    "TRANSPORT",
    "DELIVERY",
    "REFINERY_RECEIPT",
    "SEAL_CHECK",
  ]),
  location: z.string().nullable().optional(),
  eventTimestamp: z.string().datetime(),
  partyFrom: z.string().nullable().optional(),
  partyTo: z.string().nullable().optional(),
  sealNumber: z.string().nullable().optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
  notes: z.string().nullable().optional(),
});

export type RecordCustodyEventInput = z.infer<typeof recordCustodyEventSchema>;

// ─── SERVICE FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Create a new physical shipment.
 *
 * PRECONDITIONS (fail-closed):
 *   - supplierSubjectId must reference an existing co_subjects record
 *   - Supplier subject must have status = "ACTIVE"
 *   - refinerySubjectId must reference an existing co_subjects record
 *
 * Sets initial shipment state to CREATED.
 * Logs SHIPMENT_CREATED to the immutable audit trail.
 *
 * @throws SupplierNotApprovedError if supplier is not ACTIVE
 * @throws EntityNotFoundError if supplier or refinery subject not found
 * @throws z.ZodError if input validation fails
 */
export async function createShipment(
  data: CreateShipmentInput,
  userId: string,
): Promise<CoPhysicalShipment> {
  // ── Validate input ──
  const validated = createShipmentSchema.parse(data);

  const db = await getDb();

  // ── Verify supplier exists and is ACTIVE ──
  const [supplier] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, validated.supplierSubjectId))
    .limit(1);

  if (!supplier) {
    throw new EntityNotFoundError("Supplier Subject", validated.supplierSubjectId);
  }

  if (supplier.status !== "ACTIVE") {
    throw new SupplierNotApprovedError(supplier.id, supplier.status);
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

  // ── Create shipment in CREATED state ──
  const [shipment] = await db
    .insert(coPhysicalShipments)
    .values({
      supplierSubjectId: validated.supplierSubjectId,
      refinerySubjectId: validated.refinerySubjectId,
      mineReference: validated.mineReference,
      originCountry: validated.originCountry,
      armoredCarrierName: validated.armoredCarrierName,
      brinksReference: validated.brinksReference ?? null,
      shipmentStatus: "CREATED",
    })
    .returning();

  // ── Audit trail: SHIPMENT_CREATED ──
  await appendEvent(
    "SHIPMENT",
    shipment.id,
    "SHIPMENT_CREATED",
    {
      shipmentId: shipment.id,
      supplierSubjectId: validated.supplierSubjectId,
      refinerySubjectId: validated.refinerySubjectId,
      mineReference: validated.mineReference,
      originCountry: validated.originCountry,
      armoredCarrierName: validated.armoredCarrierName,
      brinksReference: validated.brinksReference ?? null,
    },
    userId,
  );

  console.log(
    `[SHIPMENT] Created ${shipment.id}: ` +
      `${supplier.legalName} → ${refinery.legalName} ` +
      `(mine=${validated.mineReference}, carrier=${validated.armoredCarrierName})`,
  );

  return shipment;
}

/**
 * Record a chain-of-custody event for a shipment.
 *
 * HARD-STOP LOGIC:
 *   If verificationStatus is "FAILED" (broken seal, missing Brink's
 *   manifest, tampered packaging), the service AUTOMATICALLY:
 *     1. Transitions the parent shipment to QUARANTINED
 *     2. Logs the quarantine to the audit trail
 *     3. Throws ShipmentQuarantinedError
 *
 *   This is an irreversible fail-closed enforcement. The shipment
 *   cannot proceed through the pipeline until manual investigation.
 *
 * @throws ShipmentQuarantinedError if verification_status = FAILED
 * @throws EntityNotFoundError if shipment not found
 * @throws z.ZodError if input validation fails
 */
export async function recordCustodyEvent(
  shipmentId: string,
  eventData: RecordCustodyEventInput,
  userId: string,
): Promise<CoChainOfCustodyEvent> {
  // ── Validate input ──
  const validated = recordCustodyEventSchema.parse(eventData);

  const db = await getDb();

  // ── Verify shipment exists and is not already quarantined ──
  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .limit(1);

  if (!shipment) {
    throw new EntityNotFoundError("Physical Shipment", shipmentId);
  }

  if (shipment.shipmentStatus === "QUARANTINED") {
    throw new ShipmentQuarantinedError(
      shipmentId,
      "N/A",
      "Shipment is already quarantined — no further custody events permitted.",
    );
  }

  // ── Insert the custody event ──
  const [custodyEvent] = await db
    .insert(coChainOfCustodyEvents)
    .values({
      shipmentId,
      eventType: validated.eventType,
      location: validated.location ?? null,
      eventTimestamp: new Date(validated.eventTimestamp),
      partyFrom: validated.partyFrom ?? null,
      partyTo: validated.partyTo ?? null,
      sealNumber: validated.sealNumber ?? null,
      verificationStatus: validated.verificationStatus,
      notes: validated.notes ?? null,
    })
    .returning();

  // ── Audit trail: CUSTODY_EVENT_ADDED ──
  await appendEvent(
    "CUSTODY_CHAIN",
    shipmentId,
    "CUSTODY_EVENT_ADDED",
    {
      shipmentId,
      custodyEventId: custodyEvent.id,
      eventType: validated.eventType,
      location: validated.location ?? null,
      partyFrom: validated.partyFrom ?? null,
      partyTo: validated.partyTo ?? null,
      sealNumber: validated.sealNumber ?? null,
      verificationStatus: validated.verificationStatus,
    },
    userId,
  );

  // ── HARD STOP: Failed verification → QUARANTINE ──
  if (validated.verificationStatus === "FAILED") {
    // Transition shipment to QUARANTINED
    await db
      .update(coPhysicalShipments)
      .set({ shipmentStatus: "QUARANTINED" })
      .where(eq(coPhysicalShipments.id, shipmentId));

    const reason =
      validated.notes ||
      `Custody verification FAILED at ${validated.eventType} ` +
        `(seal=${validated.sealNumber ?? "N/A"}, location=${validated.location ?? "N/A"})`;

    console.error(
      `[SHIPMENT] ⛔ QUARANTINED ${shipmentId}: ${reason}`,
    );

    // Log Brink's handoff as failed in audit trail
    await appendEvent(
      "SHIPMENT",
      shipmentId,
      "BRINKS_HANDOFF_VERIFIED",
      {
        shipmentId,
        brinksReference: shipment.brinksReference ?? "UNKNOWN",
        sealNumber: validated.sealNumber ?? "UNKNOWN",
        handoffTimestamp: validated.eventTimestamp,
        verifiedBy: `FAILED — quarantined by ${userId}`,
      },
      userId,
    );

    throw new ShipmentQuarantinedError(shipmentId, custodyEvent.id, reason);
  }

  console.log(
    `[SHIPMENT] Custody event recorded for ${shipmentId}: ` +
      `${validated.eventType} → ${validated.verificationStatus}`,
  );

  return custodyEvent;
}

/**
 * Update shipment status. Used for standard lifecycle transitions
 * (e.g., CREATED → PENDING_DISPATCH → DISPATCHED → IN_TRANSIT → DELIVERED_TO_REFINERY).
 *
 * @throws EntityNotFoundError if shipment not found
 */
export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: CoPhysicalShipment["shipmentStatus"],
  userId: string,
): Promise<CoPhysicalShipment> {
  const db = await getDb();

  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .limit(1);

  if (!shipment) {
    throw new EntityNotFoundError("Physical Shipment", shipmentId);
  }

  if (shipment.shipmentStatus === "QUARANTINED") {
    throw new ShipmentQuarantinedError(
      shipmentId,
      "N/A",
      "Cannot update status of a quarantined shipment.",
    );
  }

  const updateData: Partial<CoPhysicalShipment> = {
    shipmentStatus: newStatus,
  };

  // Auto-set timestamps based on status
  if (newStatus === "DISPATCHED") {
    updateData.dispatchedAt = new Date();
  } else if (
    newStatus === "DELIVERED_TO_REFINERY" ||
    newStatus === "RECEIVED_BY_REFINERY"
  ) {
    updateData.deliveredAt = new Date();
  }

  const [updated] = await db
    .update(coPhysicalShipments)
    .set(updateData)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .returning();

  console.log(
    `[SHIPMENT] ${shipmentId}: ${shipment.shipmentStatus} → ${newStatus} (by ${userId})`,
  );

  return updated;
}
