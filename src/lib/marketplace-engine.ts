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
      return {
        ...inv,
        availableWeightOz: inv.availableWeightOz + released,
        reservedWeightOz: inv.reservedWeightOz - released,
        updatedAt: new Date(nowMs).toISOString(),
      };
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
  if (weightOz > inv.availableWeightOz) {
    throw new Error(
      `Requested ${weightOz} oz exceeds available ${inv.availableWeightOz} oz`,
    );
  }

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

  const nextInventory = state.inventory.map((i) =>
    i.listingId === listingId
      ? {
          ...i,
          availableWeightOz: i.availableWeightOz - weightOz,
          reservedWeightOz: i.reservedWeightOz + weightOz,
          updatedAt: new Date(nowMs).toISOString(),
        }
      : i,
  );

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
    throw new Error(`Listing ${listingId} is ${listing.status}, not draft — cannot update`);

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
      checks: { sellerVerified: false, evidenceComplete: false, evidencePresent: [] },
    };
  }

  // 1) Verification case check
  const vc = loadVerificationCase(userId);
  if (!vc) {
    blockers.push("Seller verification case not found — complete KYC/KYB verification first");
  } else {
    // Determine required track based on org type
    const org: Org | null = getOrg(listing.sellerOrgId);
    if (!org) {
      blockers.push("Seller organization not found");
    } else {
      const requiredTrack = org.type === "company" ? "BUSINESS_KYB" : "INDIVIDUAL_KYC";
      if (vc.track !== requiredTrack) {
        blockers.push(`Verification track mismatch — expected ${requiredTrack}, found ${vc.track}`);
      }
      if (vc.status !== "VERIFIED") {
        blockers.push(`Seller verification status is ${vc.status} — must be VERIFIED`);
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
  const evidencePresent = REQUIRED_EVIDENCE_TYPES.filter((t) => presentTypes.has(t));
  const evidenceComplete = evidencePresent.length === REQUIRED_EVIDENCE_TYPES.length;

  for (const required of REQUIRED_EVIDENCE_TYPES) {
    if (!presentTypes.has(required)) {
      blockers.push(`Missing required evidence: ${EVIDENCE_TITLES[required]} (${required})`);
    }
  }

  // 3) Assay data verification — compare Textract-extracted values against listing specs
  const assayEvidence = listingEvidenceItems.find((e) => e.type === "ASSAY_REPORT");
  if (assayEvidence?.extractedMetadata) {
    const meta = assayEvidence.extractedMetadata;

    if (!meta.analysisSucceeded) {
      // Textract analysis failed entirely — block publication
      blockers.push(
        `ANALYSIS_FAILED: Assay report document analysis failed — ${meta.analysisError ?? "unknown error"}. Re-upload a legible document.`,
      );
    } else {
      // Purity cross-check: extracted purity must match listing.purity
      if (meta.extractedPurity !== null && meta.extractedPurity !== listing.purity) {
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

  return {
    allowed: blockers.length === 0,
    blockers,
    checks: { sellerVerified, evidenceComplete, evidencePresent },
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
    return { next: state, gateResult: { allowed: false, blockers: ["Listing not found"], checks: { sellerVerified: false, evidenceComplete: false, evidencePresent: [] } } };
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
