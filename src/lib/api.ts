/* ================================================================
   MOCK API — Simulated fetch with configurable delay
   ================================================================ */

import type {
  Listing,
  InventoryPosition,
  EvidenceItem,
  Reservation,
  Order,
  ListingEvidenceType,
  ListingEvidenceItem,
} from "./mock-data";
import { mockEvidence } from "./mock-data";
import {
  expireReservations,
  computeListingStatus,
  createReservation as engineCreateReservation,
  convertReservationToOrder as engineConvertReservation,
  createDraftListing as engineCreateDraftListing,
  updateDraftListing as engineUpdateDraftListing,
  createListingEvidence as engineCreateListingEvidence,
  publishListing as enginePublishListing,
  type CreateDraftListingArgs,
  type GateResult,
} from "./marketplace-engine";
import {
  loadMarketplaceState,
  saveMarketplaceState,
} from "./marketplace-store";
import {
  getCanonicalCapitalSnapshot,
  getCanonicalControlDecision,
  type ControlActionKey,
  type CapitalControlDecision,
} from "./capital-controls";
import {
  expireOverrides,
  createOverride,
  revokeOverride as storeRevokeOverride,
  isActionOverridden,
  validateOverrideRequest,
  type CapitalOverride,
  type CreateOverrideInput,
  type OverrideScope,
} from "./override-store";

/**
 * Simulates a network request with a random delay between min and max ms.
 * Returns a deep-cloned copy of the provided data to mimic real API behaviour.
 */
export async function mockFetch<T>(
  data: T,
  { minDelay = 300, maxDelay = 800 }: { minDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(structuredClone(data));
    }, delay);
  });
}

/* ================================================================
   MARKETPLACE API — Mock endpoints backed by localStorage
   All reads apply reservation expiry before returning data.
   ================================================================ */

/** Load state from store, apply reservation expiry, persist, and return. */
function freshState(nowMs: number = Date.now()) {
  const state = loadMarketplaceState();
  const next = expireReservations(state, nowMs);
  // Only write back if expiry actually changed something
  if (next !== state) saveMarketplaceState(next);
  return next;
}

/* ---------- READ endpoints ---------- */

export async function getListings(): Promise<Listing[]> {
  const nowMs = Date.now();
  const state = freshState(nowMs);
  const listings = state.listings.map((l) => ({
    ...l,
    status: computeListingStatus(l.id, state, nowMs),
  }));
  return mockFetch(listings);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  const nowMs = Date.now();
  const state = freshState(nowMs);
  const listing = state.listings.find((l) => l.id === id);
  if (!listing) return mockFetch(undefined);
  return mockFetch({
    ...listing,
    status: computeListingStatus(id, state, nowMs),
  });
}

export async function getListingInventory(
  listingId: string
): Promise<InventoryPosition | undefined> {
  const state = freshState();
  return mockFetch(state.inventory.find((i) => i.listingId === listingId));
}

export async function getEvidenceByIds(
  ids: string[]
): Promise<EvidenceItem[]> {
  const idSet = new Set(ids);
  return mockFetch(mockEvidence.filter((e) => idSet.has(e.id)));
}

export async function getMyReservations(
  userId: string
): Promise<Reservation[]> {
  const state = freshState();
  return mockFetch(state.reservations.filter((r) => r.buyerUserId === userId));
}

export async function getMyOrders(userId: string): Promise<Order[]> {
  const state = freshState();
  return mockFetch(state.orders.filter((o) => o.buyerUserId === userId));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const state = freshState();
  return mockFetch(state.orders.find((o) => o.id === id));
}

/* ---------- SELLER-SIDE READ endpoints ---------- */

export async function getMyListings(userId: string): Promise<Listing[]> {
  const nowMs = Date.now();
  const state = freshState(nowMs);
  const myListings = state.listings
    .filter((l) => l.sellerUserId === userId)
    .map((l) => ({
      ...l,
      status: computeListingStatus(l.id, state, nowMs),
    }));
  return mockFetch(myListings);
}

export async function getListingEvidence(listingId: string): Promise<ListingEvidenceItem[]> {
  const state = freshState();
  return mockFetch(state.listingEvidence.filter((e) => e.listingId === listingId));
}

/* ---------- MUTATE endpoints ---------- */

export async function createReservation(input: {
  listingId: string;
  userId: string;
  weightOz: number;
}): Promise<Reservation> {
  // Capital control enforcement gate
  await checkCapitalControl("CREATE_RESERVATION");

  const nowMs = Date.now();
  const state = freshState(nowMs);
  const { next, reservation } = engineCreateReservation(
    state,
    {
      listingId: input.listingId,
      buyerUserId: input.userId,
      weightOz: input.weightOz,
    },
    nowMs
  );
  saveMarketplaceState(next);
  return mockFetch(reservation);
}

export async function convertReservationToOrder(input: {
  reservationId: string;
  userId: string;
  policySnapshot: import("./policy-engine").MarketplacePolicySnapshot;
}): Promise<Order> {
  // Capital control enforcement gate
  await checkCapitalControl("CONVERT_RESERVATION");

  const nowMs = Date.now();
  const state = freshState(nowMs);
  const { next, order } = engineConvertReservation(
    state,
    input.reservationId,
    input.userId,
    nowMs,
    input.policySnapshot,
  );
  saveMarketplaceState(next);
  return mockFetch(order);
}

export async function runReservationExpirySweep(input: {
  nowMs: number;
}): Promise<void> {
  const state = loadMarketplaceState();
  const next = expireReservations(state, input.nowMs);
  saveMarketplaceState(next);
  await mockFetch(undefined);
}

/* ---------- SELLER-SIDE MUTATE endpoints ---------- */

export async function apiCreateDraftListing(
  input: CreateDraftListingArgs,
): Promise<Listing> {
  const nowMs = Date.now();
  const state = freshState(nowMs);
  const { next, listing } = engineCreateDraftListing(state, input, nowMs);
  saveMarketplaceState(next);
  return mockFetch(listing);
}

export async function apiUpdateDraftListing(
  listingId: string,
  patch: Partial<Omit<Listing, "id" | "status" | "createdAt" | "publishedAt">>,
): Promise<Listing> {
  const state = freshState();
  const nextState = engineUpdateDraftListing(state, listingId, patch);
  saveMarketplaceState(nextState);
  const updated = nextState.listings.find((l) => l.id === listingId)!;
  return mockFetch(updated);
}

