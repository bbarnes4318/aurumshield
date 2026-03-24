/* ================================================================
   COMPLIANCE INBOX QUERIES — Server-Side Data Fetching
   ================================================================
   Provides server actions for the V3 Compliance OS operator UI.
   Queries co_* tables via Drizzle ORM.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

"use server";

import { eq, desc, asc } from "drizzle-orm";
import {
  coCases,
  coSubjects,
  coChecks,
  coDecisions,
  coAuditEvents,
  coCaseTasks,
  coPhysicalShipments,
  coChainOfCustodyEvents,
  coRefineryLots,
  coSettlementAuthorizations,
  coPolicySnapshots,
  type CoCase,
  type CoSubject,
  type CoCheck,
  type CoDecision,
  type CoAuditEvent,
  type CoCaseTask,
  type CoPhysicalShipment,
  type CoChainOfCustodyEvent,
  type CoRefineryLot,
  type CoSettlementAuthorization,
  type CoPolicySnapshot,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";

// ─── INBOX TYPES ───────────────────────────────────────────────────────────────

export interface ComplianceCaseRow {
  id: string;
  caseType: string;
  status: string;
  priority: number;
  subjectId: string;
  legalName: string;
  subjectType: string;
  assignedReviewerId: string | null;
  policySnapshotId: string | null;
  closedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  isOverdue: boolean;
  ageHours: number;
}

function getSlaHours(priority: number): number {
  if (priority >= 90) return 4;
  if (priority >= 70) return 24;
  if (priority >= 50) return 72;
  return 168;
}

// ─── CASE DETAIL TYPES ─────────────────────────────────────────────────────────

export interface CaseDetailData {
  /* Core */
  caseRecord: CoCase;
  subject: CoSubject;
  policySnapshot: CoPolicySnapshot | null;

  /* Checks & Decisions */
  checks: CoCheck[];
  decisions: CoDecision[];

  /* Tasks */
  tasks: CoCaseTask[];

  /* Audit timeline */
  auditEvents: CoAuditEvent[];

  /* Related physical objects (may be empty) */
  linkedShipments: CoPhysicalShipment[];
  linkedLots: CoRefineryLot[];
  linkedSettlements: CoSettlementAuthorization[];

  /* Backend gaps (documented for transparency) */
  gaps: string[];
}

// ─── INBOX QUERY ───────────────────────────────────────────────────────────────

export async function getComplianceCaseInbox(): Promise<ComplianceCaseRow[]> {
  const db = await getDb();
  const now = Date.now();

  const rows = await db
    .select({
      id: coCases.id,
      caseType: coCases.caseType,
      status: coCases.status,
      priority: coCases.priority,
      subjectId: coCases.subjectId,
      legalName: coSubjects.legalName,
      subjectType: coSubjects.subjectType,
      assignedReviewerId: coCases.assignedReviewerId,
      policySnapshotId: coCases.policySnapshotId,
      closedReason: coCases.closedReason,
      createdAt: coCases.createdAt,
      updatedAt: coCases.updatedAt,
      closedAt: coCases.closedAt,
    })
    .from(coCases)
    .innerJoin(coSubjects, eq(coCases.subjectId, coSubjects.id))
    .orderBy(desc(coCases.priority), desc(coCases.createdAt));

  return rows.map((row) => {
    const createdMs = new Date(row.createdAt).getTime();
    const ageHours = Math.max(0, (now - createdMs) / (1000 * 60 * 60));
    const slaHours = getSlaHours(row.priority);
    const isTerminal = ["APPROVED", "REJECTED", "CLOSED", "EXPIRED"].includes(row.status);
    return {
      ...row,
      ageHours: Math.round(ageHours * 10) / 10,
      isOverdue: !isTerminal && ageHours > slaHours,
    };
  });
}

// ─── CASE DETAIL QUERY ─────────────────────────────────────────────────────────

