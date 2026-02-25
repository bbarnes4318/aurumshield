/* ================================================================
   STATE MACHINE — Formalized Trade & Settlement Lifecycle
   ================================================================
   Every state transition for Trades (Orders) and Settlements is
   strictly enumerated with hardcoded allowed paths. Invalid
   transitions throw IllegalStateTransitionError — they are
   impossible at the application layer.

   This module is the single source of truth for:
     1. Which states exist (strict union types)
     2. Which transitions are legal (adjacency maps)
     3. Who can trigger them (role-based authorization)
     4. Forensic audit trail (every transition is logged)

   All ad-hoc status mutations MUST go through
   transitionTradeState() or transitionSettlementState().
   ================================================================ */

import { emitAuditEvent, type AuditSeverity } from "./audit-logger";

/* ============================================================
   TRADE STATUS — Order Lifecycle
   ============================================================ */

/**
 * Strict trade lifecycle statuses.
 * Maps from the legacy OrderStatus but with clearinghouse-grade precision.
 *
 * Legacy mapping:
 *   draft              → PENDING_ALLOCATION
 *   pending_verification → PENDING_VERIFICATION
 *   reserved           → LOCKED_UNSETTLED
 *   settlement_pending → SETTLEMENT_PENDING
 *   completed          → SETTLED
 *   cancelled          → CANCELLED
 */
export type TradeStatus =
  | "PENDING_ALLOCATION"      // Order created, inventory not yet reserved
  | "PENDING_VERIFICATION"    // Awaiting KYC/KYB verification
  | "LOCKED_UNSETTLED"        // Inventory reserved, awaiting settlement
  | "SETTLEMENT_PENDING"      // Settlement rail initiated
  | "SETTLED"                 // Terminal: funds and gold exchanged
  | "REJECTED_COMPLIANCE"     // Terminal: blocked by policy engine
  | "CANCELLED"               // Terminal: user or system cancelled
  | "FAILED";                 // Terminal: settlement failed after retries

/** All possible trade statuses as a readonly array for iteration. */
export const ALL_TRADE_STATUSES: readonly TradeStatus[] = [
  "PENDING_ALLOCATION",
  "PENDING_VERIFICATION",
  "LOCKED_UNSETTLED",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "REJECTED_COMPLIANCE",
  "CANCELLED",
  "FAILED",
] as const;

/** Terminal trade states — no further transitions allowed. */
export const TERMINAL_TRADE_STATUSES: ReadonlySet<TradeStatus> = new Set([
  "SETTLED",
  "REJECTED_COMPLIANCE",
  "CANCELLED",
  "FAILED",
]);

/**
 * Allowed trade state transitions.
 * Key = current state, Value = set of legal next states.
 * Any transition NOT in this map throws IllegalStateTransitionError.
 */
export const TRADE_TRANSITIONS: ReadonlyMap<TradeStatus, ReadonlySet<TradeStatus>> = new Map([
  ["PENDING_ALLOCATION", new Set<TradeStatus>([
    "PENDING_VERIFICATION",
    "LOCKED_UNSETTLED",
    "REJECTED_COMPLIANCE",
    "CANCELLED",
  ])],
  ["PENDING_VERIFICATION", new Set<TradeStatus>([
    "LOCKED_UNSETTLED",
    "REJECTED_COMPLIANCE",
    "CANCELLED",
  ])],
  ["LOCKED_UNSETTLED", new Set<TradeStatus>([
    "SETTLEMENT_PENDING",
    "CANCELLED",
    "FAILED",
  ])],
  ["SETTLEMENT_PENDING", new Set<TradeStatus>([
    "SETTLED",
    "FAILED",
  ])],
  // Terminal states — no outbound transitions
  ["SETTLED", new Set<TradeStatus>()],
  ["REJECTED_COMPLIANCE", new Set<TradeStatus>()],
  ["CANCELLED", new Set<TradeStatus>()],
  ["FAILED", new Set<TradeStatus>()],
]);

/* ============================================================
   SETTLEMENT LIFECYCLE STATUS
   ============================================================ */

/**
 * Strict settlement lifecycle statuses.
 * These track the settlement RAIL execution, not the full Settlement entity.
 *
 * Legacy mapping:
 *   DRAFT               → PENDING_RAIL (pre-execution)
 *   ESCROW_OPEN          → PENDING_RAIL
 *   AWAITING_FUNDS       → PENDING_RAIL
 *   AWAITING_GOLD        → PENDING_RAIL
 *   AWAITING_VERIFICATION → PENDING_RAIL
 *   READY_TO_SETTLE      → PENDING_RAIL
 *   AUTHORIZED           → RAIL_SUBMITTED
 *   SETTLED              → CLEARED
 *   FAILED               → FAILED_RETRY
 *   CANCELLED            → CANCELLED
 *   AMBIGUOUS_STATE       → AMBIGUOUS_STATE
 */