export async function apiCreateListingEvidence(input: {
  listingId: string;
  evidenceType: ListingEvidenceType;
  userId: string;
  /** Optional file buffer for document analysis (Textract). Only used for ASSAY_REPORT type. */
  fileBuffer?: Buffer;
}): Promise<ListingEvidenceItem> {
  const nowMs = Date.now();
  const state = freshState(nowMs);
  const { next, evidence } = engineCreateListingEvidence(
    state,
    input.listingId,
    input.evidenceType,
    input.userId,
    nowMs,
  );

  // If this is an assay report with a file buffer, run Textract analysis
  let enrichedEvidence = evidence;
  if (input.evidenceType === "ASSAY_REPORT" && input.fileBuffer) {
    try {
      const { analyzeAssayReport } = await import("./services/textract-service");
      const extractionResult = await analyzeAssayReport(input.fileBuffer);

      enrichedEvidence = {
        ...evidence,
        extractedMetadata: {
          extractedPurity: extractionResult.extractedPurity,
          rawPurityText: extractionResult.rawPurityText,
          extractedWeightOz: extractionResult.extractedWeightOz,
          rawWeightText: extractionResult.rawWeightText,
          extractedRefinerName: null, // TODO: populate via textract-adapter.ts refiner extraction
          rawRefinerText: null,
          analysisSucceeded: extractionResult.success,
          analysisError: extractionResult.error,
        },
      };

      console.log(
        `[AurumShield] Textract analysis for ${evidence.id}:`,
        JSON.stringify(enrichedEvidence.extractedMetadata, null, 2),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[AurumShield] Textract analysis failed for ${evidence.id}:`, errorMessage);

      // Still attach metadata with the error — don't block evidence creation
      enrichedEvidence = {
        ...evidence,
        extractedMetadata: {
          extractedPurity: null,
          rawPurityText: null,
          extractedWeightOz: null,
          rawWeightText: null,
          extractedRefinerName: null,
          rawRefinerText: null,
          analysisSucceeded: false,
          analysisError: errorMessage,
        },
      };
    }
  }

  // Persist state with enriched evidence (Textract metadata included)
  const nextWithMetadata = {
    ...next,
    listingEvidence: next.listingEvidence.map((e) =>
      e.id === enrichedEvidence.id ? enrichedEvidence : e,
    ),
  };
  saveMarketplaceState(nextWithMetadata);

  return mockFetch(enrichedEvidence);
}

export async function apiPublishListing(input: {
  listingId: string;
  userId: string;
}): Promise<{ listing: Listing; gateResult: GateResult }> {
  const nowMs = Date.now();
  const state = freshState(nowMs);

  // Correction #6: First check seller verification + evidence gate
  const { next, gateResult } = enginePublishListing(
    state,
    input.listingId,
    input.userId,
    nowMs,
  );

  // Then check capital controls — collect both sets of blockers
  let capitalBlockError: string | null = null;
  try {
    await checkCapitalControl("PUBLISH_LISTING");
  } catch (e: unknown) {
    capitalBlockError = e instanceof Error ? e.message : String(e);
  }

  // If both gates fail, combine errors
  if (!gateResult.allowed && capitalBlockError) {
    const combinedBlockers = [
      ...gateResult.blockers,
      `CAPITAL_CONTROL: ${capitalBlockError}`,
    ];
    return mockFetch({
      listing: state.listings.find((l) => l.id === input.listingId)!,
      gateResult: { ...gateResult, blockers: combinedBlockers },
    });
  }

  // Capital control blocks alone
  if (capitalBlockError) {
    return mockFetch({
      listing: state.listings.find((l) => l.id === input.listingId)!,
      gateResult: {
        allowed: false,
        blockers: [`CAPITAL_CONTROL: ${capitalBlockError}`],
        checks: gateResult.checks,
      },
    });
  }

  // Seller gate blocks alone (or both pass)
  if (gateResult.allowed) {
    saveMarketplaceState(next);
  }
  const listing = (gateResult.allowed ? next : state).listings.find(
    (l) => l.id === input.listingId,
  )!;
  return mockFetch({ listing, gateResult });
}

export async function apiRunPublishGate(input: {
  listingId: string;
  userId: string;
}): Promise<GateResult> {
  const state = freshState();
  const { runPublishGate } = await import("./marketplace-engine");
  const result = runPublishGate(state, input.listingId, input.userId);
  return mockFetch(result);
}


/* ================================================================
   AUTH API — Mock endpoints
   ================================================================ */

import type { User, Org } from "./mock-data";
import {
  findUserByEmail,
  getOrg,
  getCurrentUser,
} from "./auth-store";
import {
  loadVerificationCase,
} from "./verification-engine";

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export async function loginUser(email: string): Promise<LoginResult> {
  const user = findUserByEmail(email);
  if (!user) return mockFetch({ success: false, error: "No account found for this email address." });
  return mockFetch({ success: true, user });
}

export interface SignupResult {
  success: boolean;
  error?: string;
}

export async function signupUser(/* input handled in auth-provider */): Promise<SignupResult> {
  // Actual logic handled in auth-provider (synchronous localStorage ops)
  // This mock endpoint just simulates async delay
  return mockFetch({ success: true });
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const user = findUserByEmail(email);
  if (!user) {
    // Still return success to prevent email enumeration
    return mockFetch({ success: true, message: "If an account exists for this email, a reset link has been sent." });
  }
  return mockFetch({ success: true, message: "If an account exists for this email, a reset link has been sent." });
}

export async function getAccount(): Promise<{ user: User; org: Org } | null> {
  const user = getCurrentUser();
  if (!user) return mockFetch(null);
  const org = getOrg(user.orgId);
  if (!org) return mockFetch(null);
  return mockFetch({ user, org });
}

/* ================================================================
   VERIFICATION API — Mock endpoints
   ================================================================ */

import type { VerificationCase } from "./mock-data";

export async function getVerificationCaseApi(userId: string): Promise<VerificationCase | null> {
  const vc = loadVerificationCase(userId);
  return mockFetch(vc);
}

/* ================================================================
   SETTLEMENT API — Mock endpoints backed by localStorage
   ================================================================ */

import type {
  SettlementCase,
  LedgerEntry,
  Corridor,
  Hub,
  DashboardCapital,
  UserRole,
} from "./mock-data";
import {
  mockCorridors,
  mockHubs,
  mockCapitalPhase1,
} from "./mock-data";
import {
  openSettlementFromOrder as engineOpenSettlement,
  applySettlementAction as engineApplyAction,
  type SettlementActionPayload,
} from "./settlement-engine";
import {
  loadSettlementState,
  saveSettlementState,
} from "./settlement-store";
import {
  issueCertificate,
  getAllCertificates,
  getCertificateByNumber,
  getCertificateBySettlementId,
  type ClearingCertificate,
} from "./certificate-engine";

/* ---------- READ endpoints ---------- */

export async function getSettlements(): Promise<SettlementCase[]> {
  const state = loadSettlementState();
  return mockFetch(state.settlements);
}

export async function getSettlement(id: string): Promise<SettlementCase | undefined> {
  const state = loadSettlementState();
  return mockFetch(state.settlements.find((s) => s.id === id));
}

export async function getSettlementLedger(settlementId: string): Promise<LedgerEntry[]> {
  const state = loadSettlementState();
  return mockFetch(state.ledger.filter((e) => e.settlementId === settlementId));
}

export async function getSettlementByOrderId(orderId: string): Promise<SettlementCase | undefined> {
  const state = loadSettlementState();
  return mockFetch(state.settlements.find((s) => s.orderId === orderId));
}

/* ---------- MUTATE endpoints ---------- */

export async function apiOpenSettlementFromOrder(input: {
  orderId: string;
  now: string;
  actorRole: UserRole;
  actorUserId: string;
}): Promise<SettlementCase> {
  // Capital control enforcement gate
  await checkCapitalControl("OPEN_SETTLEMENT", input.actorRole, input.actorUserId);
  const mktState = freshState();
  const settlementState = loadSettlementState();

  const order = mktState.orders.find((o) => o.id === input.orderId);
  if (!order) throw new Error(`Order ${input.orderId} not found`);

  const listing = mktState.listings.find((l) => l.id === order.listingId);
  if (!listing) throw new Error(`Listing ${order.listingId} not found`);

  const inventory = mktState.inventory.find((i) => i.listingId === order.listingId);
  if (!inventory) throw new Error(`Inventory for listing ${order.listingId} not found`);

  const reservation = mktState.reservations.find((r) => r.id === order.reservationId) ?? null;

  // Determine corridor: match listing vault hub to a corridor
  const corridor: Corridor = mockCorridors.find((c) => c.id === (listing.vaultHubId === "hub-001" ? "cor-002" : listing.vaultHubId === "hub-002" ? "cor-002" : listing.vaultHubId === "hub-003" ? "cor-004" : listing.vaultHubId === "hub-004" ? "cor-001" : listing.vaultHubId === "hub-005" ? "cor-003" : "cor-005"))!;
  const hub: Hub = mockHubs.find((h) => h.id === corridor.id.replace("cor", "hub").replace("-001", "-001").replace("-002", "-001")) ?? mockHubs[0];
  const vaultHub: Hub = mockHubs.find((h) => h.id === listing.vaultHubId)!;

  const buyerOrgId = order.buyerUserId === "user-1" ? "org-001" : order.buyerUserId === "user-3" ? "org-003" : "org-004";
  const capital: DashboardCapital = mockCapitalPhase1;

  const { state: nextSettlementState, settlement } = engineOpenSettlement(
    settlementState,
    {
      now: input.now,
      order,
      listing,
      inventory,
      reservation,
      corridor,
      hub,
      vaultHub,
      capital,
      buyerOrgId,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    },
  );

  saveSettlementState(nextSettlementState);

  // Update order status to settlement_pending
  const mktOrders = mktState.orders.map((o) =>
    o.id === order.id ? { ...o, status: "settlement_pending" as const } : o,
  );
  saveMarketplaceState({ ...mktState, orders: mktOrders });

  return mockFetch(settlement);
}

export async function apiApplySettlementAction(input: {
  settlementId: string;
  payload: SettlementActionPayload;
  now: string;
}): Promise<{ settlement: SettlementCase; ledgerEntries: LedgerEntry[] }> {
  const settlementState = loadSettlementState();

  // Load verification case for the buyer if needed
  let vc: VerificationCase | null = null;
  const settlement = settlementState.settlements.find((s) => s.id === input.settlementId);
  if (settlement) {
    vc = loadVerificationCase(settlement.buyerUserId);
  }

  // Load corridor and hub for requirement checks
  const corridor = settlement ? mockCorridors.find((c) => c.id === settlement.corridorId) : undefined;
  const hub = settlement ? mockHubs.find((h) => h.id === settlement.hubId) : undefined;

  // Capital control enforcement: gate EXECUTE_DVP only
  // Correction #5: overrides bypass capital blocks only, not settlement state-machine correctness
  if (input.payload.action === "EXECUTE_DVP") {
    await checkCapitalControl("EXECUTE_DVP", input.payload.actorRole, input.payload.actorUserId);
  }

  const result = engineApplyAction(
    settlementState,
    input.settlementId,
    input.payload,
    input.now,
    vc,
    corridor,
    hub,
  );

  // Handle structured error results from the engine
  // Settlement state-machine correctness is NEVER bypassed by overrides
  if (!result.ok) {
    throw new Error(`[${result.code}] ${result.message}`);
  }

  saveSettlementState(result.state);

  // If settlement is now SETTLED, update order to completed + issue certificate
  if (result.settlement.status === "SETTLED") {
    const mktState = freshState();
    const mktOrders = mktState.orders.map((o) =>
      o.id === result.settlement.orderId ? { ...o, status: "completed" as const } : o,
    );
    saveMarketplaceState({ ...mktState, orders: mktOrders });

    // ── Certificate issuance (idempotent) ──
    if (input.payload.action === "EXECUTE_DVP") {
      try {
        // Find the DVP_EXECUTED ledger entry just created
        const dvpEntry = result.ledgerEntries.find(
          (e) => e.settlementId === input.settlementId && e.type === "DVP_EXECUTED",
        );
        if (dvpEntry) {
          // Resolve order and listing for certificate payload
          const freshMktState = freshState();
          const order = freshMktState.orders.find((o) => o.id === result.settlement.orderId);
          const listing = order
            ? freshMktState.listings.find((l) => l.id === order.listingId)
            : undefined;

          if (order && listing) {
            const cert = await issueCertificate({
              settlement: result.settlement,
              order,
              listing,
              dvpLedgerEntry: dvpEntry,
              now: input.now,
              escrowReleased: true, // DvP executed = escrow released atomically
            });

            // Idempotent audit event: CLEARING_CERTIFICATE_ISSUED
            const auditExplicitId = `CERT_ISSUED:${cert.certificateNumber}`;
            appendAuditEvent({
              occurredAt: input.now,
              actorRole: (input.payload.actorRole ?? "system") as AuditActorRole,
              actorUserId: input.payload.actorUserId ?? null,
              action: "CLEARING_CERTIFICATE_ISSUED",
              resourceType: "CERTIFICATE",
              resourceId: cert.certificateNumber,
              corridorId: result.settlement.corridorId,
              hubId: result.settlement.hubId,
              ip: null,
              userAgent: null,
              result: "SUCCESS",
              severity: "info",
              message: `Clearing certificate ${cert.certificateNumber} issued for settlement ${result.settlement.id}`,
              metadata: {
                certificateNumber: cert.certificateNumber,
                settlementId: result.settlement.id,
                orderId: result.settlement.orderId,
                signatureHash: cert.signatureHash,
                dvpLedgerEntryId: dvpEntry.id,
                notionalUsd: result.settlement.notionalUsd,
                weightOz: result.settlement.weightOz,
              },
            }, auditExplicitId);
          }
        }
      } catch (certErr) {
        // Certificate issuance failure should NOT block the settlement action
        console.error("[AurumShield] Certificate issuance failed:", certErr);
      }
    }
  }

  return mockFetch({ settlement: result.settlement, ledgerEntries: result.ledgerEntries });
}

/** Stub: logs structured JSON to console and returns the packet. */
export async function apiExportSettlementPacket(settlementId: string): Promise<{
  exported: boolean;
  packet: { settlement: SettlementCase; ledger: LedgerEntry[] } | null;
}> {
  const state = loadSettlementState();
  const settlement = state.settlements.find((s) => s.id === settlementId);
  if (!settlement) {
    return mockFetch({ exported: false, packet: null });
  }
  const ledger = state.ledger.filter((e) => e.settlementId === settlementId);
  const packet = { settlement, ledger };

  // TODO: In production, this would generate a signed PDF/JSON export
  console.log("[AurumShield] Settlement Packet Export:", JSON.stringify(packet, null, 2));

  // Audit instrumentation
  appendAuditEvent({
    occurredAt: new Date().toISOString(),
    actorRole: "admin",
    actorUserId: null,
    action: "EXPORT_REQUESTED",
    resourceType: "settlement",
    resourceId: settlementId,
    corridorId: settlement.corridorId,
    hubId: settlement.hubId,
    result: "SUCCESS",
    severity: "info",
    message: `Settlement packet export for ${settlementId}`,
    metadata: { format: "JSON", entryCount: ledger.length },
  });

  return mockFetch({ exported: true, packet });
}

/* ================================================================
   AUDIT API — Governance audit endpoints
   ================================================================ */

import type {
  GovernanceAuditEvent,
  AuditResourceType,
  AuditAction,
  AuditSeverity,
  AuditActorRole,
} from "./mock-data";
import { loadAuditState, appendAuditEvent } from "./audit-store";

/* ================================================================
   CERTIFICATE API — Clearing certificate read endpoints
   ================================================================ */

export async function apiGetCertificates(): Promise<ClearingCertificate[]> {
  return mockFetch(getAllCertificates());
}

export async function apiGetCertificate(certificateNumber: string): Promise<ClearingCertificate | undefined> {
  return mockFetch(getCertificateByNumber(certificateNumber));
}

export async function apiGetCertificateBySettlement(settlementId: string): Promise<ClearingCertificate | undefined> {
  return mockFetch(getCertificateBySettlementId(settlementId));
}

/* ================================================================
   FEE & ACTIVATION API — Clearing fee, payment, and activation
   
   Rules:
   1. FeeQuote is recalculated dynamically until paymentStatus === "paid"
   2. Once paid, FeeQuote becomes immutable (frozen=true)
   3. Admin pricing changes do NOT retroactively alter paid invoices
   4. Payment automatically attempts activation (Option A)
   5. Activation = paymentStatus==="paid" AND
      (approvalStatus==="approved" OR "not_required")
   ================================================================ */

/** Local helper — maps UserRole to LedgerEntry actor category. */
function roleToActor(role: UserRole): LedgerEntry["actor"] {
  switch (role) {
    case "compliance": return "COMPLIANCE";
    case "buyer": return "BUYER";
    case "seller": return "SELLER";
    default: return "OPS";
  }
}

import {
  type PricingConfig,
  type SelectedAddOn,
  type FeeQuote,
  computeFeeQuote,
  freezeFeeQuoteOnPayment,
  ADD_ON_CATALOG,
} from "./fees/fee-engine";
import {
  loadPricingConfig,
  savePricingConfig,
} from "./fees/pricing-store";

/* ---------- Pricing Config CRUD ---------- */

export async function apiGetPricingConfig(): Promise<PricingConfig> {
  return mockFetch(loadPricingConfig());
}

export async function apiSavePricingConfig(config: PricingConfig): Promise<PricingConfig> {
  savePricingConfig(config);
  return mockFetch(config);
}

/* ---------- Add-On Selection ---------- */

export async function apiSelectAddOns(input: {
  settlementId: string;
  addOns: SelectedAddOn[];
  now: string;
}): Promise<{ settlement: SettlementCase; feeQuote: FeeQuote }> {
  const state = loadSettlementState();
  const idx = state.settlements.findIndex((s) => s.id === input.settlementId);
  if (idx === -1) throw new Error(`Settlement ${input.settlementId} not found`);

  const settlement = { ...state.settlements[idx] };

  // Guard: cannot modify add-ons after payment
  if (settlement.paymentStatus === "paid") {
    throw new Error("Cannot modify add-ons after payment — fee quote is frozen");
  }

  // Validate add-on codes exist in catalog
  const config = loadPricingConfig();
  for (const addOn of input.addOns) {
    const entry = ADD_ON_CATALOG.find((c) => c.code === addOn.code);
    if (!entry) throw new Error(`Unknown add-on code: ${addOn.code}`);
    const override = config.addOnOverrides[addOn.code];
    if (override && !override.enabled) throw new Error(`Add-on ${addOn.code} is disabled by admin`);
  }

  settlement.selectedAddOns = input.addOns;

  // Recalculate fee quote with current pricing config
  const result = computeFeeQuote({
    notionalCents: settlement.notionalCents,
    selectedAddOns: input.addOns,
    config,
    now: input.now,
  });

  settlement.feeQuote = result.feeQuote;

  // Determine manual approval status (revision #4)
  settlement.requiresManualApproval = result.requiresManualApproval;
  if (result.requiresManualApproval) {
    settlement.approvalStatus = "pending";
  } else {
    settlement.approvalStatus = "not_required";
  }

  // If anything is selected, move to awaiting_payment if still draft
  if (settlement.activationStatus === "draft") {
    settlement.activationStatus = "awaiting_payment";
  }

  settlement.updatedAt = input.now;

  // Persist
  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;

  // Add ledger entry for add-on selection
  const addOnLabels = input.addOns.map(
    (a) => ADD_ON_CATALOG.find((c) => c.code === a.code)?.label ?? a.code,
  );
  const ledgerEntry: LedgerEntry = {
    id: `le-fee-${Date.now()}`,
    settlementId: settlement.id,
    type: "STATUS_CHANGED",
    timestamp: input.now,
    actor: "OPS",
    actorRole: "admin",
    actorUserId: "system",
    detail: `Add-ons configured: ${addOnLabels.join(", ") || "None"} — Fee recalculated to $${(result.feeQuote.totalDueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
  };

  saveSettlementState({
    settlements: newSettlements,
    ledger: [...state.ledger, ledgerEntry],
  });

  return mockFetch({ settlement, feeQuote: result.feeQuote });
}

/* ---------- Mock Payment Processing ---------- */

function generatePaymentReference(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
  return `AS-PAY-${year}-${seq}`;
}

export async function apiProcessPayment(input: {
  settlementId: string;
  method: "mock_card" | "wire_mock" | "invoice_mock";
  now: string;
  actorUserId: string;
}): Promise<{ settlement: SettlementCase; activated: boolean }> {
  const state = loadSettlementState();
  const idx = state.settlements.findIndex((s) => s.id === input.settlementId);
  if (idx === -1) throw new Error(`Settlement ${input.settlementId} not found`);

  const settlement = { ...state.settlements[idx] };

  // Guard: cannot pay twice
  if (settlement.paymentStatus === "paid") {
    throw new Error("Payment already processed for this settlement");
  }

  // Guard: fee quote must exist
  if (!settlement.feeQuote) {
    // Compute one with current config if no add-ons selected yet
    const config = loadPricingConfig();
    const result = computeFeeQuote({
      notionalCents: settlement.notionalCents,
      selectedAddOns: settlement.selectedAddOns,
      config,
      now: input.now,
    });
    settlement.feeQuote = result.feeQuote;
    settlement.requiresManualApproval = result.requiresManualApproval;
    settlement.approvalStatus = result.requiresManualApproval ? "pending" : "not_required";
  }

  // Freeze fee quote on payment (revision #1 / #7)
  settlement.feeQuote = freezeFeeQuoteOnPayment(settlement.feeQuote);

  // Process payment
  settlement.paymentStatus = "paid";
  settlement.paymentMethod = input.method;
  settlement.paymentReceipt = {
    id: `pay-${Date.now()}`,
    paidAtUtc: input.now,
    reference: generatePaymentReference(),
  };

  // Option A (revision #5): automatically attempt activation after payment
  let activated = false;
  const approvalSatisfied =
    settlement.approvalStatus === "approved" ||
    settlement.approvalStatus === "not_required";

  if (approvalSatisfied) {
    settlement.activationStatus = "activated";
    settlement.activatedAtUtc = input.now;
    activated = true;
  } else {
    // Payment received but approval still pending — stays awaiting
    settlement.activationStatus = "awaiting_payment";
  }

  settlement.updatedAt = input.now;

  // Persist
  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;

  // Ledger entries
  const newLedger = [...state.ledger];

  newLedger.push({
    id: `le-pay-${Date.now()}`,
    settlementId: settlement.id,
    type: "STATUS_CHANGED",
    timestamp: input.now,
    actor: "OPS",
    actorRole: "admin",
    actorUserId: input.actorUserId,
    detail: `Payment processed — ${input.method.replace(/_/g, " ")} — $${(settlement.feeQuote.totalDueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} — Ref: ${settlement.paymentReceipt!.reference}`,
  });

  if (activated) {
    newLedger.push({
      id: `le-act-${Date.now()}`,
      settlementId: settlement.id,
      type: "STATUS_CHANGED",
      timestamp: input.now,
      actor: "SYSTEM",
      actorRole: "admin",
      actorUserId: "system",
      detail: `Clearing activated — all gates satisfied (payment: paid, approval: ${settlement.approvalStatus})`,
    });
  }

  saveSettlementState({ settlements: newSettlements, ledger: newLedger });

  // Audit
  appendAuditEvent({
    occurredAt: input.now,
    actorRole: "admin",
    actorUserId: input.actorUserId,
    action: "PAYMENT_PROCESSED",
    resourceType: "settlement",
    resourceId: settlement.id,
    result: "SUCCESS",
    severity: "info",
    message: `Payment ${settlement.paymentReceipt!.reference} processed for ${settlement.id} via ${input.method}`,
    metadata: {
      paymentMethod: input.method,
      totalCents: settlement.feeQuote.totalDueCents,
      reference: settlement.paymentReceipt!.reference,
      activated,
    },
  });

  return mockFetch({ settlement, activated });
}

/* ---------- Manual Approval ---------- */

export async function apiApproveManualReview(input: {
  settlementId: string;
  now: string;
  actorRole: UserRole;
  actorUserId: string;
}): Promise<{ settlement: SettlementCase; activated: boolean }> {
  const state = loadSettlementState();
  const idx = state.settlements.findIndex((s) => s.id === input.settlementId);
  if (idx === -1) throw new Error(`Settlement ${input.settlementId} not found`);

  const settlement = { ...state.settlements[idx] };

  if (!settlement.requiresManualApproval) {
    throw new Error("This settlement does not require manual approval");
  }
  if (settlement.approvalStatus !== "pending") {
    throw new Error(`Cannot approve — current status is ${settlement.approvalStatus}`);
  }

  settlement.approvalStatus = "approved";
  settlement.updatedAt = input.now;

  // If payment is already done, auto-activate
  let activated = false;
  if (settlement.paymentStatus === "paid") {
    settlement.activationStatus = "activated";
    settlement.activatedAtUtc = input.now;
    activated = true;
  }

  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;

  const newLedger = [...state.ledger];
  newLedger.push({
    id: `le-appr-${Date.now()}`,
    settlementId: settlement.id,
    type: "STATUS_CHANGED",
    timestamp: input.now,
    actor: roleToActor(input.actorRole),
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    detail: `Manual review approved by ${input.actorRole}${activated ? " — clearing activated" : ""}`,
  });

  saveSettlementState({ settlements: newSettlements, ledger: newLedger });

  return mockFetch({ settlement, activated });
}

export async function apiRejectManualReview(input: {
  settlementId: string;
  reason: string;
  now: string;
  actorRole: UserRole;
  actorUserId: string;
}): Promise<SettlementCase> {
  const state = loadSettlementState();
  const idx = state.settlements.findIndex((s) => s.id === input.settlementId);
  if (idx === -1) throw new Error(`Settlement ${input.settlementId} not found`);

  const settlement = { ...state.settlements[idx] };

  if (settlement.approvalStatus !== "pending") {
    throw new Error(`Cannot reject — current status is ${settlement.approvalStatus}`);
  }

  settlement.approvalStatus = "rejected";
  settlement.updatedAt = input.now;

  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;

  const newLedger = [...state.ledger];
  newLedger.push({
    id: `le-rej-${Date.now()}`,
    settlementId: settlement.id,
    type: "STATUS_CHANGED",
    timestamp: input.now,
    actor: roleToActor(input.actorRole),
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    detail: `Manual review rejected — ${input.reason}`,
  });

  saveSettlementState({ settlements: newSettlements, ledger: newLedger });

  return mockFetch(settlement);
}

/* ---------- Recalculate Fee Quote (explicit refresh) ---------- */

export async function apiRecalculateFeeQuote(input: {
  settlementId: string;
  now: string;
}): Promise<{ settlement: SettlementCase; feeQuote: FeeQuote }> {
  const state = loadSettlementState();
  const idx = state.settlements.findIndex((s) => s.id === input.settlementId);
  if (idx === -1) throw new Error(`Settlement ${input.settlementId} not found`);

  const settlement = { ...state.settlements[idx] };

  // Guard: frozen quotes are immutable
  if (settlement.feeQuote?.frozen) {
    return mockFetch({ settlement, feeQuote: settlement.feeQuote });
  }

  const config = loadPricingConfig();
  const result = computeFeeQuote({
    notionalCents: settlement.notionalCents,
    selectedAddOns: settlement.selectedAddOns,
    config,
    now: input.now,
  });

  settlement.feeQuote = result.feeQuote;
  settlement.requiresManualApproval = result.requiresManualApproval;
  settlement.approvalStatus = result.requiresManualApproval ? "pending" : "not_required";
  settlement.updatedAt = input.now;

  const newSettlements = [...state.settlements];
  newSettlements[idx] = settlement;
  saveSettlementState({ ...state, settlements: newSettlements });

  return mockFetch({ settlement, feeQuote: result.feeQuote });
}


export interface AuditEventFilters {
  startDate?: string;
  endDate?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorRole?: AuditActorRole;
  result?: "SUCCESS" | "DENIED" | "ERROR";
  search?: string;
}

export async function apiGetAuditEvents(filters: AuditEventFilters = {}): Promise<GovernanceAuditEvent[]> {
  const state = loadAuditState();
  let events = [...state.events];

  if (filters.startDate) {
    events = events.filter((e) => e.occurredAt >= filters.startDate!);
  }
  if (filters.endDate) {
    events = events.filter((e) => e.occurredAt <= filters.endDate!);
  }
  if (filters.action) {
    events = events.filter((e) => e.action === filters.action);
  }
  if (filters.severity) {
    events = events.filter((e) => e.severity === filters.severity);
  }
  if (filters.resourceType) {
    events = events.filter((e) => e.resourceType === filters.resourceType);
  }
  if (filters.resourceId) {
    events = events.filter((e) => e.resourceId === filters.resourceId);
  }
  if (filters.actorRole) {
    events = events.filter((e) => e.actorRole === filters.actorRole);
  }
  if (filters.result) {
    events = events.filter((e) => e.result === filters.result);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    events = events.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.resourceId.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q),
    );
  }

  // Sort newest first
  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return mockFetch(events);
}

export async function apiGetAuditEvent(id: string): Promise<GovernanceAuditEvent | undefined> {
  const state = loadAuditState();
  return mockFetch(state.events.find((e) => e.id === id));
}

/** Stub: generates CSV string and logs to console */
export async function apiExportAuditCSV(filters: AuditEventFilters = {}): Promise<{ csv: string; count: number }> {
  const events = await apiGetAuditEvents(filters);
  const header = "id,occurredAt,actorRole,actorUserId,action,resourceType,resourceId,result,severity,message";
  const rows = events.map((e) =>
    `"${e.id}","${e.occurredAt}","${e.actorRole}","${e.actorUserId ?? ""}","${e.action}","${e.resourceType}","${e.resourceId}","${e.result}","${e.severity}","${e.message.replace(/"/g, '""')}"`,
  );
  const csv = [header, ...rows].join("\n");
  console.log("[AurumShield] Audit CSV Export:", csv.slice(0, 500) + "...");
  return { csv, count: events.length };
}

/** Stub: collects all audit events for a specific resource + settlement/ledger data */
export async function apiExportAuditPacket(
  resourceType: AuditResourceType,
  resourceId: string,
): Promise<{ events: GovernanceAuditEvent[]; exported: boolean }> {
  const allEvents = await apiGetAuditEvents({ resourceType, resourceId });
  console.log("[AurumShield] Audit Packet Export:", JSON.stringify({ resourceType, resourceId, eventCount: allEvents.length }));
  return { events: allEvents, exported: true };
}

export interface LedgerIndexEntry {
  settlementId: string;
  orderId: string;
  status: string;
  entryCount: number;
  lastEntryAt: string;
  notionalUsd: number;
  weightOz: number;
}

/** Returns a summary index of all settlements with ledger entry counts */
export async function apiGetLedgerIndex(): Promise<LedgerIndexEntry[]> {
  const state = loadSettlementState();
  const index: LedgerIndexEntry[] = state.settlements.map((s) => {
    const entries = state.ledger.filter((e) => e.settlementId === s.id);
    const lastEntry = entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return {
      settlementId: s.id,
      orderId: s.orderId,
      status: s.status,
      entryCount: entries.length,
      lastEntryAt: lastEntry?.timestamp ?? s.openedAt,
      notionalUsd: s.notionalUsd,
      weightOz: s.weightOz,
    };
  });
  return mockFetch(index);
}

export interface ReceiptIndexEntry {
  orderId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  weightOz: number;
  notional: number;
  status: string;
  hasReceipt: boolean;
  settlementId: string | null;
}

/** Returns an index of orders with receipt availability */
export async function apiGetReceiptIndex(): Promise<ReceiptIndexEntry[]> {
  const mktState = freshState();
  const settlementState = loadSettlementState();

  const index: ReceiptIndexEntry[] = mktState.orders.map((o) => {
    const settlement = settlementState.settlements.find((s) => s.orderId === o.id);
    return {
      orderId: o.id,
      listingId: o.listingId,
      buyerUserId: o.buyerUserId,
      sellerUserId: o.sellerUserId,
      weightOz: o.weightOz,
      notional: o.notional,
      status: o.status,
      hasReceipt: o.status === "completed" || settlement?.status === "SETTLED",
      settlementId: settlement?.id ?? null,
    };
  });
  return mockFetch(index);
}

/* ================================================================
   INTRADAY CAPITAL API — Capital engine + breach monitor
   Uses canonical snapshot helper to prevent drift.
   ================================================================ */

import {
  type IntradayCapitalSnapshot,
} from "./capital-engine";
import { evaluateBreachEvents, type BreachEvent } from "./breach-monitor";
import { loadBreachState } from "./breach-store";

/** Compute a live intraday capital snapshot from canonical source. */
export async function apiGetIntradayCapitalSnapshot(): Promise<IntradayCapitalSnapshot> {
  const snapshot = getCanonicalCapitalSnapshot(new Date().toISOString());
  return mockFetch(snapshot);
}

/** Return all stored breach events (newest first). */
export async function apiGetBreachEvents(): Promise<BreachEvent[]> {
  const state = loadBreachState();
  const sorted = [...state.events].sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt),
  );
  return mockFetch(sorted);
}

