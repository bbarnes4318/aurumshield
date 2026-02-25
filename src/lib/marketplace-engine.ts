/* ================================================================
   MARKETPLACE ENGINE — Pure deterministic functions
   All functions are immutable: they return new state, never mutate.
   All time logic uses the passed `nowMs` parameter.
   ================================================================ */

import type {
  Listing,
  ListingStatus,
  InventoryPosition,
  Reservation,
  Order,
  ListingEvidenceType,
  ListingEvidenceItem,
  Org,
} from "./mock-data";
import type { MarketplacePolicySnapshot } from "./policy-engine";
import { loadVerificationCase } from "./verification-engine";
import { getOrg } from "./auth-store";
import { isGoodDeliveryRefiner } from "./lbma-service";

/* ---------- State Shape ---------- */
export interface MarketplaceState {
  listings: Listing[];
  inventory: InventoryPosition[];
  reservations: Reservation[];
  orders: Order[];
  listingEvidence: ListingEvidenceItem[];
}

/* ---------- Constants ---------- */
const RESERVATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/* ---------- RSK-005: Inventory Invariant Enforcement ---------- */

/**
 * Thrown when an inventory mutation would violate the allocation invariant.
 * Equivalent to a PostgreSQL CHECK constraint violation.
 */
export class InventoryInvariantViolation extends Error {
  readonly listingId: string;
  readonly totalWeightOz: number;
  readonly lockedWeightOz: number;
  readonly availableWeightOz: number;
  readonly requestedOz: number;
  readonly operation: "lock" | "release" | "assertion";
  readonly timestamp: string;

  constructor(opts: {
    listingId: string;
    totalWeightOz: number;
    lockedWeightOz: number;
    availableWeightOz: number;
    requestedOz: number;
    operation: "lock" | "release" | "assertion";
    detail: string;
  }) {
    super(
      `INVENTORY_INVARIANT_VIOLATION [${opts.operation}]: ${opts.detail} | ` +
      `listing=${opts.listingId} total=${opts.totalWeightOz} ` +
      `locked=${opts.lockedWeightOz} available=${opts.availableWeightOz} ` +
      `requested=${opts.requestedOz}`,
    );
    this.name = "InventoryInvariantViolation";
    this.listingId = opts.listingId;
    this.totalWeightOz = opts.totalWeightOz;
    this.lockedWeightOz = opts.lockedWeightOz;
    this.availableWeightOz = opts.availableWeightOz;
    this.requestedOz = opts.requestedOz;
    this.operation = opts.operation;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Compute locked weight from component parts.
 * lockedWeightOz = reservedWeightOz + allocatedWeightOz
 */
export function computeLockedWeight(inv: InventoryPosition): number {
  return inv.reservedWeightOz + inv.allocatedWeightOz;
}

/**
 * Assert the inventory invariant holds.
 * Mirrors the 4 CHECK constraints in 007_inventory_allocation.sql:
 *   1. locked_weight_oz >= 0
 *   2. available_weight_oz >= 0
 *   3. total_weight_oz >= locked_weight_oz
 *   4. available_weight_oz = total_weight_oz - locked_weight_oz
 *
 * Throws InventoryInvariantViolation on any violation.
 */
export function assertInventoryInvariant(
  inv: InventoryPosition,
  requestedOz = 0,
): void {
  const computed = computeLockedWeight(inv);

  if (inv.lockedWeightOz < 0) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz,
      operation: "assertion",
      detail: "lockedWeightOz is negative",
    });
  }

  if (inv.availableWeightOz < 0) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz,
      operation: "assertion",
      detail: "availableWeightOz is negative",
    });
  }

  if (inv.totalWeightOz < inv.lockedWeightOz) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz,
      operation: "assertion",
      detail: "lockedWeightOz exceeds totalWeightOz",
    });
  }

  if (Math.abs(inv.availableWeightOz - (inv.totalWeightOz - inv.lockedWeightOz)) > 0.001) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz,
      operation: "assertion",
      detail: `availableWeightOz (${inv.availableWeightOz}) != totalWeightOz - lockedWeightOz (${inv.totalWeightOz - inv.lockedWeightOz})`,
    });
  }

  if (computed !== inv.lockedWeightOz) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz,
      operation: "assertion",
      detail: `lockedWeightOz (${inv.lockedWeightOz}) != computed (reserved=${inv.reservedWeightOz} + allocated=${inv.allocatedWeightOz} = ${computed})`,
    });
  }
}