export type SettlementLifecycleStatus =
  | "PENDING_RAIL"       // Awaiting rail execution
  | "RAIL_SUBMITTED"     // Payout submitted to Moov/MT
  | "CLEARED"            // Terminal: funds confirmed delivered
  | "FAILED_RETRY"       // Non-terminal: failed, eligible for retry
  | "AMBIGUOUS_STATE"    // Non-terminal: Moov outcome unknown, manual review required
  | "CANCELLED";         // Terminal: cancelled before execution

/** All settlement lifecycle statuses. */
export const ALL_SETTLEMENT_STATUSES: readonly SettlementLifecycleStatus[] = [
  "PENDING_RAIL",
  "RAIL_SUBMITTED",
  "CLEARED",
  "FAILED_RETRY",
  "AMBIGUOUS_STATE",
  "CANCELLED",
] as const;

/** Terminal settlement states. */
export const TERMINAL_SETTLEMENT_STATUSES: ReadonlySet<SettlementLifecycleStatus> = new Set([
  "CLEARED",
  "CANCELLED",
]);

/**
 * Allowed settlement state transitions.
 */
export const SETTLEMENT_TRANSITIONS: ReadonlyMap<
  SettlementLifecycleStatus,
  ReadonlySet<SettlementLifecycleStatus>
> = new Map([
  ["PENDING_RAIL", new Set<SettlementLifecycleStatus>([
    "RAIL_SUBMITTED",
    "CANCELLED",
    "FAILED_RETRY",
  ])],
  ["RAIL_SUBMITTED", new Set<SettlementLifecycleStatus>([
    "CLEARED",
    "FAILED_RETRY",
    "AMBIGUOUS_STATE",
  ])],
  ["FAILED_RETRY", new Set<SettlementLifecycleStatus>([
    "PENDING_RAIL",   // Allow retry
    "CANCELLED",
  ])],
  ["AMBIGUOUS_STATE", new Set<SettlementLifecycleStatus>([
    "CLEARED",        // Manual resolution: confirmed success
    "FAILED_RETRY",   // Manual resolution: confirmed failure
    "CANCELLED",      // Manual resolution: force cancel
  ])],
  // Terminal states
  ["CLEARED", new Set<SettlementLifecycleStatus>()],
  ["CANCELLED", new Set<SettlementLifecycleStatus>()],
]);

/* ============================================================
   ROLE-BASED AUTHORIZATION
   ============================================================ */

/** Roles authorized to trigger state transitions. */
export type TransitionRole =
  | "system"              // Automated system processes
  | "treasury_admin"      // Treasury team — settlement operations
  | "compliance_officer"  // Compliance — can reject/block trades
  | "support_admin";      // Support — limited cancel/retry abilities

/**
 * Role permissions for trade transitions.
 * Key = target status, Value = set of roles authorized to trigger it.
 */
export const TRADE_ROLE_PERMISSIONS: ReadonlyMap<TradeStatus, ReadonlySet<TransitionRole>> = new Map([
  ["PENDING_ALLOCATION", new Set<TransitionRole>(["system"])],
  ["PENDING_VERIFICATION", new Set<TransitionRole>(["system"])],
  ["LOCKED_UNSETTLED", new Set<TransitionRole>(["system"])],
  ["SETTLEMENT_PENDING", new Set<TransitionRole>(["system", "treasury_admin"])],
  ["SETTLED", new Set<TransitionRole>(["system", "treasury_admin"])],
  ["REJECTED_COMPLIANCE", new Set<TransitionRole>(["system", "compliance_officer"])],
  ["CANCELLED", new Set<TransitionRole>(["system", "treasury_admin", "compliance_officer", "support_admin"])],
  ["FAILED", new Set<TransitionRole>(["system", "treasury_admin"])],
]);

/**
 * Role permissions for settlement transitions.
 */
export const SETTLEMENT_ROLE_PERMISSIONS: ReadonlyMap<
  SettlementLifecycleStatus,
  ReadonlySet<TransitionRole>
> = new Map([
  ["PENDING_RAIL", new Set<TransitionRole>(["system", "treasury_admin"])],
  ["RAIL_SUBMITTED", new Set<TransitionRole>(["system"])],
  ["CLEARED", new Set<TransitionRole>(["system", "treasury_admin"])],
  ["FAILED_RETRY", new Set<TransitionRole>(["system", "treasury_admin"])],
  ["AMBIGUOUS_STATE", new Set<TransitionRole>(["system"])],
  ["CANCELLED", new Set<TransitionRole>(["system", "treasury_admin", "compliance_officer"])],
]);