/**
 * Run a breach sweep:
 * 1. Compute intraday snapshot (canonical)
 * 2. Evaluate against existing breach events
 * 3. Append new events (idempotent — deduped by deterministic ID)
 * 4. Append audit events for each new breach
 */
export async function apiRunBreachSweep(): Promise<{
  snapshot: IntradayCapitalSnapshot;
  newEvents: BreachEvent[];
  allEvents: BreachEvent[];
}> {
  const snapshot = getCanonicalCapitalSnapshot(new Date().toISOString());
  const existingEvents = loadBreachState().events;
  const newEvents = evaluateBreachEvents(snapshot, existingEvents);
  const allEvents = loadBreachState().events;
  return mockFetch({ snapshot, newEvents, allEvents });
}

/** Export intraday packet — logs structured payload to console. */
export async function apiExportIntradayPacket(): Promise<{
  exported: boolean;
  packet: {
    packetVersion: number;
    generatedAt: string;
    intradaySnapshot: IntradayCapitalSnapshot;
    breachEvents: BreachEvent[];
    topDrivers: IntradayCapitalSnapshot["topDrivers"];
    auditEventIds: string[];
  };
}> {
  const snapshot = getCanonicalCapitalSnapshot(new Date().toISOString());
  const breachEvents = loadBreachState().events;
  const auditState = loadAuditState();
  const auditEventIds = auditState.events
    .filter((e) => e.action === "CAPITAL_BREACH_DETECTED")
    .map((e) => e.id);

  const packet = {
    packetVersion: 1,
    generatedAt: new Date().toISOString(),
    intradaySnapshot: snapshot,
    breachEvents,
    topDrivers: snapshot.topDrivers,
    auditEventIds,
  };

  // TODO: In production, this would generate a signed PDF/JSON export
  console.log(
    "[AurumShield] Intraday Capital Packet Export:",
    JSON.stringify(packet, null, 2),
  );

  return mockFetch({ exported: true, packet });
}

