/* ================================================================
   COMPLIANCE OPERATING SYSTEM — Drizzle ORM Schema
   ================================================================
   Phase 1.1: Refinery-centered domain model for the fail-closed
   Compliance Operating System.

   OPERATING MODEL:
     Mine → Armored Logistics → Refinery → Assay → Settlement
     The refinery assay result is the SOURCE OF TRUTH for the
     economic transaction. No settlement may be authorized until
     the full chain of custody is verified and assay is complete.

   SETTLEMENT PRECONDITIONS (fail-closed):
     1. Shipment has complete verified custody chain
     2. Refinery lot exists
     3. Assay is complete
     4. Payable value is determined
     5. Supplier screening is still valid
     6. Buyer screening is still valid
     7. Sanctions screening is clear
     8. Required funding/payment rail checks are clear

   Table prefix: co_  (Compliance OS v2)
   Preserves existing compliance_cases / compliance_events tables.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ─── ENUMS ─────────────────────────────────────────────────────────────────────

export const subjectTypeEnum = pgEnum("co_subject_type", [
  "INDIVIDUAL",
  "ENTITY",
  "SUPPLIER",
  "REFINERY",
  "INTERNAL_USER",
]);

export const caseTypeEnum = pgEnum("co_case_type", [
  "ONBOARDING",
  "PERIODIC_REVIEW",
  "EVENT_DRIVEN_REVIEW",
  "WALLET_REVIEW",
  "TRAINING_CERTIFICATION",
  "PHYSICAL_SHIPMENT_REVIEW",
  "REFINERY_INTAKE_REVIEW",
  "SETTLEMENT_AUTHORIZATION",
]);

export const caseStatusEnum = pgEnum("co_case_status", [
  "DRAFT",
  "OPEN",
  "AWAITING_SUBJECT",
  "AWAITING_PROVIDER",
  "AWAITING_INTERNAL_REVIEW",
  "ESCALATED",
  "READY_FOR_DISPOSITION",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "EXPIRED",
  "CLOSED",
]);

export const checkTypeEnum = pgEnum("co_check_type", [
  "EMAIL",
  "PHONE",
  "KYC_ID",
  "LIVENESS",
  "KYB_REGISTRATION",
  "UBO",
  "LEI",
  "SANCTIONS",
  "PEP",
  "ADVERSE_MEDIA",
  "SOURCE_OF_FUNDS",
  "SOURCE_OF_WEALTH",
  "PROOF_OF_ADDRESS",
  "AUTHORIZED_SIGNATORY",
  "WALLET_KYT",
  "CHAIN_OF_CUSTODY",
  "TRANSPORT_INTEGRITY",
  "SANCTIONS_ORIGIN",
  "REFINERY_ELIGIBILITY",
  "REFINERY_LOT_MATCH",
  "REFINERY_ASSAY_CONFIRMATION",
  "TRAINING_COMPLETION",
]);

export const normalizedVerdictEnum = pgEnum("co_normalized_verdict", [
  "PASS",
  "FAIL",
  "REVIEW",
  "ERROR",
  "EXPIRED",
]);

export const shipmentStatusEnum = pgEnum("co_shipment_status", [
  "CREATED",
  "PENDING_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED_TO_REFINERY",
  "RECEIVED_BY_REFINERY",
  "CLEARED_FOR_INTAKE",
  "REJECTED_AT_DELIVERY",
  "QUARANTINED",
]);

export const assayStatusEnum = pgEnum("co_assay_status", [
  "PENDING_RECEIPT",
  "PENDING",
  "IN_PROGRESS",
  "COMPLETE",
  "SETTLEMENT_READY",
  "DISPUTED",
  "FAILED",
  "ASSAY_EXCEPTION",
]);

export const custodyEventTypeEnum = pgEnum("co_custody_event_type", [
  "PICKUP",
  "TRANSFER",
  "TRANSPORT",
  "DELIVERY",
  "REFINERY_RECEIPT",
  "SEAL_CHECK",
]);

export const settlementVerdictEnum = pgEnum("co_settlement_verdict", [
  "AUTHORIZED",
  "DENIED",
  "PENDING_REVIEW",
  "EXPIRED",
]);

export const walletRiskTierEnum = pgEnum("co_wallet_risk_tier", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "SEVERE",
]);

export const walletStatusEnum = pgEnum("co_wallet_status", [
  "ACTIVE",
  "FROZEN",
  "BLOCKED",
  "PENDING_REVIEW",
]);

export const subjectStatusEnum = pgEnum("co_subject_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "FROZEN",
  "BLOCKED",
  "DEACTIVATED",
]);

// ─── CORE COMPLIANCE TABLES ────────────────────────────────────────────────────

/**
 * Compliance Subjects
 *
 * Any entity undergoing verification: individuals, companies,
 * suppliers (mines), refineries, or internal users.
 */