/**
 * Atomic compare-and-swap: lock inventory weight.
 * TypeScript equivalent of fn_lock_inventory() from 007_inventory_allocation.sql.
 *
 * @returns Updated InventoryPosition, or throws InventoryInvariantViolation
 *          if insufficient available weight (409 Conflict equivalent).
 */
function lockInventory(
  inv: InventoryPosition,
  weightOz: number,
  updatedAt: string,
): InventoryPosition {
  // Pre-condition: current state is valid
  assertInventoryInvariant(inv, weightOz);

  // CAS guard: equivalent to WHERE available_weight_oz >= $1
  if (weightOz > inv.availableWeightOz) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz: weightOz,
      operation: "lock",
      detail: `INVENTORY_EXHAUSTED: Requested ${weightOz} oz exceeds available ${inv.availableWeightOz} oz`,
    });
  }

  // This is a delegation point — the caller is responsible for
  // deciding whether this goes to reserved or allocated.
  // We only update lockedWeightOz here; the caller updates the
  // component fields (reservedWeightOz / allocatedWeightOz).
  // The invariant assertion after the caller's mutation will
  // verify consistency.
  return {
    ...inv,
    lockedWeightOz: inv.lockedWeightOz + weightOz,
    availableWeightOz: inv.availableWeightOz - weightOz,
    updatedAt,
  };
}

/**
 * Atomic release: unlock inventory weight.
 * TypeScript equivalent of fn_release_inventory() from 007_inventory_allocation.sql.
 */
function releaseInventory(
  inv: InventoryPosition,
  weightOz: number,
  updatedAt: string,
): InventoryPosition {
  if (weightOz > inv.lockedWeightOz) {
    throw new InventoryInvariantViolation({
      listingId: inv.listingId,
      totalWeightOz: inv.totalWeightOz,
      lockedWeightOz: inv.lockedWeightOz,
      availableWeightOz: inv.availableWeightOz,
      requestedOz: weightOz,
      operation: "release",
      detail: `Cannot release ${weightOz} oz — only ${inv.lockedWeightOz} oz locked`,
    });
  }

  return {
    ...inv,
    lockedWeightOz: inv.lockedWeightOz - weightOz,
    availableWeightOz: inv.availableWeightOz + weightOz,
    updatedAt,
  };
}

const REQUIRED_EVIDENCE_TYPES: ListingEvidenceType[] = [
  "ASSAY_REPORT",
  "CHAIN_OF_CUSTODY",
  "SELLER_ATTESTATION",
];