/* ================================================================
   CAPITAL CONTROL ENFORCEMENT — API-level gate
   ================================================================ */

/**
 * FNV-1a hash for deterministic audit event IDs.
 * Scoped to this module to avoid collisions with other hash functions.
 */
function controlFnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * API-level enforcement gate:
 * 1. Compute canonical CapitalControlDecision
 * 2. Check blocks[actionKey]
 * 3. Check active overrides
 * 4. If blocked (no override): append CAPITAL_CONTROL_BLOCKED audit event (idempotent)
 * 5. If override exists: allow through, record in audit
 */
async function checkCapitalControl(
  actionKey: ControlActionKey,
  actorRole?: UserRole,
  actorUserId?: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { decision } = getCanonicalControlDecision(nowIso);

  // Not blocked? Pass through.
  if (!decision.blocks[actionKey]) return;

  // Check for active override
  const ov = isActionOverridden(actionKey, nowIso);
  if (ov.overridden) return; // Override allows action through

  // Blocked — emit idempotent audit event
  const minuteBucket = nowIso.slice(0, 16);
  const dedupKey = `${actionKey}-${decision.mode}-${minuteBucket}-${actorUserId ?? "anon"}`;
  const eventId = `CC-BLOCK-${controlFnv1a(dedupKey)}`;

  appendAuditEvent({
    occurredAt: nowIso,
    actorRole: (actorRole ?? "system") as AuditActorRole,
    actorUserId: actorUserId ?? null,
    action: "CAPITAL_CONTROL_BLOCKED",
    resourceType: "CAPITAL",
    resourceId: actionKey,
    ip: null,
    userAgent: null,
    result: "DENIED",
    severity: decision.mode === "EMERGENCY_HALT" ? "critical" : "warning",
    message: `Action ${actionKey} blocked by capital control mode ${decision.mode}`,
    metadata: {
      actionKey,
      mode: decision.mode,
      snapshotHash: decision.snapshotHash,
      reasons: decision.reasons.join("; "),
      overrideApplied: false,
    },
  }, eventId);

  throw new Error(
    `[CAPITAL_CONTROL] Action ${actionKey} is blocked under mode ${decision.mode}. ` +
    `Reasons: ${decision.reasons.join("; ")}`,
  );
}