/* ============================================================
   ILLEGAL STATE TRANSITION ERROR
   ============================================================ */

/**
 * Thrown when an illegal state transition is attempted.
 * Contains full forensic context for audit and debugging.
 */
export class IllegalStateTransitionError extends Error {
  public readonly previousState: string;
  public readonly attemptedState: string;
  public readonly entityId: string;
  public readonly entityType: "trade" | "settlement";
  public readonly actorId: string;
  public readonly actorRole: TransitionRole;
  public readonly timestamp: string;

  constructor(params: {
    previousState: string;
    attemptedState: string;
    entityId: string;
    entityType: "trade" | "settlement";
    actorId: string;
    actorRole: TransitionRole;
    reason?: string;
  }) {
    const reason = params.reason ?? "Transition not in allowed adjacency map";
    super(
      `IllegalStateTransition: Cannot transition ${params.entityType} ` +
      `${params.entityId} from ${params.previousState} → ${params.attemptedState}. ` +
      `Actor: ${params.actorId} (${params.actorRole}). Reason: ${reason}`,
    );
    this.name = "IllegalStateTransitionError";
    this.previousState = params.previousState;
    this.attemptedState = params.attemptedState;
    this.entityId = params.entityId;
    this.entityType = params.entityType;
    this.actorId = params.actorId;
    this.actorRole = params.actorRole;
    this.timestamp = new Date().toISOString();

    // Emit a CRITICAL audit event for every illegal transition attempt
    emitAuditEvent(
      "illegal_state_transition_attempted",
      "CRITICAL",
      {
        previousState: params.previousState,
        attemptedState: params.attemptedState,
        entityType: params.entityType,
        reason,
        actorRole: params.actorRole,
      },
      {
        orderId: params.entityType === "trade" ? params.entityId : undefined,
        settlementId: params.entityType === "settlement" ? params.entityId : undefined,
        userId: params.actorId,
      },
    );
  }
}

/* ============================================================
   TRANSITION FUNCTIONS
   ============================================================ */

export interface TransitionResult<S extends string> {
  /** The previous state before transition */
  previousState: S;
  /** The new state after transition */
  newState: S;
  /** The entity ID that was transitioned */
  entityId: string;
  /** ISO timestamp of the transition */
  timestamp: string;
  /** Actor who triggered the transition */
  actorId: string;
  /** Role of the actor */
  actorRole: TransitionRole;
}

/**
 * Validate and execute a trade state transition.
 *
 * This is the ONLY function that should mutate trade/order status.
 * It enforces:
 *   1. The transition is in the allowed adjacency map
 *   2. The actor's role is authorized for the target state
 *   3. A forensic audit event is emitted on success
 *
 * @throws IllegalStateTransitionError if the transition is illegal
 */
export function transitionTradeState(
  tradeId: string,
  currentState: TradeStatus,
  newState: TradeStatus,
  actorId: string,
  actorRole: TransitionRole,
): TransitionResult<TradeStatus> {
  // 1. Check transition legality
  const allowedTargets = TRADE_TRANSITIONS.get(currentState);
  if (!allowedTargets || !allowedTargets.has(newState)) {
    throw new IllegalStateTransitionError({
      previousState: currentState,
      attemptedState: newState,
      entityId: tradeId,
      entityType: "trade",
      actorId,
      actorRole,
    });
  }

  // 2. Check role authorization
  const allowedRoles = TRADE_ROLE_PERMISSIONS.get(newState);
  if (!allowedRoles || !allowedRoles.has(actorRole)) {
    throw new IllegalStateTransitionError({
      previousState: currentState,
      attemptedState: newState,
      entityId: tradeId,
      entityType: "trade",
      actorId,
      actorRole,
      reason: `Role '${actorRole}' is not authorized to transition to '${newState}'`,
    });
  }

  const timestamp = new Date().toISOString();

  // 3. Emit forensic audit event
  emitAuditEvent(
    "trade_state_transition",
    "INFO",
    {
      previousState: currentState,
      newState,
      actorRole,
      isTerminal: TERMINAL_TRADE_STATUSES.has(newState),
    },
    {
      orderId: tradeId,
      userId: actorId,
    },
  );

  return {
    previousState: currentState,
    newState,
    entityId: tradeId,
    timestamp,
    actorId,
    actorRole,
  };
}

/**
 * Validate and execute a settlement state transition.
 *
 * Same guarantees as transitionTradeState but for settlement lifecycle.
 *
 * @throws IllegalStateTransitionError if the transition is illegal
 */