/**
 * Fetch full case detail for the operator case detail view.
 *
 * Loads:
 *   A. Case core + subject + policy snapshot
 *   B. All co_checks for the case
 *   C. All co_decisions for the case
 *   D. All co_case_tasks for the case
 *   E. co_audit_events for this case aggregate_id
 *   F. Linked physical objects:
 *      - co_refinery_lots where intake_case_id = caseId
 *      - co_physical_shipments linked through lots (shipmentId)
 *      - co_settlement_authorizations where compliance_case_id = caseId
 *      - Also: shipments linked via same subject (for subject-level cases)
 */
export async function getComplianceCaseDetail(
  caseId: string,
): Promise<CaseDetailData | null> {
  const db = await getDb();
  const gaps: string[] = [];

  // ── A. Case core ──
  const [caseRecord] = await db
    .select()
    .from(coCases)
    .where(eq(coCases.id, caseId))
    .limit(1);

  if (!caseRecord) return null;

  // ── Subject ──
  const [subject] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, caseRecord.subjectId))
    .limit(1);

  if (!subject) return null;

  // ── Policy Snapshot ──
  let policySnapshot: CoPolicySnapshot | null = null;
  if (caseRecord.policySnapshotId) {
    const [snap] = await db
      .select()
      .from(coPolicySnapshots)
      .where(eq(coPolicySnapshots.id, caseRecord.policySnapshotId))
      .limit(1);
    policySnapshot = snap ?? null;
  }

  // ── B. Checks ──
  const checks = await db
    .select()
    .from(coChecks)
    .where(eq(coChecks.caseId, caseId))
    .orderBy(asc(coChecks.createdAt));

  // ── C. Decisions ──
  const decisions = await db
    .select()
    .from(coDecisions)
    .where(eq(coDecisions.caseId, caseId))
    .orderBy(desc(coDecisions.createdAt));

  // ── D. Tasks ──
  const tasks = await db
    .select()
    .from(coCaseTasks)
    .where(eq(coCaseTasks.caseId, caseId))
    .orderBy(asc(coCaseTasks.createdAt));

  // ── E. Audit Events ──
  const auditEvents = await db
    .select()
    .from(coAuditEvents)
    .where(eq(coAuditEvents.aggregateId, caseId))
    .orderBy(desc(coAuditEvents.createdAt));

  // ── F. Linked Physical Objects ──

  // Refinery lots linked via intake_case_id
  const linkedLots = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.intakeCaseId, caseId));

  // Shipments: linked through lots OR through same subject for shipment-review cases
  const shipmentIds = new Set(linkedLots.map((l) => l.shipmentId));
  let linkedShipments: CoPhysicalShipment[] = [];

  // Get shipments from linked lots
  for (const shipmentId of shipmentIds) {
    const [shipment] = await db
      .select()
      .from(coPhysicalShipments)
      .where(eq(coPhysicalShipments.id, shipmentId))
      .limit(1);
    if (shipment) linkedShipments.push(shipment);
  }

  // For PHYSICAL_SHIPMENT_REVIEW cases, also get shipments for this subject
  if (
    caseRecord.caseType === "PHYSICAL_SHIPMENT_REVIEW" &&
    linkedShipments.length === 0
  ) {
    const subjectShipments = await db
      .select()
      .from(coPhysicalShipments)
      .where(eq(coPhysicalShipments.supplierSubjectId, subject.id));
    linkedShipments = subjectShipments;
    if (subjectShipments.length === 0) {
      gaps.push(
        "No physical shipments found for this subject. Shipment review cases " +
          "require a direct shipment_id FK on co_cases for precise linking.",
      );
    }
  }

  // Settlement authorizations linked via compliance_case_id
  const linkedSettlements = await db
    .select()
    .from(coSettlementAuthorizations)
    .where(eq(coSettlementAuthorizations.complianceCaseId, caseId));

  // ── Document gaps ──
  // NOTE: co_cases has no reviewer_notes table — notes are embedded in audit events
  // NOTE: co_cases has no evidence_bundles table — evidence is in check rawPayloadRef
  if (checks.every((c) => !c.rawPayloadRef)) {
    gaps.push("No evidence payload references found on checks for this case.");
  }

  return {
    caseRecord,
    subject,
    policySnapshot,
    checks,
    decisions,
    tasks,
    auditEvents,
    linkedShipments,
    linkedLots,
    linkedSettlements,
    gaps,
  };
}