/* ================================================================
   CAPITAL CONTROLS API — Query + Mutation endpoints
   ================================================================ */

/** Get current capital control decision from canonical snapshot. */
export async function apiGetCapitalControls(): Promise<CapitalControlDecision> {
  const nowIso = new Date().toISOString();
  const { decision } = getCanonicalControlDecision(nowIso);
  return mockFetch(decision);
}

/** Get all capital overrides (expired ones are auto-expired). */
export async function apiGetCapitalOverrides(): Promise<CapitalOverride[]> {
  const nowIso = new Date().toISOString();
  const overrides = expireOverrides(nowIso);
  return mockFetch(overrides);
}

/** Create a capital control override with full validation. */
export async function apiCreateCapitalOverride(input: {
  scope: OverrideScope;
  actionKey: ControlActionKey | null;
  reason: string;
  expiresAt: string;
  actorRole: UserRole;
  actorUserId: string;
  actorName: string;
}): Promise<{ override: CapitalOverride; isNew: boolean }> {
  const nowIso = new Date().toISOString();
  const { decision } = getCanonicalControlDecision(nowIso);

  // Validate request
  const validation = validateOverrideRequest(
    input.scope,
    input.actionKey,
    input.reason,
    input.actorRole,
    decision.mode,
  );
  if (!validation.valid) {
    throw new Error(`[OVERRIDE_VALIDATION] ${validation.errors.join("; ")}`);
  }

  const createInput: CreateOverrideInput = {
    scope: input.scope,
    actionKey: input.actionKey,
    reason: input.reason,
    expiresAt: input.expiresAt,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    snapshotHash: decision.snapshotHash,
    modeAtCreation: decision.mode,
  };

  const result = createOverride(createInput);

  // Emit audit event (idempotent by override ID)
  if (result.isNew) {
    appendAuditEvent({
      occurredAt: nowIso,
      actorRole: input.actorRole as AuditActorRole,
      actorUserId: input.actorUserId,
      action: "CAPITAL_OVERRIDE_CREATED",
      resourceType: "CAPITAL",
      resourceId: result.override.id,
      ip: null,
      userAgent: null,
      result: "SUCCESS",
      severity: "warning",
      message: `Override ${result.override.id} created: scope=${input.scope} action=${input.actionKey ?? "ALL"} mode=${decision.mode}`,
      metadata: {
        overrideId: result.override.id,
        scope: input.scope,
        actionKey: input.actionKey ?? "ALL",
        reason: input.reason.slice(0, 100),
        modeAtCreation: decision.mode,
        snapshotHash: decision.snapshotHash,
        expiresAt: input.expiresAt,
      },
    }, `CC-OVR-C-${controlFnv1a(result.override.id)}`);
  }

  return mockFetch(result);
}

