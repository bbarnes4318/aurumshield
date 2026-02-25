/* ================================================================
   SETTLEMENT ENGINE — Pure deterministic functions
   All functions are immutable: they return new state, never mutate.
   All time logic uses the passed `now` parameter.
   ================================================================

   Governance Rules:
   1. Settlement opens only from order with:
      - reservation.state === "CONVERTED"
      - inventory.allocatedWeightOz >= order.weightOz
      - order.status in ["reserved","pending_verification"]
   2. Two-step DvP:
      - AUTHORIZE_SETTLEMENT → AUTHORIZED (no release)
      - EXECUTE_DVP → SETTLED (atomic release of funds + gold + escrow)
   3. Capital snapshot frozen at open (never recomputed).
   4. Ledger is append-only — no edits, no deletes.
   5. Action-level role enforcement via ACTION_ROLE_MAP.
   6. Status changes are action-driven ONLY — no auto-compute.
   ================================================================ */

import type {
  SettlementCase,
  SettlementStatus,
  LedgerEntry,
  LedgerEntryType,
  SettlementRail,
  Order,
  Listing,
  InventoryPosition,
  Reservation,
  Corridor,
  Hub,
  DashboardCapital,
  UserRole,
  ClearingJournal,
  ClearingJournalEntry,
  ClearingJournalDirection,
} from "./mock-data";
import type { VerificationCase, LedgerEntrySnapshot } from "./mock-data";

/* ---------- State Shape ---------- */
export interface SettlementState {
  settlements: SettlementCase[];
  ledger: LedgerEntry[];
  /** RSK-006: Immutable double-entry clearing journals */
  clearingJournals: ClearingJournal[];
}

/* ---------- Action Types ---------- */
export type SettlementActionType =
  | "CONFIRM_FUNDS_FINAL"
  | "ALLOCATE_GOLD"
  | "MARK_VERIFICATION_CLEARED"
  | "AUTHORIZE_SETTLEMENT"
  | "EXECUTE_DVP"
  | "FAIL_SETTLEMENT"
  | "CANCEL_SETTLEMENT"
  | "RESOLVE_AMBIGUOUS"
  | "REVERSE_SETTLEMENT";

/* ---------- Action → Allowed Roles (deterministic) ---------- */
export const ACTION_ROLE_MAP: Record<SettlementActionType, UserRole[]> = {
  CONFIRM_FUNDS_FINAL: ["admin", "treasury"],
  ALLOCATE_GOLD: ["admin", "vault_ops"],
  MARK_VERIFICATION_CLEARED: ["admin", "compliance"],
  AUTHORIZE_SETTLEMENT: ["admin"],
  EXECUTE_DVP: ["admin"],
  FAIL_SETTLEMENT: ["admin"],
  CANCEL_SETTLEMENT: ["admin"],
  RESOLVE_AMBIGUOUS: ["admin", "treasury"],
  REVERSE_SETTLEMENT: ["admin", "compliance"],
};

/* ---------- Human-readable role labels ---------- */
export const ROLE_LABELS: Record<UserRole, string> = {
  buyer: "Buyer",
  seller: "Seller",
  admin: "Admin",
  treasury: "Treasury",
  compliance: "Compliance",
  vault_ops: "Vault Ops",
};

/* ---------- Payload ---------- */
export interface SettlementActionPayload {
  action: SettlementActionType;
  actorRole: UserRole;
  actorUserId: string;
  reason?: string;
  evidenceIds?: string[];
}

/* ---------- Result Types ---------- */
export type SettlementActionResult =
  | { ok: true; state: SettlementState; settlement: SettlementCase; ledgerEntries: LedgerEntry[] }
  | { ok: false; code: "FORBIDDEN_ROLE"; message: string; allowedRoles: UserRole[] }
  | { ok: false; code: "MISSING_IDENTITY"; message: string }
  | { ok: false; code: string; message: string };

/* ---------- Requirement Check Result ---------- */
export interface SettlementRequirements {
  blockers: string[];
  warns: string[];
  requiredActions: string[];
}