export const coSubjects = pgTable(
  "co_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: subjectTypeEnum("subject_type").notNull(),
    userId: uuid("user_id"),
    entityId: uuid("entity_id"),
    legalName: varchar("legal_name", { length: 512 }).notNull(),
    riskTier: varchar("risk_tier", { length: 50 }).notNull().default("STANDARD"),
    status: subjectStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_subjects_user_id").on(table.userId),
    index("idx_co_subjects_entity_id").on(table.entityId),
    index("idx_co_subjects_type").on(table.subjectType),
  ],
);

/**
 * Policy Snapshots — IMMUTABLE
 *
 * Every compliance decision references the exact policy version
 * that was in effect. Critical for audit defensibility.
 * No updated_at — rows are append-only and never mutated.
 */
export const coPolicySnapshots = pgTable("co_policy_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  rulesPayload: jsonb("rules_payload").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Compliance Cases
 *
 * A case is a bounded unit of compliance work. Case types now
 * include refinery-specific tracks:
 *   - PHYSICAL_SHIPMENT_REVIEW  (mine → refinery logistics)
 *   - REFINERY_INTAKE_REVIEW    (refinery assay & lot creation)
 *   - SETTLEMENT_AUTHORIZATION  (post-assay buyer payment)
 */
export const coCases = pgTable(
  "co_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    caseType: caseTypeEnum("case_type").notNull(),
    status: caseStatusEnum("status").notNull().default("DRAFT"),
    priority: integer("priority").notNull().default(0),
    policySnapshotId: uuid("policy_snapshot_id")
      .notNull()
      .references(() => coPolicySnapshots.id, { onDelete: "restrict" }),
    assignedReviewerId: uuid("assigned_reviewer_id"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedReason: text("closed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_cases_subject_id").on(table.subjectId),
    index("idx_co_cases_status").on(table.status),
    index("idx_co_cases_policy_snapshot").on(table.policySnapshotId),
    index("idx_co_cases_reviewer").on(table.assignedReviewerId),
    index("idx_co_cases_type").on(table.caseType),
  ],
);

/**
 * Compliance Checks
 *
 * Individual verification steps within a case. Expanded to cover
 * the full refinery-centered compliance surface: PEP, adverse media,
 * source of funds/wealth, chain of custody, transport integrity,
 * origin sanctions, refinery lot matching, and assay confirmation.
 */
export const coChecks = pgTable(
  "co_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => coCases.id, { onDelete: "restrict" }),
    checkType: checkTypeEnum("check_type").notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"),
    resultCode: varchar("result_code", { length: 100 }),
    normalizedVerdict: normalizedVerdictEnum("normalized_verdict"),
    rawPayloadRef: text("raw_payload_ref"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_checks_case_id").on(table.caseId),
    index("idx_co_checks_type").on(table.checkType),
    index("idx_co_checks_verdict").on(table.normalizedVerdict),
  ],
);

/**
 * Compliance Decisions
 *
 * Formal decisions rendered on a case: INTERIM or FINAL.
 * Carries a cryptographic hash for tamper detection.
 */
export const coDecisions = pgTable(
  "co_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => coCases.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    decisionType: varchar("decision_type", { length: 20 }).notNull(),
    decision: varchar("decision", { length: 50 }).notNull(),
    reasonCodes: jsonb("reason_codes").notNull().default([]),
    decisionHash: text("decision_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_decisions_case_id").on(table.caseId),
    index("idx_co_decisions_subject_id").on(table.subjectId),
    index("idx_co_decisions_expires").on(table.expiresAt),
  ],
);

/**
 * Compliance Audit Events — IMMUTABLE, APPEND-ONLY
 *
 * Tamper-evident audit log using hash chaining. Each event
 * references the hash of the previous event, forming a
 * verifiable chain of custody for all compliance state changes.
 * No updated_at — rows are never mutated.
 */
export const coAuditEvents = pgTable(
  "co_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    hash: text("hash").notNull(),
    previousHash: text("previous_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_audit_aggregate").on(table.aggregateType, table.aggregateId),
    index("idx_co_audit_event_type").on(table.eventType),
    index("idx_co_audit_created").on(table.createdAt),
  ],
);

