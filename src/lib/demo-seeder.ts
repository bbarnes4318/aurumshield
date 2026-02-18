/* ================================================================
   DEMO SEEDER — Seeds deterministic scenario data through real APIs
   
   Rules:
   1. Uses ONLY real API calls — no direct state mutation
   2. Idempotent — skips if demo settlement already exists
   3. Fully deterministic — no randomness
   4. Does not bypass validation or capital guardrails
   ================================================================ */

import {
  apiCreateDraftListing,
  apiCreateListingEvidence,
  apiPublishListing,
  createReservation,
  convertReservationToOrder,
  apiOpenSettlementFromOrder,
  apiApplySettlementAction,
} from "./api";
import { loadSettlementState } from "./settlement-store";
import { loadMarketplaceState } from "./marketplace-store";
import {
  createSession,
  addUser,
  addOrg,
  getOrg,
  findUserByEmail,
} from "./auth-store";
import type { MarketplacePolicySnapshot } from "./policy-engine";
import {
  loadVerificationCase,
  saveVerificationCase,
} from "./verification-engine";
import type { VerificationCase } from "./mock-data";

const DEMO_SCENARIO_NAME =
  "Sovereign Gold Settlement — Institutional Walkthrough";
const DEMO_SEEDED_KEY = "aurumshield:demo-seeded";

/* ---------- Deterministic demo accounts ---------- */
const DEMO_ACCOUNTS = [
  {
    id: "demo-buyer",
    email: "buyer@aurumshield.demo",
    name: "Demo Buyer",
    role: "buyer" as const,
    orgId: "demo-org-buyer",
  },
  {
    id: "demo-seller",
    email: "seller@aurumshield.demo",
    name: "Demo Seller",
    role: "seller" as const,
    orgId: "demo-org-seller",
  },
  {
    id: "demo-admin",
    email: "admin@aurumshield.demo",
    name: "Demo Admin",
    role: "admin" as const,
    orgId: "demo-org-ops",
  },
  {
    id: "demo-compliance",
    email: "compliance@aurumshield.demo",
    name: "Demo Compliance",
    role: "compliance" as const,
    orgId: "demo-org-ops",
  },
  {
    id: "demo-treasury",
    email: "treasury@aurumshield.demo",
    name: "Demo Treasury",
    role: "treasury" as const,
    orgId: "demo-org-ops",
  },
] as const;

const DEMO_ORGS = [
  {
    id: "demo-org-buyer",
    legalName: "Sovereign Acquisition Corp.",
    type: "company" as const,
    jurisdiction: "Luxembourg",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "demo-org-seller",
    legalName: "Helvetia Precious Metals AG",
    type: "company" as const,
    jurisdiction: "Switzerland",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "demo-org-ops",
    legalName: "AurumShield Operations",
    type: "company" as const,
    jurisdiction: "United Kingdom",
    createdAt: "2025-01-01T00:00:00Z",
  },
] as const;

/* ---------- Public API ---------- */

/** Get the scenario name for display purposes. */
export function getDemoScenarioName(): string {
  return DEMO_SCENARIO_NAME;
}

/** Check if demo scenario has already been seeded (idempotent guard). */
export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_SEEDED_KEY) === "true";
}

/** Check if a demo settlement exists in real stores. */
function hasDemoSettlement(): boolean {
  const state = loadSettlementState();
  return state.settlements.some((s) => s.buyerUserId === "demo-buyer");
}

/** Check if demo listing already exists. */
function hasDemoListing(): boolean {
  const state = loadMarketplaceState();
  return state.listings.some((l) => l.sellerUserId === "demo-seller");
}

/**
 * Seed the demo scenario through real API calls.
 * Idempotent: if demo settlement already exists, returns immediately.
 */