/* ---------- ID Generation (deterministic) ---------- */
function nextId(prefix: string, items: { id: string }[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const item of items) {
    const m = re.exec(item.id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/* ---------- Role → legacy actor category ---------- */
function roleToActor(role: UserRole): LedgerEntry["actor"] {
  switch (role) {
    case "compliance": return "COMPLIANCE";
    case "buyer": return "BUYER";
    case "seller":  return "SELLER";
    default: return "OPS"; // admin, treasury, vault_ops
  }
}

/* ================================================================
   RSK-006: Double-Entry Clearing Journal

   Every fund movement must produce a balanced journal before the
   settlement status can transition to SETTLED. This mirrors
   fn_assert_journal_balanced() from 008_clearing_ledger.sql.
   ================================================================ */

/**
 * Thrown when a journal's debits do not equal its credits.
 * Equivalent to PostgreSQL RAISE EXCEPTION in fn_assert_journal_balanced().
 */
export class UnbalancedJournalError extends Error {
  readonly journalId: string;
  readonly debitsCents: number;
  readonly creditsCents: number;
  readonly settlementCaseId: string;
  readonly timestamp: string;

  constructor(opts: {
    journalId: string;
    debitsCents: number;
    creditsCents: number;
    settlementCaseId: string;
  }) {
    super(
      `UNBALANCED_JOURNAL: journal=${opts.journalId} settlement=${opts.settlementCaseId} ` +
      `debits=${opts.debitsCents} credits=${opts.creditsCents} ` +
      `delta=${opts.debitsCents - opts.creditsCents}`,
    );
    this.name = "UnbalancedJournalError";
    this.journalId = opts.journalId;
    this.debitsCents = opts.debitsCents;
    this.creditsCents = opts.creditsCents;
    this.settlementCaseId = opts.settlementCaseId;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Assert that a journal's total debits equal total credits.
 * Pure function — no side effects.
 */
export function assertJournalBalanced(journal: ClearingJournal): void {
  const debitsCents = journal.entries
    .filter((e) => e.direction === "DEBIT")
    .reduce((sum, e) => sum + e.amountCents, 0);

  const creditsCents = journal.entries
    .filter((e) => e.direction === "CREDIT")
    .reduce((sum, e) => sum + e.amountCents, 0);

  if (debitsCents !== creditsCents) {
    throw new UnbalancedJournalError({
      journalId: journal.id,
      debitsCents,
      creditsCents,
      settlementCaseId: journal.settlementCaseId,
    });
  }
}

/**
 * Create a balanced clearing journal for a settlement.
 * Enforces the debit === credit invariant before returning.
 *
 * @param settlementCaseId - The settlement case this journal belongs to
 * @param idempotencyKey - Unique key to prevent duplicate journals
 * @param description - Human-readable description of the clearing event
 * @param entries - Array of debit/credit entries (must balance)
 * @param now - Timestamp for the journal
 * @param createdBy - Actor creating the journal
 * @param existingJournals - Existing journals for ID generation
 *
 * @returns New ClearingJournal with all entries
 * @throws UnbalancedJournalError if debits !== credits
 */
export function postClearingJournal(
  settlementCaseId: string,
  idempotencyKey: string,
  description: string,
  entries: Omit<ClearingJournalEntry, "id" | "journalId">[],
  now: string,
  createdBy: string,
  existingJournals: ClearingJournal[],
): ClearingJournal {
  if (entries.length === 0) {
    throw new Error(`EMPTY_JOURNAL: Cannot post a journal with zero entries for settlement ${settlementCaseId}`);
  }

  // Check idempotency — if journal with this key already exists, return it
  const existing = existingJournals.find((j) => j.idempotencyKey === idempotencyKey);
  if (existing) return existing;

  const journalId = `jnl-${String(existingJournals.length + 1).padStart(3, "0")}`;

  const fullEntries: ClearingJournalEntry[] = entries.map((e, idx) => ({
    id: `jle-${journalId}-${String(idx + 1).padStart(3, "0")}`,
    journalId,
    ...e,
  }));

  const journal: ClearingJournal = {
    id: journalId,
    settlementCaseId,
    idempotencyKey,
    description,
    postedAt: now,
    createdBy,
    entries: fullEntries,
  };

  // CRITICAL: Assert balance BEFORE returning.
  // This mirrors fn_assert_journal_balanced() from 008_clearing_ledger.sql.
  assertJournalBalanced(journal);

  return journal;
}

/* ================================================================
   openSettlementFromOrder
   ================================================================ */

export interface OpenSettlementArgs {
  now: string;
  order: Order;
  listing: Listing;
  inventory: InventoryPosition;
  reservation: Reservation | null;
  corridor: Corridor;
  hub: Hub;
  vaultHub: Hub;
  capital: DashboardCapital;
  buyerOrgId: string;
  actorRole: UserRole;
  actorUserId: string;
}

export function openSettlementFromOrder(
  state: SettlementState,
  args: OpenSettlementArgs,
): { state: SettlementState; settlement: SettlementCase; ledgerEntry: LedgerEntry } {
  const { now, order, listing, inventory, reservation, corridor, hub, vaultHub, capital, buyerOrgId, actorRole, actorUserId } = args;

  // ── Precondition 1: reservation must be CONVERTED ──
  if (reservation && reservation.state !== "CONVERTED") {
    throw new Error(`SETTLEMENT_PRECONDITION: reservation ${reservation.id} state is ${reservation.state}, expected CONVERTED`);
  }

  // ── Precondition 2: inventory allocation ──
  if (inventory.allocatedWeightOz < order.weightOz) {
    throw new Error(`SETTLEMENT_PRECONDITION: inventory allocatedWeightOz (${inventory.allocatedWeightOz}) < order.weightOz (${order.weightOz})`);
  }

  // ── Precondition 3: order status ──
  const ELIGIBLE: string[] = ["reserved", "pending_verification"];
  if (!ELIGIBLE.includes(order.status)) {
    throw new Error(`SETTLEMENT_PRECONDITION: order.status is "${order.status}", expected one of: ${ELIGIBLE.join(", ")}`);
  }

  // ── Precondition 4: no duplicate ──
  if (state.settlements.some((s) => s.orderId === order.id)) {
    throw new Error(`SETTLEMENT_PRECONDITION: settlement already exists for order ${order.id}`);
  }

  const rail: SettlementRail = corridor.riskLevel === "high" || corridor.riskLevel === "critical" ? "RTGS" : "WIRE";

  const notionalCents = Math.round(order.notional * 100);

  const settlement: SettlementCase = {
    id: nextId("stl", state.settlements),
    orderId: order.id,
    reservationId: reservation?.id ?? null,
    listingId: listing.id,
    buyerUserId: order.buyerUserId,
    sellerUserId: order.sellerUserId,
    buyerOrgId,
    sellerOrgId: order.sellerOrgId,
    corridorId: corridor.id,
    hubId: hub.id,
    vaultHubId: vaultHub.id,
    rail,
    weightOz: order.weightOz,
    pricePerOzLocked: order.pricePerOz,
    notionalUsd: order.notional,
    status: "ESCROW_OPEN",
    openedAt: now,
    updatedAt: now,
    fundsConfirmedFinal: false,
    goldAllocated: false,
    verificationCleared: false,
    capitalAtOpen: capital.capitalBase,
    ecrAtOpen: capital.ecr,
    hardstopUtilizationAtOpen: capital.hardstopUtilization,
    lastDecisionBy: "SYSTEM",
    lastDecisionAt: now,
    // Fee & activation gate defaults
    notionalCents,
    currency: "USD",
    selectedAddOns: [],
    paymentStatus: "unpaid",
    activationStatus: "draft",
    requiresManualApproval: false,
    approvalStatus: "not_required",
  };

  const ledgerEntry: LedgerEntry = {
    id: nextId("le", state.ledger),
    settlementId: settlement.id,
    type: "ESCROW_OPENED",
    timestamp: now,
    actor: roleToActor(actorRole),
    actorRole,
    actorUserId,
    detail: `Escrow opened for order ${order.id} — ${order.weightOz} oz @ $${order.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}/oz`,
  };

  return {
    state: {
      settlements: [...state.settlements, settlement],
      ledger: [...state.ledger, ledgerEntry],
      clearingJournals: state.clearingJournals ?? [],
    },
    settlement,
    ledgerEntry,
  };
}

/* ================================================================
   computeSettlementRequirements (advisory — presentation only)
   Does NOT determine canonical status. Surfaces readiness for UI.
   ================================================================ */

export function computeSettlementRequirements(
  settlement: SettlementCase,
  corridor: Corridor | undefined,
  hub: Hub | undefined,
  verificationCase: VerificationCase | null,
): SettlementRequirements {
  const blockers: string[] = [];
  const warns: string[] = [];
  const requiredActions: string[] = [];

  // ── Activation gate (hard blocker) ──
  if (settlement.activationStatus !== "activated") {
    blockers.push(
      settlement.activationStatus === "awaiting_payment"
        ? "Activation required — indemnification fee payment pending"
        : "Activation required — navigate to Activation & Fees to configure and pay"
    );
  }

  // ── Manual approval gate ──
  if (settlement.requiresManualApproval && settlement.approvalStatus === "pending") {
    blockers.push("Manual approval pending — one or more selected services require OPS/Compliance sign-off");
  } else if (settlement.requiresManualApproval && settlement.approvalStatus === "rejected") {
    blockers.push("Manual approval rejected — contact Operations to resolve");
  }

  // ── Corridor checks ──
  if (!corridor) {
    blockers.push("Corridor not found");
  } else if (corridor.status === "suspended") {
    blockers.push(`Corridor ${corridor.name} is SUSPENDED — settlement blocked`);
  } else if (corridor.status === "restricted") {
    warns.push(`Corridor ${corridor.name} is RESTRICTED — additional scrutiny required`);
  }

  // ── Hub checks ──
  if (!hub) {
    blockers.push("Settlement hub not found");
  } else if (hub.status === "offline") {
    blockers.push(`Hub ${hub.name} is OFFLINE — settlement blocked`);
  } else if (hub.status === "maintenance") {
    blockers.push(`Hub ${hub.name} is in MAINTENANCE — settlement blocked`);
  } else if (hub.status === "degraded") {
    warns.push(`Hub ${hub.name} is DEGRADED — proceed with caution`);
  }

  // ── Capital checks (frozen snapshot) ──
  if (settlement.hardstopUtilizationAtOpen > 0.95) {
    blockers.push(`Hardstop utilization at open was ${(settlement.hardstopUtilizationAtOpen * 100).toFixed(1)}% — breaches 95% hard limit`);
  } else if (settlement.hardstopUtilizationAtOpen > 0.85) {
    warns.push(`Hardstop utilization at open was ${(settlement.hardstopUtilizationAtOpen * 100).toFixed(1)}% — approaching limit`);
  }

  // ── Advisory readiness ──
  if (settlement.status === "AUTHORIZED") {
    requiredActions.push("EXECUTE_DVP — Settlement authorized, awaiting DvP execution");
  } else if (settlement.status !== "SETTLED" && settlement.status !== "FAILED" && settlement.status !== "CANCELLED") {
    if (!settlement.fundsConfirmedFinal) {
      requiredActions.push("CONFIRM_FUNDS_FINAL — Funds not yet confirmed");
    }
    if (!settlement.goldAllocated) {
      requiredActions.push("ALLOCATE_GOLD — Gold not yet allocated");
    }
    if (!settlement.verificationCleared) {
      if (!verificationCase) {
        requiredActions.push("MARK_VERIFICATION_CLEARED — No verification case found");
      } else if (verificationCase.status !== "VERIFIED") {
        requiredActions.push(`MARK_VERIFICATION_CLEARED — Buyer verification status: ${verificationCase.status}`);
      } else {
        requiredActions.push("MARK_VERIFICATION_CLEARED — Verification passed, awaiting confirmation");
      }
    }
    if (settlement.fundsConfirmedFinal && settlement.goldAllocated && settlement.verificationCleared) {
      requiredActions.push("AUTHORIZE_SETTLEMENT — All preconditions met, ready for authorization");
    }
  }

  // ── AMBIGUOUS_STATE blocker ──
  if (settlement.status === "AMBIGUOUS_STATE") {
    blockers.push(
      "SETTLEMENT LOCKED — Ambiguous payout state detected. Moov transfer outcome is unknown. " +
      "Treasury Admin must reconcile with the Moov dashboard and resolve this settlement before any further actions."
    );
  }

  return { blockers, warns, requiredActions };
}

/* ================================================================
   applySettlementAction

   Governance:
   - Action-level role enforcement via ACTION_ROLE_MAP
   - Structured errors for FORBIDDEN_ROLE and MISSING_IDENTITY
   - Status changes ONLY happen inside this function
   - Two-step DvP: AUTHORIZE → AUTHORIZED, EXECUTE_DVP → SETTLED
   - Append-only ledger invariant
   ================================================================ */

export function applySettlementAction(
  state: SettlementState,
  settlementId: string,
  payload: SettlementActionPayload,
  now: string,
  verificationCase?: VerificationCase | null,
  corridor?: Corridor,
  hub?: Hub,
): SettlementActionResult {
  // ── Identity enforcement ──
  if (!payload.actorUserId || !payload.actorRole) {
    return { ok: false, code: "MISSING_IDENTITY", message: "actorUserId and actorRole are required for all settlement actions" };
  }

  // ── Role enforcement (deterministic) ──
  const allowedRoles = ACTION_ROLE_MAP[payload.action];
  if (!allowedRoles.includes(payload.actorRole)) {
    const labels = allowedRoles.map((r) => ROLE_LABELS[r]).join(", ");
    return {
      ok: false,
      code: "FORBIDDEN_ROLE",
      message: `Action ${payload.action} requires role: ${labels}. Current role: ${ROLE_LABELS[payload.actorRole]}`,
      allowedRoles,
    };
  }

  const idx = state.settlements.findIndex((s) => s.id === settlementId);
  if (idx === -1) {
    return { ok: false, code: "NOT_FOUND", message: `Settlement ${settlementId} not found` };
  }

  const settlement = { ...state.settlements[idx] };
  const newEntries: LedgerEntry[] = [];

  function addLedger(
    type: LedgerEntryType,
    detail: string,
    overrides?: { actor?: LedgerEntry["actor"]; actorRole?: UserRole; actorUserId?: string; snapshot?: LedgerEntrySnapshot },
  ) {
    newEntries.push({
      id: nextId("le", [...state.ledger, ...newEntries]),
      settlementId,
      type,
      timestamp: now,
      actor: overrides?.actor ?? roleToActor(payload.actorRole),
      actorRole: overrides?.actorRole ?? payload.actorRole,
      actorUserId: overrides?.actorUserId ?? payload.actorUserId,
      detail,
      evidenceIds: payload.evidenceIds,
      snapshot: overrides?.snapshot,
    });
  }

  // ── Terminal state guard ──
  // AMBIGUOUS_STATE is also a locked state — only RESOLVE_AMBIGUOUS, FAIL, CANCEL can proceed
  const TERMINAL: SettlementStatus[] = ["SETTLED", "FAILED", "CANCELLED", "REVERSED"];
  if (TERMINAL.includes(settlement.status)) {
    return { ok: false, code: "TERMINAL_STATE", message: `Settlement ${settlementId} is ${settlement.status} — no further actions allowed` };
  }

  // PROCESSING_RAIL blocks ALL actions — only system webhooks can transition out
  if (settlement.status === "PROCESSING_RAIL") {
    return {
      ok: false,
      code: "PROCESSING_LOCKED",
      message: `Settlement ${settlementId} is PROCESSING_RAIL — funds are mid-flight. No manual actions permitted until rail confirms.`,
    };
  }

  // AMBIGUOUS_STATE blocks all normal actions except resolution
  const AMBIGUOUS_ALLOWED: SettlementActionType[] = ["RESOLVE_AMBIGUOUS", "FAIL_SETTLEMENT", "CANCEL_SETTLEMENT"];
  if (settlement.status === "AMBIGUOUS_STATE" && !AMBIGUOUS_ALLOWED.includes(payload.action)) {
    return {
      ok: false,
      code: "AMBIGUOUS_LOCKED",
      message: `Settlement ${settlementId} is in AMBIGUOUS_STATE — only RESOLVE_AMBIGUOUS, FAIL_SETTLEMENT, or CANCEL_SETTLEMENT are allowed`,
    };
  }

  // ── Activation gate enforcement (engine level) ──
  // Only CANCEL_SETTLEMENT and FAIL_SETTLEMENT bypass this gate.
  const BYPASS_ACTIVATION: SettlementActionType[] = ["CANCEL_SETTLEMENT", "FAIL_SETTLEMENT"];
  if (settlement.activationStatus !== "activated" && !BYPASS_ACTIVATION.includes(payload.action)) {
    return {
      ok: false,
      code: "ACTIVATION_REQUIRED",
      message: `Activation required — clearing fees must be paid before ${payload.action}`,
    };
  }

  switch (payload.action) {
    /* ── CONFIRM_FUNDS_FINAL ── */
    case "CONFIRM_FUNDS_FINAL": {
      if (settlement.fundsConfirmedFinal) {
        return { ok: false, code: "DUPLICATE", message: "Funds already confirmed" };
      }
      if (settlement.status === "AUTHORIZED") {
        return { ok: false, code: "INVALID_STATE", message: "Settlement already authorized — cannot modify preconditions" };
      }
      settlement.fundsConfirmedFinal = true;
      // Status stays unchanged — action-driven only
      addLedger("FUNDS_DEPOSITED", `Funds confirmed final — $${settlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} via ${settlement.rail}`);
      break;
    }

    /* ── ALLOCATE_GOLD ── */
    case "ALLOCATE_GOLD": {
      if (settlement.goldAllocated) {
        return { ok: false, code: "DUPLICATE", message: "Gold already allocated" };
      }
      if (settlement.status === "AUTHORIZED") {
        return { ok: false, code: "INVALID_STATE", message: "Settlement already authorized — cannot modify preconditions" };
      }
      settlement.goldAllocated = true;
      addLedger("GOLD_ALLOCATED", `${settlement.weightOz} oz allocated from vault ${settlement.vaultHubId}`);
      break;
    }

    /* ── MARK_VERIFICATION_CLEARED ── */
    case "MARK_VERIFICATION_CLEARED": {
      if (settlement.verificationCleared) {
        return { ok: false, code: "DUPLICATE", message: "Verification already cleared" };
      }
      if (settlement.status === "AUTHORIZED") {
        return { ok: false, code: "INVALID_STATE", message: "Settlement already authorized — cannot modify preconditions" };
      }
      if (!verificationCase || verificationCase.status !== "VERIFIED") {
        return { ok: false, code: "PRECONDITION", message: `Buyer verification status is ${verificationCase?.status ?? "UNKNOWN"}, must be VERIFIED` };
      }
      settlement.verificationCleared = true;
      addLedger("VERIFICATION_PASSED", "Buyer verification case VERIFIED — identity perimeter cleared");
      break;
    }

    /* ── AUTHORIZE_SETTLEMENT (step 1 of DvP — does NOT release) ── */
    case "AUTHORIZE_SETTLEMENT": {
      if (settlement.status === "AUTHORIZED") {
        return { ok: false, code: "DUPLICATE", message: "Settlement already authorized" };
      }
      if (!settlement.fundsConfirmedFinal) {
        return { ok: false, code: "PRECONDITION", message: "fundsConfirmedFinal must be true before authorization" };
      }
      if (!settlement.goldAllocated) {
        return { ok: false, code: "PRECONDITION", message: "goldAllocated must be true before authorization" };
      }
      if (!settlement.verificationCleared) {
        return { ok: false, code: "PRECONDITION", message: "verificationCleared must be true before authorization" };
      }
      if (corridor && corridor.status === "suspended") {
        return { ok: false, code: "BLOCKED", message: `Corridor ${corridor.name} is suspended` };
      }
      if (hub && (hub.status === "offline" || hub.status === "maintenance")) {
        return { ok: false, code: "BLOCKED", message: `Hub ${hub.name} is ${hub.status}` };
      }

      // Transition to AUTHORIZED — no funds or gold released
      settlement.status = "AUTHORIZED";

      // Frozen authorization snapshot
      const reqSummary = corridor?.status === "restricted" ? "WARN: corridor restricted" : "PASS";
      const authChecksStatus = corridor?.status === "restricted" ? "WARN" as const : "PASS" as const;
      const authSnapshot: LedgerEntrySnapshot = {
        checksStatus: authChecksStatus,
        fundsConfirmed: settlement.fundsConfirmedFinal,
        goldAllocated: settlement.goldAllocated,
        verificationCleared: settlement.verificationCleared,
        ecrAtAction: settlement.ecrAtOpen,
        hardstopAtAction: settlement.hardstopUtilizationAtOpen,
        blockers: [],
        warnings: corridor?.status === "restricted" ? [`Corridor ${corridor.name} is restricted`] : [],
      };
      const authDetail = [
        `AUTHORIZATION SNAPSHOT`,
        `settlementId=${settlement.id} orderId=${settlement.orderId}`,
        `notional=$${settlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} weight=${settlement.weightOz}oz rail=${settlement.rail}`,
        `corridorId=${settlement.corridorId} settlementHubId=${settlement.hubId} vaultHubId=${settlement.vaultHubId}`,
        `requirements=${reqSummary}`,
        `authorizedBy=${payload.actorUserId} role=${payload.actorRole} authorizedAt=${now}`,
      ].join(" | ");

      addLedger("AUTHORIZATION", authDetail, { snapshot: authSnapshot });
      break;
    }

    /* ── EXECUTE_DVP (step 2 of DvP — atomic release) ── */
    case "EXECUTE_DVP": {
      if (settlement.status !== "AUTHORIZED") {
        return { ok: false, code: "INVALID_STATE", message: `EXECUTE_DVP requires status AUTHORIZED, current is ${settlement.status}` };
      }

      // Find prior authorization entry for reference
      const authEntry = [...state.ledger].reverse().find(
        (e) => e.settlementId === settlementId && e.type === "AUTHORIZATION",
      );
      const authRef = authEntry?.id ?? "N/A";

      // Determine payment rail routing (deterministic — based on notional)
      const thresholdCents = parseInt(process.env.SETTLEMENT_ENTERPRISE_THRESHOLD ?? "25000000", 10);
      const notionalCents = Math.round(settlement.notionalUsd * 100);
      const paymentRail = notionalCents <= thresholdCents ? "moov" : "modern_treasury";

      // Determine logistics routing ($50k split)
      const logisticsThresholdCents = 50_000_00; // $50,000 in cents
      const logisticsCarrier = notionalCents <= logisticsThresholdCents ? "easypost_usps" : "brinks";

      // Atomic DvP: single ledger entry covering both legs + escrow close
      const dvpSnapshot: LedgerEntrySnapshot = {
        checksStatus: "PASS",
        fundsConfirmed: settlement.fundsConfirmedFinal,
        goldAllocated: settlement.goldAllocated,
        verificationCleared: settlement.verificationCleared,
        ecrAtAction: settlement.ecrAtOpen,
        hardstopAtAction: settlement.hardstopUtilizationAtOpen,
        blockers: [],
        warnings: [],
      };
      const dvpDetail = [
        `DVP EXECUTED ATOMIC`,
        `fundsReleased=true goldReleased=true escrowClosed=true`,
        `fundsLeg: $${settlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} released to seller ${settlement.sellerOrgId} via ${settlement.rail}`,
        `goldLeg: ${settlement.weightOz}oz title transferred to buyer ${settlement.buyerOrgId}`,
        `paymentRail=${paymentRail} logisticsCarrier=${logisticsCarrier}`,
        `authorizationRef=${authRef}`,
        `executedBy=${payload.actorUserId} role=${payload.actorRole} executedAt=${now}`,
      ].join(" | ");

      addLedger("DVP_EXECUTED", dvpDetail, { actor: "SYSTEM", snapshot: dvpSnapshot });

      // ── RSK-006: Post balanced clearing journal BEFORE status transition ──
      const clearingIdempotencyKey = settlement.idempotencyKey ?? `dvp-${settlement.id}-${now}`;
      // TODO: Fee calculation — currently 0 platform fee. Replace with actual fee engine output.
      const platformFeeCents = 0;
      const sellerProceedsCents = notionalCents - platformFeeCents;

      const journalEntries: Omit<ClearingJournalEntry, "id" | "journalId">[] = [
        // DEBIT escrow (funds leave escrow control)
        {
          accountCode: "SETTLEMENT_ESCROW",
          direction: "DEBIT" as ClearingJournalDirection,
          amountCents: notionalCents,
          currency: settlement.currency ?? "USD",
          memo: `Escrow release for settlement ${settlement.id}`,
        },
        // CREDIT seller proceeds
        {
          accountCode: "SELLER_PROCEEDS",
          direction: "CREDIT" as ClearingJournalDirection,
          amountCents: sellerProceedsCents,
          currency: settlement.currency ?? "USD",
          memo: `Seller payout via ${paymentRail} — order ${settlement.orderId}`,
        },
      ];

      // Add platform fee entry only if non-zero (keeps journal balanced either way)
      if (platformFeeCents > 0) {
        journalEntries.push({
          accountCode: "PLATFORM_FEE",
          direction: "CREDIT" as ClearingJournalDirection,
          amountCents: platformFeeCents,
          currency: settlement.currency ?? "USD",
          memo: `Platform clearing fee for settlement ${settlement.id}`,
        });
      }

      const clearingJournal = postClearingJournal(
        settlement.id,
        clearingIdempotencyKey,
        `DVP Settlement Clearing — ${settlement.weightOz}oz @ $${settlement.pricePerOzLocked}/oz via ${paymentRail}`,
        journalEntries,
        now,
        payload.actorUserId,
        state.clearingJournals ?? [],
      );

      // Attach journal reference to audit ledger
      addLedger("JOURNAL_POSTED", `Clearing journal ${clearingJournal.id} posted — debits=${notionalCents} credits=${notionalCents} BALANCED`);

      // Store the journal in state
      (settlement as SettlementCase & { _clearingJournal?: ClearingJournal })._clearingJournal = clearingJournal;

      settlement.status = "SETTLED";
      break;
    }

    /* ── FAIL_SETTLEMENT ── */
    case "FAIL_SETTLEMENT": {
      if (!payload.reason) {
        return { ok: false, code: "PRECONDITION", message: "Reason is required for FAIL_SETTLEMENT" };
      }
      settlement.status = "FAILED";
      addLedger("SETTLEMENT_FAILED", `Settlement failed — ${payload.reason}`);
      break;
    }

    /* ── CANCEL_SETTLEMENT ── */
    case "CANCEL_SETTLEMENT": {
      if (!payload.reason) {
        return { ok: false, code: "PRECONDITION", message: "Reason is required for CANCEL_SETTLEMENT" };
      }
      settlement.status = "CANCELLED";
      addLedger("ESCROW_CLOSED", `Settlement cancelled — ${payload.reason}`);
      break;
    }

    /* ── RESOLVE_AMBIGUOUS (RSK-003 — clear AMBIGUOUS_STATE) ── */
    case "RESOLVE_AMBIGUOUS": {
      if (settlement.status !== "AMBIGUOUS_STATE") {
        return {
          ok: false,
          code: "INVALID_STATE",
          message: `RESOLVE_AMBIGUOUS requires status AMBIGUOUS_STATE, current is ${settlement.status}`,
        };
      }
      if (!payload.reason) {
        return { ok: false, code: "PRECONDITION", message: "Reason is required for RESOLVE_AMBIGUOUS (reconciliation details)" };
      }

      // Transition back to ESCROW_OPEN so the settlement can be re-processed
      // or manually failed/cancelled by the operator.
      settlement.status = "ESCROW_OPEN";
      addLedger(
        "STATUS_CHANGED",
        `AMBIGUOUS_STATE resolved — ${payload.reason}. Settlement returned to ESCROW_OPEN for re-processing.`,
      );
      break;
    }

    /* ── REVERSE_SETTLEMENT (RSK-007 — dispute or rollback) ── */
    case "REVERSE_SETTLEMENT": {
      if (settlement.status !== "SETTLED") {
        return {
          ok: false,
          code: "INVALID_STATE",
          message: `REVERSE_SETTLEMENT requires status SETTLED, current is ${settlement.status}`,
        };
      }
      if (!payload.reason) {
        return { ok: false, code: "PRECONDITION", message: "Reason is required for REVERSE_SETTLEMENT (dispute or compliance note)" };
      }

      settlement.status = "REVERSED";
      (settlement as SettlementCase).reversalReason = payload.reason;
      (settlement as SettlementCase).reversedAt = now;
      addLedger(
        "STATUS_CHANGED",
        `Settlement REVERSED — ${payload.reason}. Initiated by ${payload.actorRole} (${payload.actorUserId}).`,
      );
      break;
    }

    default: {
      const _exhaustive: never = payload.action;
      return { ok: false, code: "UNKNOWN_ACTION", message: `Unknown action: ${_exhaustive}` };
    }
  }

  settlement.updatedAt = now;
  settlement.lastDecisionBy = roleToActor(payload.actorRole) === "COMPLIANCE" ? "COMPLIANCE" : "OPS";
  settlement.lastDecisionAt = now;

  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;

  return {
    ok: true,
    state: {
      settlements: newSettlements,
      ledger: [...state.ledger, ...newEntries],
      clearingJournals: [
        ...(state.clearingJournals ?? []),
        // Check if a clearing journal was created in this action
        ...(() => {
          const s = settlement as SettlementCase & { _clearingJournal?: ClearingJournal };
          if (s._clearingJournal) {
            const j = s._clearingJournal;
            delete s._clearingJournal;
            return [j];
          }
          return [];
        })(),
      ],
    },
    settlement,
    ledgerEntries: newEntries,
  };
}