// ─── SHIPMENT DETAIL TYPES & QUERY ─────────────────────────────────────────────

export interface ShipmentDetailData {
  shipment: CoPhysicalShipment;
  supplierSubject: CoSubject;
  refinerySubject: CoSubject | null;
  custodyEvents: CoChainOfCustodyEvent[];
  linkedLots: CoRefineryLot[];
  linkedCases: CoCase[];
  auditEvents: CoAuditEvent[];
  gaps: string[];
}

export async function getShipmentDetail(
  shipmentId: string,
): Promise<ShipmentDetailData | null> {
  const db = await getDb();
  const gaps: string[] = [];

  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .limit(1);

  if (!shipment) return null;

  // Supplier subject
  const [supplierSubject] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, shipment.supplierSubjectId))
    .limit(1);

  if (!supplierSubject) return null;

  // Refinery subject
  let refinerySubject: CoSubject | null = null;
  if (shipment.refinerySubjectId) {
    const [ref] = await db
      .select()
      .from(coSubjects)
      .where(eq(coSubjects.id, shipment.refinerySubjectId))
      .limit(1);
    refinerySubject = ref ?? null;
  }

  // Chain of custody events
  const custodyEvents = await db
    .select()
    .from(coChainOfCustodyEvents)
    .where(eq(coChainOfCustodyEvents.shipmentId, shipmentId))
    .orderBy(asc(coChainOfCustodyEvents.eventTimestamp));

  // Linked refinery lots
  const linkedLots = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.shipmentId, shipmentId));

  // Linked cases — via lots' intakeCaseId
  const linkedCases: CoCase[] = [];
  const seenCaseIds = new Set<string>();
  for (const lot of linkedLots) {
    if (lot.intakeCaseId && !seenCaseIds.has(lot.intakeCaseId)) {
      seenCaseIds.add(lot.intakeCaseId);
      const [c] = await db
        .select()
        .from(coCases)
        .where(eq(coCases.id, lot.intakeCaseId))
        .limit(1);
      if (c) linkedCases.push(c);
    }
  }

  // Audit events for this shipment
  const auditEvents = await db
    .select()
    .from(coAuditEvents)
    .where(eq(coAuditEvents.aggregateId, shipmentId))
    .orderBy(desc(coAuditEvents.createdAt));

  if (custodyEvents.length === 0) {
    gaps.push("No chain-of-custody events recorded for this shipment.");
  }

  return {
    shipment,
    supplierSubject,
    refinerySubject,
    custodyEvents,
    linkedLots,
    linkedCases,
    auditEvents,
    gaps,
  };
}

// ─── LOT DETAIL TYPES & QUERY ──────────────────────────────────────────────────

export interface LotDetailData {
  lot: CoRefineryLot;
  shipment: CoPhysicalShipment | null;
  supplierSubject: CoSubject | null;
  refinerySubject: CoSubject | null;
  intakeCase: CoCase | null;
  linkedSettlements: CoSettlementAuthorization[];
  auditEvents: CoAuditEvent[];
  gaps: string[];
}