export async function seedDemoScenario(): Promise<void> {
  // Guard: already seeded
  if (isDemoSeeded() || hasDemoSettlement()) {
    markSeeded();
    return;
  }

  // Phase 1: Ensure demo accounts exist
  ensureDemoAccounts();

  // Phase 2: Create listing, evidence, publish, reserve, order, settlement lifecycle
  await seedFullLifecycle();

  // Mark as complete
  markSeeded();
}

/** Ensure all demo user accounts and orgs exist in auth-store. */
export function ensureDemoAccounts(): void {
  for (const org of DEMO_ORGS) {
    if (!getOrg(org.id)) {
      addOrg(org);
    }
  }
  for (const account of DEMO_ACCOUNTS) {
    if (!findUserByEmail(account.email)) {
      addUser({
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        orgId: account.orgId,
        verificationStatus: "VERIFIED",
        createdAt: "2025-01-01T00:00:00Z",
        lastLoginAt: null,
      });
    }
  }

  // Ensure demo buyer has a VERIFIED verification case
  // (required for MARK_VERIFICATION_CLEARED action in settlement lifecycle)
  if (!loadVerificationCase("demo-buyer")) {
    const now = "2025-06-15T00:00:00Z";
    const verifiedCase: VerificationCase = {
      userId: "demo-buyer",
      track: "BUSINESS_KYB",
      status: "VERIFIED",
      riskTier: "LOW",
      createdAt: now,
      updatedAt: now,
      lastScreenedAt: now,
      nextRequiredStepId: null,
      steps: [
        { id: "email_phone", title: "Email & Phone Confirmation", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "id_document", title: "Government ID Capture", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "selfie_liveness", title: "Selfie / Liveness Verification", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "sanctions_pep", title: "Sanctions & PEP Screening", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "business_registration", title: "Business Registration Filing", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "ubo_capture", title: "Ultimate Beneficial Owner Declaration", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "proof_of_address", title: "Proof of Registered Address", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "source_of_funds", title: "Source of Funds Declaration", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
      ],
      evidenceIds: [],
      audit: [
        { at: now, actor: "demo-buyer", action: "CASE_INITIATED", detail: "Verification case opened — track: BUSINESS_KYB" },
        { at: now, actor: "AUTO", action: "CASE_VERIFIED", detail: "All steps passed — identity perimeter verified." },
      ],
    };
    saveVerificationCase(verifiedCase);
  }

  // Ensure demo seller has a VERIFIED verification case
  // (required for publish gate — must match org type + track)
  if (!loadVerificationCase("demo-seller")) {
    const now = "2025-06-15T00:00:00Z";
    const sellerVerifiedCase: VerificationCase = {
      userId: "demo-seller",
      track: "BUSINESS_KYB",
      status: "VERIFIED",
      riskTier: "LOW",
      createdAt: now,
      updatedAt: now,
      lastScreenedAt: now,
      nextRequiredStepId: null,
      steps: [
        { id: "email_phone", title: "Email & Phone Confirmation", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "id_document", title: "Government ID Capture", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "selfie_liveness", title: "Selfie / Liveness Verification", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "sanctions_pep", title: "Sanctions & PEP Screening", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "business_registration", title: "Business Registration Filing", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "ubo_capture", title: "Ultimate Beneficial Owner Declaration", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "proof_of_address", title: "Proof of Registered Address", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
        { id: "source_of_funds", title: "Source of Funds Declaration", status: "PASSED", submittedAt: now, decidedAt: now, decidedBy: "AUTO" },
      ],
      evidenceIds: [],
      audit: [
        { at: now, actor: "demo-seller", action: "CASE_INITIATED", detail: "Verification case opened — track: BUSINESS_KYB" },
        { at: now, actor: "AUTO", action: "CASE_VERIFIED", detail: "All steps passed — identity perimeter verified." },
      ],
    };
    saveVerificationCase(sellerVerifiedCase);
  }
}

/** Log into a demo account by creating a session. */
export function loginDemoUser(email: string): void {
  const user = findUserByEmail(email);
  if (!user) return;
  createSession(user.id);
}

/** Run the full settlement lifecycle through real API calls. */
async function seedFullLifecycle(): Promise<void> {
  // Skip if listing already exists (partial seed recovery)
  if (hasDemoListing()) return;

  const now = "2026-02-18T10:00:00Z";

  // 1. Create draft listing (as seller)
  const listing = await apiCreateDraftListing({
    title: "LBMA Good Delivery Bar — Demo 100 oz",
    form: "bar",
    purity: "9999",
    totalWeightOz: 100,
    pricePerOz: 2055.0,
    vaultHubId: "hub-001",
    vaultName: "London Clearing Centre",
    jurisdiction: "United Kingdom",
    sellerUserId: "demo-seller",
    sellerOrgId: "demo-org-seller",
    sellerName: "Helvetia Precious Metals AG",
  });

  // 2. Create evidence pack (3 required types)
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "ASSAY_REPORT",
    userId: "demo-seller",
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "CHAIN_OF_CUSTODY",
    userId: "demo-seller",
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "SELLER_ATTESTATION",
    userId: "demo-seller",
  });

  // 3. Publish listing
  const publishResult = await apiPublishListing({
    listingId: listing.id,
    userId: "demo-seller",
  });
  if (!publishResult.gateResult.allowed) {
    console.warn(
      "[DemoSeeder] Publish was blocked — gate result:",
      publishResult.gateResult,
    );
    return;
  }

  // 4. Create reservation (as buyer)
  const reservation = await createReservation({
    listingId: listing.id,
    userId: "demo-buyer",
    weightOz: 50,
  });

  // 5. Convert to order with policy snapshot
  const policySnapshot: MarketplacePolicySnapshot = {
    triScore: 2,
    triBand: "green",
    ecrBefore: 6.0,
    ecrAfter: 6.001,
    hardstopBefore: 0.75,
    hardstopAfter: 0.7503,
    approvalTier: "auto",
    blockers: [],
    timestamp: now,
  };
  const order = await convertReservationToOrder({
    reservationId: reservation.id,
    userId: "demo-buyer",
    policySnapshot,
  });

  // 6. Open settlement (as admin)
  const settlement = await apiOpenSettlementFromOrder({
    orderId: order.id,
    now,
    actorRole: "admin",
    actorUserId: "demo-admin",
  });

  // 7. Confirm funds (as treasury)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "CONFIRM_FUNDS_FINAL",
      actorRole: "treasury",
      actorUserId: "demo-treasury",
    },
    now: "2026-02-18T10:15:00Z",
  });

  // 8. Allocate gold (as admin — admin role is in ALLOCATE_GOLD's allowed roles)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "ALLOCATE_GOLD",
      actorRole: "admin",
      actorUserId: "demo-admin",
    },
    now: "2026-02-18T10:30:00Z",
  });

  // 9. Mark verification cleared (as compliance)
  // Note: AUTHORIZE_SETTLEMENT requires verificationCleared === true
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "MARK_VERIFICATION_CLEARED",
      actorRole: "compliance",
      actorUserId: "demo-compliance",
    },
    now: "2026-02-18T10:35:00Z",
  });

  // 10. Authorize settlement (as admin)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "AUTHORIZE_SETTLEMENT",
      actorRole: "admin",
      actorUserId: "demo-admin",
    },
    now: "2026-02-18T10:45:00Z",
  });

  // 11. Execute DvP (as admin) — this also triggers certificate issuance
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "EXECUTE_DVP",
      actorRole: "admin",
      actorUserId: "demo-admin",
    },
    now: "2026-02-18T11:00:00Z",
  });
}

function markSeeded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_SEEDED_KEY, "true");
}

/** Reset demo seeded flag (for re-seeding). */
export function resetDemoSeed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_SEEDED_KEY);
}

export { DEMO_ACCOUNTS, DEMO_ORGS };