/* ---------- ID Generation (deterministic) ---------- */
function nextId(prefix: string, items: { id: string }[]): string {
  let max = 0;
  for (const item of items) {
    const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/* ---------- computeListingStatus ---------- */
export function computeListingStatus(
  listingId: string,
  state: MarketplaceState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _nowMs: number,
): ListingStatus {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return "suspended";
  if (listing.status === "suspended") return "suspended";
  if (listing.status === "draft") return "draft";

  const inv = state.inventory.find((i) => i.listingId === listingId);
  if (!inv) return "suspended";

  if (inv.availableWeightOz <= 0 && inv.reservedWeightOz <= 0) return "sold";
  if (inv.availableWeightOz <= 0 && inv.reservedWeightOz > 0) return "reserved";
  if (inv.allocatedWeightOz > 0 && inv.availableWeightOz > 0)
    return "allocated";
  return "available";
}

/* ---------- expireReservations ---------- */
export function expireReservations(
  state: MarketplaceState,
  nowMs: number,
): MarketplaceState {
  const expiredIds = new Set<string>();

  const nextReservations = state.reservations.map((r) => {
    if (r.state === "ACTIVE" && new Date(r.expiresAt).getTime() <= nowMs) {
      expiredIds.add(r.id);
      return { ...r, state: "EXPIRED" as const };
    }
    return r;
  });

  if (expiredIds.size === 0) return state;

  // Accumulate released weight per listing
  const releasedByListing = new Map<string, number>();
  for (const r of state.reservations) {
    if (expiredIds.has(r.id)) {
      releasedByListing.set(
        r.listingId,
        (releasedByListing.get(r.listingId) ?? 0) + r.weightOz,
      );
    }
  }

  const nextInventory = state.inventory.map((inv) => {
    const released = releasedByListing.get(inv.listingId);
    if (released) {
      // RSK-005: Release locked inventory atomically
      const releasedInv = releaseInventory(inv, released, new Date(nowMs).toISOString());
      const mutated: InventoryPosition = {
        ...releasedInv,
        reservedWeightOz: releasedInv.reservedWeightOz - released,
      };
      assertInventoryInvariant(mutated);
      return mutated;
    }
    return inv;
  });

  return {
    ...state,
    reservations: nextReservations,
    inventory: nextInventory,
  };
}

/* ---------- createReservation ---------- */
export interface CreateReservationArgs {
  listingId: string;
  buyerUserId: string;
  weightOz: number;
}

export function createReservation(
  state: MarketplaceState,
  args: CreateReservationArgs,
  nowMs: number,
): { next: MarketplaceState; reservation: Reservation } {
  const { listingId, buyerUserId, weightOz } = args;

  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);
  if (listing.status === "suspended")
    throw new Error(`Listing ${listingId} is suspended`);

  const inv = state.inventory.find((i) => i.listingId === listingId);
  if (!inv) throw new Error(`Inventory for listing ${listingId} not found`);
  // RSK-005: Atomic compare-and-swap with invariant enforcement
  const lockedInv = lockInventory(inv, weightOz, new Date(nowMs).toISOString());

  const id = nextId("res", state.reservations);
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + RESERVATION_TTL_MS).toISOString();

  const reservation: Reservation = {
    id,
    listingId,
    buyerUserId,
    weightOz,
    pricePerOzLocked: listing.pricePerOz,
    createdAt,
    expiresAt,
    state: "ACTIVE",
  };

  const nextInventory = state.inventory.map((i) => {
    if (i.listingId !== listingId) return i;
    const mutated: InventoryPosition = {
      ...lockedInv,
      reservedWeightOz: lockedInv.reservedWeightOz + weightOz,
    };
    // Post-condition: invariant still holds
    assertInventoryInvariant(mutated, weightOz);
    return mutated;
  });

  return {
    next: {
      ...state,
      inventory: nextInventory,
      reservations: [...state.reservations, reservation],
    },
    reservation,
  };
}

/* ---------- convertReservationToOrder ---------- */
export function convertReservationToOrder(
  state: MarketplaceState,
  reservationId: string,
  buyerUserId: string,
  nowMs: number,
  policySnapshot: MarketplacePolicySnapshot,
): { next: MarketplaceState; order: Order } {
  const reservation = state.reservations.find((r) => r.id === reservationId);
  if (!reservation) throw new Error(`Reservation ${reservationId} not found`);
  if (reservation.state !== "ACTIVE")
    throw new Error(
      `Reservation ${reservationId} is ${reservation.state}, not ACTIVE`,
    );
  if (new Date(reservation.expiresAt).getTime() <= nowMs)
    throw new Error(`Reservation ${reservationId} has expired`);

  const listing = state.listings.find((l) => l.id === reservation.listingId);
  if (!listing) throw new Error(`Listing ${reservation.listingId} not found`);

  const orderId = nextId("ord", state.orders);
  const order: Order = {
    id: orderId,
    listingId: reservation.listingId,
    reservationId,
    buyerUserId,
    sellerUserId: listing.sellerUserId,
    sellerOrgId: listing.sellerOrgId,
    weightOz: reservation.weightOz,
    pricePerOz: reservation.pricePerOzLocked,
    notional: reservation.weightOz * reservation.pricePerOzLocked,
    status: "pending_verification",
    createdAt: new Date(nowMs).toISOString(),
    policySnapshot,
  };

  const nextReservations = state.reservations.map((r) =>
    r.id === reservationId ? { ...r, state: "CONVERTED" as const } : r,
  );

  const nextInventory = state.inventory.map((i) =>
    i.listingId === reservation.listingId
      ? {
          ...i,
          reservedWeightOz: i.reservedWeightOz - reservation.weightOz,
          allocatedWeightOz: i.allocatedWeightOz + reservation.weightOz,
          updatedAt: new Date(nowMs).toISOString(),
        }
      : i,
  );

  return {
    next: {
      ...state,
      reservations: nextReservations,
      inventory: nextInventory,
      orders: [...state.orders, order],
    },
    order,
  };
}