/** Revoke a capital control override. */
export async function apiRevokeCapitalOverride(input: {
  overrideId: string;
  actorRole: UserRole;
  actorUserId: string;
}): Promise<CapitalOverride | null> {
  const revoked = storeRevokeOverride(input.overrideId);
  if (!revoked) return mockFetch(null);

  const nowIso = new Date().toISOString();

  appendAuditEvent({
    occurredAt: nowIso,
    actorRole: input.actorRole as AuditActorRole,
    actorUserId: input.actorUserId,
    action: "CAPITAL_OVERRIDE_REVOKED",
    resourceType: "CAPITAL",
    resourceId: input.overrideId,
    ip: null,
    userAgent: null,
    result: "SUCCESS",
    severity: "info",
    message: `Override ${input.overrideId} revoked by ${input.actorRole}`,
    metadata: {
      overrideId: input.overrideId,
      revokedBy: input.actorUserId,
    },
  }, `CC-OVR-R-${controlFnv1a(input.overrideId + nowIso.slice(0, 16))}`);

  return mockFetch(revoked);
}

/** Run capital controls sweep — recompute, expire overrides, audit if mode changes. */
export async function apiRunCapitalControlsSweep(): Promise<{
  decision: CapitalControlDecision;
  overrides: CapitalOverride[];
  previousMode: string | null;
}> {
  const nowIso = new Date().toISOString();

  // Get previous decision for change detection
  // We use a stored "last known mode" to detect changes
  let previousMode: string | null = null;
  try {
    if (typeof window !== "undefined") {
      previousMode = localStorage.getItem("aurumshield:last-control-mode");
    }
  } catch { /* SSR safe */ }

  const { snapshot, decision, breachEvents } = getCanonicalControlDecision(nowIso);
  const overrides = expireOverrides(nowIso);

  // Detect mode change and emit audit event
  if (previousMode !== null && previousMode !== decision.mode) {
    const dedupKey = `${previousMode}-${decision.mode}-${decision.snapshotHash}`;
    const eventId = `CC-MODE-${controlFnv1a(dedupKey)}`;

    appendAuditEvent({
      occurredAt: nowIso,
      actorRole: "system",
      actorUserId: null,
      action: "CAPITAL_CONTROL_MODE_CHANGED",
      resourceType: "CAPITAL",
      resourceId: decision.mode,
      ip: null,
      userAgent: null,
      result: "SUCCESS",
      severity: decision.mode === "EMERGENCY_HALT" ? "critical" : decision.mode === "NORMAL" ? "info" : "warning",
      message: `Control mode changed: ${previousMode} → ${decision.mode}`,
      metadata: {
        previousMode,
        newMode: decision.mode,
        snapshotHash: decision.snapshotHash,
        breachEventIds: breachEvents.slice(0, 10).map((e) => e.id).join(","),
        reasons: decision.reasons.join("; "),
        ecr: snapshot.ecr,
        hardstopUtilization: snapshot.hardstopUtilization,
      },
    }, eventId);
  }

  // Persist last known mode
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("aurumshield:last-control-mode", decision.mode);
    }
  } catch { /* SSR safe */ }

  return mockFetch({ decision, overrides, previousMode });
}