// ─── PHYSICAL SUPPLY CHAIN TABLES ──────────────────────────────────────────────

/**
 * Physical Shipments
 *
 * Tracks the movement of gold from mine to refinery via armored
 * logistics (Brink's or equivalent). Each shipment is tied to
 * a supplier subject (the mine) and a destination refinery subject.
 */
export const coPhysicalShipments = pgTable(
  "co_physical_shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierSubjectId: uuid("supplier_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    mineReference: varchar("mine_reference", { length: 255 }).notNull(),
    originCountry: varchar("origin_country", { length: 100 }).notNull(),
    brinksReference: varchar("brinks_reference", { length: 255 }),
    armoredCarrierName: varchar("armored_carrier_name", { length: 255 }).notNull(),
    shipmentStatus: shipmentStatusEnum("shipment_status").notNull().default("PENDING_DISPATCH"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    refinerySubjectId: uuid("refinery_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_shipments_supplier").on(table.supplierSubjectId),
    index("idx_co_shipments_refinery").on(table.refinerySubjectId),
    index("idx_co_shipments_status").on(table.shipmentStatus),
    index("idx_co_shipments_brinks").on(table.brinksReference),
  ],
);

/**
 * Chain of Custody Events
 *
 * Append-per-event timeline tracking the physical custody of
 * gold through the logistics pipeline. Every handoff, transport
 * leg, seal check, and refinery receipt is recorded as an
 * immutable event. Required for settlement authorization.
 */
export const coChainOfCustodyEvents = pgTable(
  "co_chain_of_custody_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => coPhysicalShipments.id, { onDelete: "restrict" }),
    eventType: custodyEventTypeEnum("event_type").notNull(),
    location: varchar("location", { length: 512 }),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
    partyFrom: varchar("party_from", { length: 255 }),
    partyTo: varchar("party_to", { length: 255 }),
    sealNumber: varchar("seal_number", { length: 100 }),
    verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("PENDING"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_coc_shipment").on(table.shipmentId),
    index("idx_co_coc_event_type").on(table.eventType),
    index("idx_co_coc_timestamp").on(table.eventTimestamp),
  ],
);

// ─── REFINERY TRUTH TABLES ─────────────────────────────────────────────────────

/**
 * Refinery Lots — COMMERCIAL SOURCE OF TRUTH
 *
 * The refinery assay result determines the actual economic value
 * of the gold. The buyer pays ONLY for assay-confirmed payable
 * output. This table is the single source of truth for:
 *   - Actual purity (fineness)
 *   - Recoverable gold weight
 *   - Payable gold weight
 *   - Payable value
 *
 * Trade logic is SUBORDINATE to this table. No settlement may
 * proceed without a completed assay and determined payable value.
 */