/* ---------- executeAtomicCheckout ---------- */
/**
 * ATOMIC CHECKOUT — Collapses reserve + convert into a single state transition.
 *
 * System invariant: inventory cannot be allocated without a corresponding order.
 * This function performs both operations in one pure-function call. If any
 * validation fails (listing suspended, insufficient inventory, policy block),
 * an error is thrown and no state mutation occurs.
 *
 * The reservation is created directly in CONVERTED state — it never enters
 * the ACTIVE state. Inventory moves directly from available → allocated,
 * skipping the reserved intermediate.
 *
 * This mirrors the semantics of a SERIALIZABLE DB transaction:
 *   DB.transaction(async (tx) => {
 *     SELECT ... FOR UPDATE on inventory
 *     INSERT reservation
 *     INSERT order
 *     UPDATE inventory
 *   })
 */
export interface AtomicCheckoutArgs {
  listingId: string;
  buyerUserId: string;
  weightOz: number;
}

/**
 * @param state          — Current marketplace state snapshot
 * @param args           — Client-supplied identifiers (listingId, buyerUserId, weightOz)
 * @param nowMs          — Server timestamp
 * @param serverNotional — Server-computed notional (weightOz × listing.pricePerOz)
 * @param serverPolicySnapshot — Server-evaluated compliance snapshot (NEVER from client)
 */
export function executeAtomicCheckout(
  state: MarketplaceState,
  args: AtomicCheckoutArgs,
  nowMs: number,
  serverNotional: number,
  serverPolicySnapshot: MarketplacePolicySnapshot,
): { next: MarketplaceState; reservation: Reservation; order: Order } {
  const { listingId, buyerUserId, weightOz } = args;

  // ── Validate listing ──
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);
  if (listing.status === "suspended")
    throw new Error(`Listing ${listingId} is suspended`);

  // ── RSK-005: Validate inventory with invariant assertion ──
  const inv = state.inventory.find((i) => i.listingId === listingId);
  if (!inv) throw new Error(`Inventory for listing ${listingId} not found`);
  assertInventoryInvariant(inv, weightOz);

  // Atomic compare-and-swap: lock the weight
  const lockedInv = lockInventory(inv, weightOz, new Date(nowMs).toISOString());

  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + RESERVATION_TTL_MS).toISOString();

  // ── Create reservation (CONVERTED immediately — never dangling) ──
  const reservationId = nextId("res", state.reservations);
  const reservation: Reservation = {
    id: reservationId,
    listingId,
    buyerUserId,
    weightOz,
    pricePerOzLocked: listing.pricePerOz,
    createdAt,
    expiresAt,
    state: "CONVERTED",
  };

  // ── Create order (within same transition) ──
  const orderId = nextId("ord", state.orders);
  const order: Order = {
    id: orderId,
    listingId,
    reservationId,
    buyerUserId,
    sellerUserId: listing.sellerUserId,
    sellerOrgId: listing.sellerOrgId,
    weightOz,
    pricePerOz: listing.pricePerOz,
    notional: serverNotional,
    status: "pending_verification",
    createdAt,
    policySnapshot: serverPolicySnapshot,
  };

  // ── RSK-005: Atomic inventory update with invariant post-check ──
  const nextInventory = state.inventory.map((i) => {
    if (i.listingId !== listingId) return i;
    const mutated: InventoryPosition = {
      ...lockedInv,
      allocatedWeightOz: lockedInv.allocatedWeightOz + weightOz,
    };
    assertInventoryInvariant(mutated, weightOz);
    return mutated;
  });

  return {
    next: {
      ...state,
      inventory: nextInventory,
      reservations: [...state.reservations, reservation],
      orders: [...state.orders, order],
    },
    reservation,
    order,
  };
}