export function transitionSettlementState(
  settlementId: string,
  currentState: SettlementLifecycleStatus,
  newState: SettlementLifecycleStatus,
  actorId: string,
  actorRole: TransitionRole,
): TransitionResult<SettlementLifecycleStatus> {
  // 1. Check transition legality
  const allowedTargets = SETTLEMENT_TRANSITIONS.get(currentState);
  if (!allowedTargets || !allowedTargets.has(newState)) {
    throw new IllegalStateTransitionError({
      previousState: currentState,
      attemptedState: newState,
      entityId: settlementId,
      entityType: "settlement",
      actorId,
      actorRole,
    });
  }

  // 2. Check role authorization
  const allowedRoles = SETTLEMENT_ROLE_PERMISSIONS.get(newState);
  if (!allowedRoles || !allowedRoles.has(actorRole)) {
    throw new IllegalStateTransitionError({
      previousState: currentState,
      attemptedState: newState,
      entityId: settlementId,
      entityType: "settlement",
      actorId,
      actorRole,
      reason: `Role '${actorRole}' is not authorized to transition to '${newState}'`,
    });
  }

  const timestamp = new Date().toISOString();

  // Determine severity — P1 for ambiguous states
  const severity: AuditSeverity = newState === "AMBIGUOUS_STATE" ? "P1_ALERT" : "INFO";

  // 3. Emit forensic audit event
  emitAuditEvent(
    "settlement_state_transition",
    severity,
    {
      previousState: currentState,
      newState,
      actorRole,
      isTerminal: TERMINAL_SETTLEMENT_STATUSES.has(newState),
    },
    {
      settlementId,
      userId: actorId,
    },
  );

  return {
    previousState: currentState,
    newState,
    entityId: settlementId,
    timestamp,
    actorId,
    actorRole,
  };
}

/* ============================================================
   LEGACY STATUS MIGRATION MAPPERS
   ============================================================ */

import type { OrderStatus, SettlementStatus } from "./mock-data";

/**
 * Map a legacy OrderStatus to the new strict TradeStatus.
 * Used during data migration to backfill existing records.
 */
export function mapLegacyOrderStatus(legacy: OrderStatus): TradeStatus {
  const mapping: Record<OrderStatus, TradeStatus> = {
    draft: "PENDING_ALLOCATION",
    pending_verification: "PENDING_VERIFICATION",
    reserved: "LOCKED_UNSETTLED",
    settlement_pending: "SETTLEMENT_PENDING",
    completed: "SETTLED",
    cancelled: "CANCELLED",
  };

  const result = mapping[legacy];
  if (!result) {
    throw new Error(`Unknown legacy OrderStatus: '${legacy}'. Cannot migrate.`);
  }
  return result;
}

/**
 * Map a legacy SettlementStatus to the new strict SettlementLifecycleStatus.
 */
export function mapLegacySettlementStatus(legacy: SettlementStatus): SettlementLifecycleStatus {
  const mapping: Record<SettlementStatus, SettlementLifecycleStatus> = {
    DRAFT: "PENDING_RAIL",
    ESCROW_OPEN: "PENDING_RAIL",
    AWAITING_FUNDS: "PENDING_RAIL",
    AWAITING_GOLD: "PENDING_RAIL",
    AWAITING_VERIFICATION: "PENDING_RAIL",
    READY_TO_SETTLE: "PENDING_RAIL",
    AUTHORIZED: "RAIL_SUBMITTED",
    SETTLED: "CLEARED",
    FAILED: "FAILED_RETRY",
    CANCELLED: "CANCELLED",
    AMBIGUOUS_STATE: "AMBIGUOUS_STATE",
  };

  const result = mapping[legacy];
  if (!result) {
    throw new Error(`Unknown legacy SettlementStatus: '${legacy}'. Cannot migrate.`);
  }
  return result;
}

/**
 * Map a TradeStatus back to the legacy OrderStatus for backward compatibility.
 * Used when rendering in UI components that still consume OrderStatus.
 */
export function mapTradeStatusToLegacy(trade: TradeStatus): OrderStatus {
  const mapping: Record<TradeStatus, OrderStatus> = {
    PENDING_ALLOCATION: "draft",
    PENDING_VERIFICATION: "pending_verification",
    LOCKED_UNSETTLED: "reserved",
    SETTLEMENT_PENDING: "settlement_pending",
    SETTLED: "completed",
    REJECTED_COMPLIANCE: "cancelled",
    CANCELLED: "cancelled",
    FAILED: "cancelled",
  };
  return mapping[trade];
}