/** Export capital controls packet — committee-grade structured JSON. */
export async function apiExportCapitalControlsPacket(): Promise<{
  exported: boolean;
  packet: {
    packetVersion: number;
    generatedAt: string;
    snapshot: IntradayCapitalSnapshot;
    breachEvents: BreachEvent[];
    controlDecision: CapitalControlDecision;
    overrides: CapitalOverride[];
    auditEventIds: string[];
  };
}> {
  const nowIso = new Date().toISOString();
  const { snapshot, decision, breachEvents } = getCanonicalControlDecision(nowIso);

  // Last 24h breach events
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent24hBreachEvents = breachEvents.filter((e) => e.occurredAt >= cutoff24h);

  // Overrides: active + last 10 expired/revoked
  const allOverrides = expireOverrides(nowIso);
  const active = allOverrides.filter((o) => o.status === "ACTIVE");
  const inactive = allOverrides
    .filter((o) => o.status !== "ACTIVE")
    .sort((a, b) => (b.revokedAt ?? b.expiresAt).localeCompare(a.revokedAt ?? a.expiresAt))
    .slice(0, 10);
  const exportOverrides = [...active, ...inactive];

  // Capital-related audit event IDs
  const auditState = loadAuditState();
  const capitalAuditActions: AuditAction[] = [
    "CAPITAL_BREACH_DETECTED",
    "CAPITAL_CONTROL_MODE_CHANGED",
    "CAPITAL_CONTROL_BLOCKED",
    "CAPITAL_OVERRIDE_CREATED",
    "CAPITAL_OVERRIDE_REVOKED",
  ];
  const auditEventIds = auditState.events
    .filter((e) => capitalAuditActions.includes(e.action))
    .map((e) => e.id);

  const packet = {
    packetVersion: 2,
    generatedAt: nowIso,
    snapshot,
    breachEvents: recent24hBreachEvents,
    controlDecision: decision,
    overrides: exportOverrides,
    auditEventIds,
  };

  console.log(
    "[AurumShield] Capital Controls Packet Export:",
    JSON.stringify(packet, null, 2),
  );

  return mockFetch({ exported: true, packet });
}