export async function getLotDetail(
  lotId: string,
): Promise<LotDetailData | null> {
  const db = await getDb();
  const gaps: string[] = [];

  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, lotId))
    .limit(1);

  if (!lot) return null;

  // Linked shipment
  let shipment: CoPhysicalShipment | null = null;
  if (lot.shipmentId) {
    const [s] = await db
      .select()
      .from(coPhysicalShipments)
      .where(eq(coPhysicalShipments.id, lot.shipmentId))
      .limit(1);
    shipment = s ?? null;
  }

  // Supplier subject
  let supplierSubject: CoSubject | null = null;
  if (lot.supplierSubjectId) {
    const [sub] = await db
      .select()
      .from(coSubjects)
      .where(eq(coSubjects.id, lot.supplierSubjectId))
      .limit(1);
    supplierSubject = sub ?? null;
  }

  // Refinery subject
  let refinerySubject: CoSubject | null = null;
  if (lot.refinerySubjectId) {
    const [ref] = await db
      .select()
      .from(coSubjects)
      .where(eq(coSubjects.id, lot.refinerySubjectId))
      .limit(1);
    refinerySubject = ref ?? null;
  }

  // Intake case
  let intakeCase: CoCase | null = null;
  if (lot.intakeCaseId) {
    const [c] = await db
      .select()
      .from(coCases)
      .where(eq(coCases.id, lot.intakeCaseId))
      .limit(1);
    intakeCase = c ?? null;
  }

  // Linked settlement authorizations (via refineryLotId)
  const linkedSettlements = await db
    .select()
    .from(coSettlementAuthorizations)
    .where(eq(coSettlementAuthorizations.refineryLotId, lotId));

  // Audit events
  const auditEvents = await db
    .select()
    .from(coAuditEvents)
    .where(eq(coAuditEvents.aggregateId, lotId))
    .orderBy(desc(coAuditEvents.createdAt));

  if (!lot.payableValue) {
    gaps.push("Payable value not yet determined — assay may be incomplete.");
  }
  if (!lot.assayCertificateRef) {
    gaps.push("No assay certificate reference attached to this lot.");
  }

  return {
    lot,
    shipment,
    supplierSubject,
    refinerySubject,
    intakeCase,
    linkedSettlements,
    auditEvents,
    gaps,
  };
}

// ─── SETTLEMENT DETAIL TYPES & QUERY ───────────────────────────────────────────

export interface SettlementDetailData {
  authorization: CoSettlementAuthorization;
  lot: CoRefineryLot | null;
  buyerSubject: CoSubject | null;
  complianceCase: CoCase | null;
  policySnapshot: CoPolicySnapshot | null;
  auditEvents: CoAuditEvent[];
  gaps: string[];
}

export async function getSettlementDetail(
  authorizationId: string,
): Promise<SettlementDetailData | null> {
  const db = await getDb();
  const gaps: string[] = [];

  const [authorization] = await db
    .select()
    .from(coSettlementAuthorizations)
    .where(eq(coSettlementAuthorizations.id, authorizationId))
    .limit(1);

  if (!authorization) return null;

  // Linked refinery lot
  let lot: CoRefineryLot | null = null;
  if (authorization.refineryLotId) {
    const [l] = await db
      .select()
      .from(coRefineryLots)
      .where(eq(coRefineryLots.id, authorization.refineryLotId))
      .limit(1);
    lot = l ?? null;
  }

  // Buyer subject
  let buyerSubject: CoSubject | null = null;
  if (authorization.buyerSubjectId) {
    const [b] = await db
      .select()
      .from(coSubjects)
      .where(eq(coSubjects.id, authorization.buyerSubjectId))
      .limit(1);
    buyerSubject = b ?? null;
  }

  // Compliance case
  let complianceCase: CoCase | null = null;
  if (authorization.complianceCaseId) {
    const [c] = await db
      .select()
      .from(coCases)
      .where(eq(coCases.id, authorization.complianceCaseId))
      .limit(1);
    complianceCase = c ?? null;
  }

  // Policy snapshot
  let policySnapshot: CoPolicySnapshot | null = null;
  if (authorization.policySnapshotId) {
    const [snap] = await db
      .select()
      .from(coPolicySnapshots)
      .where(eq(coPolicySnapshots.id, authorization.policySnapshotId))
      .limit(1);
    policySnapshot = snap ?? null;
  }

  // Audit events
  const auditEvents = await db
    .select()
    .from(coAuditEvents)
    .where(eq(coAuditEvents.aggregateId, authorizationId))
    .orderBy(desc(coAuditEvents.createdAt));

  // Gate results are computed at authorization time and stored as the verdict
  // No dedicated gate_results table — documented as gap
  gaps.push(
    "No dedicated gate_results table. The 6-gate pipeline is computed at authorization time " +
      "and only the final verdict is persisted. Individual gate pass/fail data requires a " +
      "co_settlement_gates table for detailed rendering.",
  );

  return {
    authorization,
    lot,
    buyerSubject,
    complianceCase,
    policySnapshot,
    auditEvents,
    gaps,
  };
}