/* ================================================================
   SELL-SIDE ENGINE — Draft listing, evidence packing, publish gate
   ================================================================ */

/* ---------- GateResult ---------- */
export interface GateResult {
  allowed: boolean;
  blockers: string[];
  checks: {
    sellerVerified: boolean;
    evidenceComplete: boolean;
    evidencePresent: ListingEvidenceType[];
    provenanceVerified: boolean;
  };
}

/* ---------- Provenance Result ---------- */
export interface ProvenanceResult {
  /** Whether the refiner is on the LBMA Good Delivery List */
  refinerOnGoodDeliveryList: boolean;
  /** Refiner name as extracted from the assay document */
  extractedRefinerName: string | null;
  /** Whether a refiner name was found in the assay document */
  refinerNameFound: boolean;
  /** Overall provenance verification pass/fail */
  passed: boolean;
  /** Human-readable summary */
  detail: string;
}

/**
 * Run a provenance check for a listing.
 *
 * Cross-references the refiner name extracted by Textract from the
 * assay report against the LBMA Good Delivery List cache provided by
 * lbma-service.ts.
 *
 * Returns a structured result indicating whether the refiner is on the
 * Good Delivery List. This check is advisory — it adds a blocker to the
 * publish gate if the refiner is NOT on the list, but does not block if
 * no refiner name was extracted (to allow manual override).
 */
export function runProvenanceCheck(
  state: MarketplaceState,
  listingId: string,
): ProvenanceResult {
  const listingEvidence = state.listingEvidence.filter(
    (e) => e.listingId === listingId,
  );

  // Find the assay report evidence with extracted metadata
  const assayEvidence = listingEvidence.find((e) => e.type === "ASSAY_REPORT");

  if (!assayEvidence) {
    return {
      refinerOnGoodDeliveryList: false,
      extractedRefinerName: null,
      refinerNameFound: false,
      passed: false,
      detail: "No assay report uploaded — cannot verify refiner provenance.",
    };
  }

  const meta = assayEvidence.extractedMetadata;
  if (!meta || !meta.analysisSucceeded) {
    return {
      refinerOnGoodDeliveryList: false,
      extractedRefinerName: null,
      refinerNameFound: false,
      passed: false,
      detail:
        "Assay report analysis not available — cannot verify refiner provenance.",
    };
  }

  const refinerName = meta.extractedRefinerName;
  if (!refinerName) {
    // No refiner name extracted — advisory pass (don't block hard)
    return {
      refinerOnGoodDeliveryList: false,
      extractedRefinerName: null,
      refinerNameFound: false,
      passed: true,
      detail:
        "Refiner name not found in assay document — provenance check skipped. Manual review may be required.",
    };
  }

  // Cross-reference against LBMA Good Delivery List
  const isOnList = isGoodDeliveryRefiner(refinerName);

  return {
    refinerOnGoodDeliveryList: isOnList,
    extractedRefinerName: refinerName,
    refinerNameFound: true,
    passed: isOnList,
    detail: isOnList
      ? `Refiner "${refinerName}" verified on LBMA Good Delivery List.`
      : `Refiner "${refinerName}" is NOT on the LBMA Good Delivery List — listing may be rejected.`,
  };
}

/* ---------- createDraftListing ---------- */
export interface CreateDraftListingArgs {
  title: string;
  form: "bar" | "coin";
  purity: "995" | "999" | "9999";
  totalWeightOz: number;
  pricePerOz: number;
  vaultHubId: string;
  vaultName: string;
  jurisdiction: string;
  sellerUserId: string;
  sellerOrgId: string;
  sellerName: string;
}

export function createDraftListing(
  state: MarketplaceState,
  args: CreateDraftListingArgs,
  nowMs: number,
): { next: MarketplaceState; listing: Listing } {
  const id = nextId("lst", state.listings);
  const createdAt = new Date(nowMs).toISOString();

  const listing: Listing = {
    id,
    title: args.title,
    form: args.form,
    purity: args.purity,
    vaultHubId: args.vaultHubId,
    vaultName: args.vaultName,
    jurisdiction: args.jurisdiction,
    sellerUserId: args.sellerUserId,
    sellerOrgId: args.sellerOrgId,
    sellerName: args.sellerName,
    evidenceIds: [],
    status: "draft",
    publishedAt: null,
    createdAt,
    pricePerOz: args.pricePerOz,
    totalWeightOz: args.totalWeightOz,
  };

  return {
    next: {
      ...state,
      listings: [...state.listings, listing],
    },
    listing,
  };
}