/* ================================================================
   DELIVERY API — Brink's Global Services integration
   Mock endpoints for rate quoting, preference saving,
   and shipment tracking.
   ================================================================ */

import type {
  DeliveryAddress,
  DeliveryMethod,
  DeliveryRateQuote,
  Shipment,
  DeliveryPreference,
} from "./delivery/delivery-types";
import {
  fetchDeliveryRate as bgsFetchRate,
  createShipment as bgsCreateShipment,
} from "./delivery/brinks-service";
import {
  saveDeliveryPreference as storeSavePref,
  getDeliveryPreference as storeGetPref,
  getShipmentBySettlement,
  saveShipment,
  advanceShipment as storeAdvanceShipment,
} from "./delivery/delivery-store";

/** Fetch a BGS delivery rate quote for the given address + weight + notional. */
export async function apiGetDeliveryRate(input: {
  address: DeliveryAddress;
  weightOz: number;
  notionalUsd: number;
}): Promise<DeliveryRateQuote> {
  const quote = await bgsFetchRate(input.address, input.weightOz, input.notionalUsd);
  return mockFetch(quote, { minDelay: 100, maxDelay: 200 });
}

/** Save the buyer's delivery preference for a settlement. */
export async function apiSubmitDeliveryPreference(input: {
  settlementId: string;
  method: DeliveryMethod;
  address?: DeliveryAddress;
  rateQuote?: DeliveryRateQuote;
}): Promise<DeliveryPreference> {
  const pref = storeSavePref(input.settlementId, input.method, input.address, input.rateQuote);
  return mockFetch(pref);
}

/** Get delivery preference for a settlement. */
export async function apiGetDeliveryPreference(
  settlementId: string,
): Promise<DeliveryPreference | null> {
  const pref = storeGetPref(settlementId);
  return mockFetch(pref ?? null);
}

/** Get shipment for a settlement (if one exists). */
export async function apiGetShipmentForSettlement(
  settlementId: string,
): Promise<Shipment | null> {
  const shipment = getShipmentBySettlement(settlementId);
  return mockFetch(shipment ?? null);
}

/** Create a shipment for a settled order. */
export async function apiCreateShipment(input: {
  settlementId: string;
  orderId: string;
  address: DeliveryAddress;
  rateQuote: DeliveryRateQuote;
}): Promise<Shipment> {
  const shipment = await bgsCreateShipment(
    input.settlementId,
    input.orderId,
    input.address,
    input.rateQuote,
  );
  saveShipment(shipment);
  return mockFetch(shipment);
}

/** Advance shipment to next status (demo helper). */
export async function apiAdvanceShipment(
  shipmentId: string,
): Promise<Shipment | null> {
  const advanced = storeAdvanceShipment(shipmentId);
  return mockFetch(advanced ?? null);
}