export const coRefineryLots = pgTable(
  "co_refinery_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => coPhysicalShipments.id, { onDelete: "restrict" }),
    supplierSubjectId: uuid("supplier_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    refinerySubjectId: uuid("refinery_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    intakeCaseId: uuid("intake_case_id")
      .references(() => coCases.id, { onDelete: "restrict" }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    assayStatus: assayStatusEnum("assay_status").notNull().default("PENDING"),
    grossWeight: numeric("gross_weight", { precision: 12, scale: 4 }),
    netWeight: numeric("net_weight", { precision: 12, scale: 4 }),
    fineness: numeric("fineness", { precision: 8, scale: 6 }),
    recoverableGoldWeight: numeric("recoverable_gold_weight", { precision: 12, scale: 4 }),
    payableGoldWeight: numeric("payable_gold_weight", { precision: 12, scale: 4 }),
    payableValue: numeric("payable_value", { precision: 15, scale: 2 }),
    assayCertificateRef: text("assay_certificate_ref"),
    settlementReady: boolean("settlement_ready").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_lots_shipment").on(table.shipmentId),
    index("idx_co_lots_supplier").on(table.supplierSubjectId),
    index("idx_co_lots_refinery").on(table.refinerySubjectId),
    index("idx_co_lots_assay_status").on(table.assayStatus),
    index("idx_co_lots_settlement_ready").on(table.settlementReady),
  ],
);

// ─── SETTLEMENT AUTHORIZATION ──────────────────────────────────────────────────

/**
 * Settlement Authorizations
 *
 * Settlement happens AFTER refinery truth is known. Authorization
 * requires ALL of the following (fail-closed):
 *   1. Shipment has complete verified custody chain
 *   2. Refinery lot exists
 *   3. Assay is complete (assay_status = COMPLETE)
 *   4. Payable value is determined (payable_value IS NOT NULL)
 *   5. Supplier screening is still valid
 *   6. Buyer screening is still valid
 *   7. Sanctions screening is clear
 *   8. Required funding/payment rail checks are clear
 *
 * Each authorization references the policy snapshot and carries
 * a cryptographic decision hash for tamper detection.
 */
export const coSettlementAuthorizations = pgTable(
  "co_settlement_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refineryLotId: uuid("refinery_lot_id")
      .notNull()
      .references(() => coRefineryLots.id, { onDelete: "restrict" }),
    buyerSubjectId: uuid("buyer_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    complianceCaseId: uuid("compliance_case_id")
      .notNull()
      .references(() => coCases.id, { onDelete: "restrict" }),
    verdict: settlementVerdictEnum("verdict").notNull(),
    payableValue: numeric("payable_value", { precision: 15, scale: 2 }).notNull(),
    paymentRail: varchar("payment_rail", { length: 100 }).notNull(),
    policySnapshotId: uuid("policy_snapshot_id")
      .notNull()
      .references(() => coPolicySnapshots.id, { onDelete: "restrict" }),
    decisionHash: text("decision_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_settle_lot").on(table.refineryLotId),
    index("idx_co_settle_buyer").on(table.buyerSubjectId),
    index("idx_co_settle_case").on(table.complianceCaseId),
    index("idx_co_settle_verdict").on(table.verdict),
  ],
);

// ─── WALLET / CRYPTO RAIL TABLES ───────────────────────────────────────────────

/**
 * Wallet Addresses
 *
 * Registered blockchain wallet addresses owned by compliance subjects.
 * Each wallet is tied to an owner subject (buyer, entity, etc.) and
 * must be screened before it can be used as a settlement payment rail.
 */
export const coWalletAddresses = pgTable(
  "co_wallet_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerSubjectId: uuid("owner_subject_id")
      .notNull()
      .references(() => coSubjects.id, { onDelete: "restrict" }),
    address: varchar("address", { length: 255 }).notNull(),
    chain: varchar("chain", { length: 50 }).notNull(),
    asset: varchar("asset", { length: 50 }).notNull(),
    label: varchar("label", { length: 255 }),
    status: walletStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_wallets_owner").on(table.ownerSubjectId),
    index("idx_co_wallets_address").on(table.address),
    index("idx_co_wallets_chain").on(table.chain),
    index("idx_co_wallets_status").on(table.status),
  ],
);

/**
 * Wallet Screenings
 *
 * Results from KYT (Know Your Transaction) providers like Elliptic
 * or Chainalysis. Each screening captures the risk assessment at a
 * point in time. Screenings expire — settlement Gate 5 enforces
 * a 24-hour freshness requirement.
 */
export const coWalletScreenings = pgTable(
  "co_wallet_screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddressId: uuid("wallet_address_id")
      .notNull()
      .references(() => coWalletAddresses.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 100 }).notNull(),
    riskScore: numeric("risk_score", { precision: 5, scale: 2 }),
    riskTier: walletRiskTierEnum("risk_tier").notNull(),
    sanctionsExposure: boolean("sanctions_exposure").notNull().default(false),
    illicitActivityFlags: jsonb("illicit_activity_flags").notNull().default([]),
    rawPayloadRef: text("raw_payload_ref"),
    screenedAt: timestamp("screened_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_screenings_wallet").on(table.walletAddressId),
    index("idx_co_screenings_risk").on(table.riskTier),
    index("idx_co_screenings_screened").on(table.screenedAt),
  ],
);

// ─── CASE TASKS ────────────────────────────────────────────────────────────────

export const caseTaskStatusEnum = pgEnum("co_case_task_status", [
  "PENDING",
  "COMPLETED",
  "WAIVED",
]);

/**
 * Case Tasks
 *
 * Reviewer task checklists dynamically generated based on failure
 * reasons. The case cannot progress to READY_FOR_DISPOSITION until
 * all required tasks are COMPLETED or WAIVED.
 */