/* ---------- updateDraftListing ---------- */
export function updateDraftListing(
  state: MarketplaceState,
  listingId: string,
  patch: Partial<Omit<Listing, "id" | "status" | "createdAt" | "publishedAt">>,
): MarketplaceState {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);
  if (listing.status !== "draft")
    throw new Error(
      `Listing ${listingId} is ${listing.status}, not draft — cannot update`,
    );

  return {
    ...state,
    listings: state.listings.map((l) =>
      l.id === listingId ? { ...l, ...patch } : l,
    ),
  };
}

/* ---------- createListingEvidence ---------- */
const EVIDENCE_TITLES: Record<ListingEvidenceType, string> = {
  ASSAY_REPORT: "Certified Assay Report",
  CHAIN_OF_CUSTODY: "Chain of Custody Certificate",
  SELLER_ATTESTATION: "Seller Attestation Declaration",
};

export function createListingEvidence(
  state: MarketplaceState,
  listingId: string,
  evidenceType: ListingEvidenceType,
  userId: string,
  nowMs: number,
): { next: MarketplaceState; evidence: ListingEvidenceItem } {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);

  // Deterministic ID: ev-lst-{listingId}-{type}
  const evidenceId = `ev-lst-${listingId}-${evidenceType.toLowerCase().replace(/_/g, "-")}`;

  // Check if already exists
  const existing = state.listingEvidence.find((e) => e.id === evidenceId);
  if (existing) {
    return { next: state, evidence: existing };
  }

  const evidence: ListingEvidenceItem = {
    id: evidenceId,
    listingId,
    type: evidenceType,
    title: EVIDENCE_TITLES[evidenceType],
    createdAt: new Date(nowMs).toISOString(),
    createdBy: userId,
  };

  // Append evidence ID to listing
  const nextListings = state.listings.map((l) =>
    l.id === listingId
      ? { ...l, evidenceIds: [...l.evidenceIds, evidenceId] }
      : l,
  );

  return {
    next: {
      ...state,
      listings: nextListings,
      listingEvidence: [...state.listingEvidence, evidence],
    },
    evidence,
  };
}

/* ---------- runPublishGate ---------- */
export function runPublishGate(
  state: MarketplaceState,
  listingId: string,
  userId: string,
): GateResult {
  const blockers: string[] = [];
  let sellerVerified = false;

  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) {
    return {
      allowed: false,
      blockers: ["Listing not found"],
      checks: {
        sellerVerified: false,
        evidenceComplete: false,
        evidencePresent: [],
        provenanceVerified: false,
      },
    };
  }

  // 1) Verification case check
  const vc = loadVerificationCase(userId);
  if (!vc) {
    blockers.push(
      "Seller verification case not found — complete KYC/KYB verification first",
    );
  } else {
    // Determine required track based on org type
    const org: Org | null = getOrg(listing.sellerOrgId);
    if (!org) {
      blockers.push("Seller organization not found");
    } else {
      const requiredTrack =
        org.type === "company" ? "BUSINESS_KYB" : "INDIVIDUAL_KYC";
      if (vc.track !== requiredTrack) {
        blockers.push(
          `Verification track mismatch — expected ${requiredTrack}, found ${vc.track}`,
        );
      }
      if (vc.status !== "VERIFIED") {
        blockers.push(
          `Seller verification status is ${vc.status} — must be VERIFIED`,
        );
      } else {
        sellerVerified = true;
      }
    }
  }

  // 2) Evidence pack completeness — all 3 required types
  const listingEvidenceItems = state.listingEvidence.filter(
    (e) => e.listingId === listingId,
  );
  const presentTypes = new Set(listingEvidenceItems.map((e) => e.type));
  const evidencePresent = REQUIRED_EVIDENCE_TYPES.filter((t) =>
    presentTypes.has(t),
  );
  const evidenceComplete =
    evidencePresent.length === REQUIRED_EVIDENCE_TYPES.length;

  for (const required of REQUIRED_EVIDENCE_TYPES) {
    if (!presentTypes.has(required)) {
      blockers.push(
        `Missing required evidence: ${EVIDENCE_TITLES[required]} (${required})`,
      );
    }
  }

  // 3) Assay data verification — compare Textract-extracted values against listing specs
  const assayEvidence = listingEvidenceItems.find(
    (e) => e.type === "ASSAY_REPORT",
  );
  if (assayEvidence?.extractedMetadata) {
    const meta = assayEvidence.extractedMetadata;

    if (!meta.analysisSucceeded) {
      // Textract analysis failed entirely — block publication
      blockers.push(
        `ANALYSIS_FAILED: Assay report document analysis failed — ${meta.analysisError ?? "unknown error"}. Re-upload a legible document.`,
      );
    } else {
      // Purity cross-check: extracted purity must match listing.purity
      if (
        meta.extractedPurity !== null &&
        meta.extractedPurity !== listing.purity
      ) {
        blockers.push(
          `DATA_MISMATCH: Uploaded Assay Report purity (${meta.rawPurityText ?? meta.extractedPurity}) does not match listing specifications (${listing.purity}). ` +
            `Expected document purity to be ${listing.purity}.`,
        );
      }

      // Weight cross-check: extracted weight must match listing.totalWeightOz (advisory warning only)
      if (
        meta.extractedWeightOz !== null &&
        meta.extractedWeightOz !== listing.totalWeightOz
      ) {
        // Weight mismatch is a blocker — document must match declared weight exactly
        blockers.push(
          `DATA_MISMATCH: Uploaded Assay Report weight (${meta.rawWeightText ?? `${meta.extractedWeightOz} oz`}) does not match listing weight (${listing.totalWeightOz} oz).`,
        );
      }
    }
  }

  // 4) Provenance check — cross-reference refiner against LBMA Good Delivery List
  const provenanceResult = runProvenanceCheck(state, listingId);
  let provenanceVerified = provenanceResult.passed;

  if (
    provenanceResult.refinerNameFound &&
    !provenanceResult.refinerOnGoodDeliveryList
  ) {
    blockers.push(`PROVENANCE_FAILED: ${provenanceResult.detail}`);
    provenanceVerified = false;
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    checks: {
      sellerVerified,
      evidenceComplete,
      evidencePresent,
      provenanceVerified,
    },
  };
}

/* ---------- publishListing ---------- */
export function publishListing(
  state: MarketplaceState,
  listingId: string,
  userId: string,
  nowMs: number,
): { next: MarketplaceState; gateResult: GateResult } {
  const gateResult = runPublishGate(state, listingId, userId);

  if (!gateResult.allowed) {
    return { next: state, gateResult };
  }

  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) {
    return {
      next: state,
      gateResult: {
        allowed: false,
        blockers: ["Listing not found"],
        checks: {
          sellerVerified: false,
          evidenceComplete: false,
          evidencePresent: [],
          provenanceVerified: false,
        },
      },
    };
  }

  const publishedAt = new Date(nowMs).toISOString();

  // Update listing status
  const nextListings = state.listings.map((l) =>
    l.id === listingId
      ? { ...l, status: "available" as const, publishedAt }
      : l,
  );

  // Ensure InventoryPosition exists
  const existingInv = state.inventory.find((i) => i.listingId === listingId);
  let nextInventory = state.inventory;
  if (!existingInv) {
    const invId = nextId("inv", state.inventory);
    const newInv: InventoryPosition = {
      id: invId,
      listingId,
      totalWeightOz: listing.totalWeightOz,
      availableWeightOz: listing.totalWeightOz,
      reservedWeightOz: 0,
      allocatedWeightOz: 0,
      lockedWeightOz: 0,
      updatedAt: publishedAt,
    };
    nextInventory = [...state.inventory, newInv];
  }

  return {
    next: {
      ...state,
      listings: nextListings,
      inventory: nextInventory,
    },
    gateResult,
  };
}

/* ---------- Exported constants ---------- */
export { REQUIRED_EVIDENCE_TYPES };