export const coCaseTasks = pgTable(
  "co_case_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => coCases.id, { onDelete: "restrict" }),
    taskType: varchar("task_type", { length: 100 }).notNull(),
    description: text("description").notNull(),
    status: caseTaskStatusEnum("status").notNull().default("PENDING"),
    assigneeId: uuid("assignee_id"),
    required: boolean("required").notNull().default(true),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by"),
    completionNotes: text("completion_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_case_tasks_case").on(table.caseId),
    index("idx_co_case_tasks_status").on(table.status),
    index("idx_co_case_tasks_assignee").on(table.assigneeId),
  ],
);

// ─── SETTLEMENT GATES ──────────────────────────────────────────────────────────

/**
 * Settlement gate types — each represents one precondition
 * that must be satisfied for settlement authorization.
 */
export const settlementGateTypeEnum = pgEnum("co_settlement_gate_type", [
  "BUYER_APPROVED",
  "SUPPLIER_APPROVED",
  "SHIPMENT_INTEGRITY",
  "REFINERY_ASSAY_TRUTH",
  "PAYMENT_READINESS",
  "SANCTIONS_CLEAR",
  "WALLET_RISK_CLEAR",
  "FINAL_POLICY_GATE",
]);

export const settlementGateResultEnum = pgEnum("co_settlement_gate_result", [
  "PASS",
  "FAIL",
  "BLOCKED",
  "SKIPPED",
  "PENDING",
]);

/**
 * Settlement Gates — Per-Gate Authorization Results
 *
 * Makes settlement authorization explainable and queryable.
 * Each row represents one gate evaluation within a settlement
 * authorization attempt. If ANY gate is FAIL or BLOCKED,
 * the settlement cannot be authorized.
 *
 * Linked to the parent co_settlement_authorizations record.
 */
export const coSettlementGates = pgTable(
  "co_settlement_gates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    settlementAuthorizationId: uuid("settlement_authorization_id")
      .notNull()
      .references(() => coSettlementAuthorizations.id, { onDelete: "restrict" }),
    gateType: settlementGateTypeEnum("gate_type").notNull(),
    result: settlementGateResultEnum("result").notNull(),
    detail: text("detail"),
    evidenceRef: text("evidence_ref"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_co_settlement_gates_auth").on(table.settlementAuthorizationId),
    index("idx_co_settlement_gates_type").on(table.gateType),
    index("idx_co_settlement_gates_result").on(table.result),
  ],
);

// ─── TYPE EXPORTS ──────────────────────────────────────────────────────────────

export type CoSubject = typeof coSubjects.$inferSelect;
export type CoSubjectInsert = typeof coSubjects.$inferInsert;

export type CoPolicySnapshot = typeof coPolicySnapshots.$inferSelect;
export type CoPolicySnapshotInsert = typeof coPolicySnapshots.$inferInsert;

export type CoCase = typeof coCases.$inferSelect;
export type CoCaseInsert = typeof coCases.$inferInsert;

export type CoCheck = typeof coChecks.$inferSelect;
export type CoCheckInsert = typeof coChecks.$inferInsert;

export type CoDecision = typeof coDecisions.$inferSelect;
export type CoDecisionInsert = typeof coDecisions.$inferInsert;

export type CoAuditEvent = typeof coAuditEvents.$inferSelect;
export type CoAuditEventInsert = typeof coAuditEvents.$inferInsert;

export type CoPhysicalShipment = typeof coPhysicalShipments.$inferSelect;
export type CoPhysicalShipmentInsert = typeof coPhysicalShipments.$inferInsert;

export type CoChainOfCustodyEvent = typeof coChainOfCustodyEvents.$inferSelect;
export type CoChainOfCustodyEventInsert = typeof coChainOfCustodyEvents.$inferInsert;

export type CoRefineryLot = typeof coRefineryLots.$inferSelect;
export type CoRefineryLotInsert = typeof coRefineryLots.$inferInsert;

export type CoSettlementAuthorization = typeof coSettlementAuthorizations.$inferSelect;
export type CoSettlementAuthorizationInsert = typeof coSettlementAuthorizations.$inferInsert;

export type CoWalletAddress = typeof coWalletAddresses.$inferSelect;
export type CoWalletAddressInsert = typeof coWalletAddresses.$inferInsert;

export type CoWalletScreening = typeof coWalletScreenings.$inferSelect;
export type CoWalletScreeningInsert = typeof coWalletScreenings.$inferInsert;

export type CoCaseTask = typeof coCaseTasks.$inferSelect;
export type CoCaseTaskInsert = typeof coCaseTasks.$inferInsert;

export type CoSettlementGate = typeof coSettlementGates.$inferSelect;
export type CoSettlementGateInsert = typeof coSettlementGates.$inferInsert;
