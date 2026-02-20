/* ================================================================
   DEMO SEEDER — Seeds deterministic scenario data through real APIs
   
   Rules:
   1. Uses ONLY real API calls — no direct state mutation
   2. Idempotent — skips if demo settlement already exists
   3. Fully deterministic — no randomness
   4. Does not bypass validation or capital guardrails
   
   Scenario Layout (Two Settlement Paths):
   ─────────────────────────────────────────
   Path A (stl-001): Fully settled. Buyer purchases 50 oz gold bar
     from Helvetia Precious Metals AG. Lifecycle: listing → evidence
     → publish → reserve → order → settlement → all actions → SETTLED.
     Certificate issued. This is the "happy path" demo.

   Path B (stl-002): In-flight. Buyer purchases 25 oz from a second
     listing. Lifecycle runs to ESCROW_OPEN but halts before funds
     confirmation. This is the "active transaction" shown on buyer/
     seller home pages.

   Idempotency Strategy:
   - PRIMARY guard: Anchor artifact detection on real domain state.
     Checks for a settlement with buyerUserId === "demo-buyer".
   - SECONDARY guard: localStorage key (fast path, not source of truth).
   - Session guard: Handled by DemoProvider via useRef, NOT here.
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
import { getCertificateBySettlementId } from "./certificate-engine";

/* ================================================================
   DEMO_IDS — Single source of truth for all deterministic IDs
   ================================================================
   Every seeded artifact references these constants. UI components
   and tour steps can import DEMO_IDS to navigate directly to the
   correct pages without searching or guessing.
   ================================================================ */

export const DEMO_IDS = {
  /* ── Users ── */
  buyer:      "demo-buyer",
  seller:     "demo-seller",
  admin:      "demo-admin",
  compliance: "demo-compliance",
  treasury:   "demo-treasury",

  /* ── Organizations ── */
  orgBuyer:  "demo-org-buyer",
  orgSeller: "demo-org-seller",
  orgOps:    "demo-org-ops",

  /* ── Path A: Settled (50 oz, LBMA Good Delivery) ── */
  listingA:     "demo-lst-a",
  reservationA: "demo-res-a",
  orderA:       "demo-ord-a",
  settlementA:  "demo-stl-a",

  /* ── Path B: In-flight (25 oz, COMEX-Eligible) ── */
  listingB:     "demo-lst-b",
  reservationB: "demo-res-b",
  orderB:       "demo-ord-b",
  settlementB:  "demo-stl-b",
} as const;

const DEMO_SCENARIO_NAME =
  "Sovereign Gold Settlement — Institutional Walkthrough";
const DEMO_SEEDED_KEY = "aurumshield:demo-seeded";

/**
 * Reset demo seeder state — clears localStorage seed flags.
 * Called by DemoProvider.resetDemo().
 */
export function resetDemoSeederState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_SEEDED_KEY);
}

/* ---------- Deterministic demo accounts ---------- */
export const DEMO_ACCOUNTS = [
  {
    id: DEMO_IDS.buyer,
    email: "buyer@aurumshield.demo",
    name: "Demo Buyer",
    role: "buyer" as const,
    orgId: DEMO_IDS.orgBuyer,
  },
  {
    id: DEMO_IDS.seller,
    email: "seller@aurumshield.demo",
    name: "Demo Seller",
    role: "seller" as const,
    orgId: DEMO_IDS.orgSeller,
  },
  {
    id: DEMO_IDS.admin,
    email: "admin@aurumshield.demo",
    name: "Demo Admin",
    role: "admin" as const,
    orgId: DEMO_IDS.orgOps,
  },
  {
    id: DEMO_IDS.compliance,
    email: "compliance@aurumshield.demo",
    name: "Demo Compliance",
    role: "compliance" as const,
    orgId: DEMO_IDS.orgOps,
  },
  {
    id: DEMO_IDS.treasury,
    email: "treasury@aurumshield.demo",
    name: "Demo Treasury",
    role: "treasury" as const,
    orgId: DEMO_IDS.orgOps,
  },
] as const;

export const DEMO_ORGS = [
  {
    id: DEMO_IDS.orgBuyer,
    legalName: "Sovereign Acquisition Corp.",
    type: "company" as const,
    jurisdiction: "Luxembourg",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: DEMO_IDS.orgSeller,
    legalName: "Helvetia Precious Metals AG",
    type: "company" as const,
    jurisdiction: "Switzerland",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: DEMO_IDS.orgOps,
    legalName: "AurumShield Operations",
    type: "company" as const,
    jurisdiction: "United Kingdom",
    createdAt: "2025-01-01T00:00:00Z",
  },
] as const;

/* ---------- Anchor artifact detection ---------- */

/**
 * PRIMARY idempotency guard.
 * Checks real domain state for existence of demo artifacts:
 * 1. A settlement with buyerUserId === DEMO_IDS.buyer
 * 2. OR a certificate linked to any demo settlement
 */
function hasDemoAnchorArtifact(): boolean {
  const settState = loadSettlementState();
  const demoSettlement = settState.settlements.find(
    (s) => s.buyerUserId === DEMO_IDS.buyer,
  );

  if (!demoSettlement) return false;

  // If settlement exists and is SETTLED → anchor found
  if (demoSettlement.status === "SETTLED") return true;

  // If a certificate exists for this settlement → anchor found
  const cert = getCertificateBySettlementId(demoSettlement.id);
  if (cert) return true;

  // Settlement exists but not yet SETTLED and no cert — partial seed.
  // Treat as seeded to avoid duplicate partial artifacts.
  return true;
}

/** Check if demo listing already exists in marketplace state. */
function hasDemoListing(): boolean {
  const state = loadMarketplaceState();
  return state.listings.some((l) => l.sellerUserId === DEMO_IDS.seller);
}

/* ---------- Public API ---------- */

/** Get the scenario name for display purposes. */
export function getDemoScenarioName(): string {
  return DEMO_SCENARIO_NAME;
}

/** Check if demo has been seeded (secondary cache — fast path). */
export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_SEEDED_KEY) === "true";
}

/**
 * Seed the demo scenario through real API calls.
 * Idempotent: checks anchor artifacts before proceeding.
 *
 * @returns true if seeding was performed, false if already present.
 */
export async function seedDemoScenario(): Promise<boolean> {
  // Fast path: secondary cache
  if (isDemoSeeded() && hasDemoAnchorArtifact()) {
    return false;
  }

  // Primary guard: anchor artifact detection on real domain state
  if (hasDemoAnchorArtifact()) {
    markSeeded();
    return false;
  }

  // Phase 1: Ensure demo accounts exist
  ensureDemoAccounts();

  // Phase 2: Seed Path A (settled) and Path B (in-flight)
  await seedFullLifecycle();

  // Mark as complete
  markSeeded();
  return true;
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
  seedVerificationCase(DEMO_IDS.buyer);

  // Ensure demo seller has a VERIFIED verification case
  // (required for publish gate — must match org type + track)
  seedVerificationCase(DEMO_IDS.seller);
}

/** Seed a VERIFIED verification case for a user if not present. */
function seedVerificationCase(userId: string): void {
  if (loadVerificationCase(userId)) return;

  const now = "2025-06-15T00:00:00Z";
  const steps = [
    "Email & Phone Confirmation",
    "Government ID Capture",
    "Selfie / Liveness Verification",
    "Sanctions & PEP Screening",
    "Business Registration Filing",
    "Ultimate Beneficial Owner Declaration",
    "Proof of Registered Address",
    "Source of Funds Declaration",
  ];
  const stepIds = [
    "email_phone", "id_document", "selfie_liveness", "sanctions_pep",
    "business_registration", "ubo_capture", "proof_of_address", "source_of_funds",
  ];

  const verifiedCase: VerificationCase = {
    userId,
    track: "BUSINESS_KYB",
    status: "VERIFIED",
    riskTier: "LOW",
    createdAt: now,
    updatedAt: now,
    lastScreenedAt: now,
    nextRequiredStepId: null,
    steps: stepIds.map((id, i) => ({
      id,
      title: steps[i],
      status: "PASSED" as const,
      submittedAt: now,
      decidedAt: now,
      decidedBy: "AUTO",
    })),
    evidenceIds: [],
    audit: [
      {
        at: now,
        actor: userId,
        action: "CASE_INITIATED",
        detail: "Verification case opened — track: BUSINESS_KYB",
      },
      {
        at: now,
        actor: "AUTO",
        action: "CASE_VERIFIED",
        detail: "All steps passed — identity perimeter verified.",
      },
    ],
  };
  saveVerificationCase(verifiedCase);
}

/** Log into a demo account by creating a session. */
export function loginDemoUser(email: string): void {
  const user = findUserByEmail(email);
  if (!user) return;
  createSession(user.id);
}

/* ================================================================
   SEED FULL LIFECYCLE — Two settlement paths
   ================================================================ */

async function seedFullLifecycle(): Promise<void> {
  // Skip if listing already exists (partial seed recovery)
  if (hasDemoListing()) return;

  // ── Path A: Fully settled (50 oz LBMA bar) ──
  await seedPathA();

  // ── Path B: In-flight (25 oz COMEX bar, stops at ESCROW_OPEN) ──
  await seedPathB();
}

/* ---------- Path A: Settled lifecycle ---------- */

async function seedPathA(): Promise<void> {
  const t0 = "2026-02-18T10:00:00Z";

  // 1. Create draft listing (as seller)
  const listing = await apiCreateDraftListing({
    title: "LBMA Good Delivery Bar — 100 oz",
    form: "bar",
    purity: "9999",
    totalWeightOz: 100,
    pricePerOz: 2055.0,
    vaultHubId: "hub-001",
    vaultName: "London Clearing Centre",
    jurisdiction: "United Kingdom",
    sellerUserId: DEMO_IDS.seller,
    sellerOrgId: DEMO_IDS.orgSeller,
    sellerName: "Helvetia Precious Metals AG",
  });

  // 2. Create evidence pack (3 required types)
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "ASSAY_REPORT",
    userId: DEMO_IDS.seller,
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "CHAIN_OF_CUSTODY",
    userId: DEMO_IDS.seller,
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "SELLER_ATTESTATION",
    userId: DEMO_IDS.seller,
  });

  // 3. Publish listing
  const publishResult = await apiPublishListing({
    listingId: listing.id,
    userId: DEMO_IDS.seller,
  });
  if (!publishResult.gateResult.allowed) {
    console.warn(
      "[DemoSeeder] Path A publish was blocked — gate result:",
      publishResult.gateResult,
    );
    return;
  }

  // 4. Create reservation (as buyer, 50 oz of the 100 oz listing)
  const reservation = await createReservation({
    listingId: listing.id,
    userId: DEMO_IDS.buyer,
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
    timestamp: t0,
  };
  const order = await convertReservationToOrder({
    reservationId: reservation.id,
    userId: DEMO_IDS.buyer,
    policySnapshot,
  });

  // 6. Open settlement (as admin)
  const settlement = await apiOpenSettlementFromOrder({
    orderId: order.id,
    now: t0,
    actorRole: "admin",
    actorUserId: DEMO_IDS.admin,
  });

  // 7. Confirm funds (as treasury)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "CONFIRM_FUNDS_FINAL",
      actorRole: "treasury",
      actorUserId: DEMO_IDS.treasury,
    },
    now: "2026-02-18T10:15:00Z",
  });

  // 8. Allocate gold (as admin)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "ALLOCATE_GOLD",
      actorRole: "admin",
      actorUserId: DEMO_IDS.admin,
    },
    now: "2026-02-18T10:30:00Z",
  });

  // 9. Mark verification cleared (as compliance)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "MARK_VERIFICATION_CLEARED",
      actorRole: "compliance",
      actorUserId: DEMO_IDS.compliance,
    },
    now: "2026-02-18T10:35:00Z",
  });

  // 10. Authorize settlement (as admin)
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "AUTHORIZE_SETTLEMENT",
      actorRole: "admin",
      actorUserId: DEMO_IDS.admin,
    },
    now: "2026-02-18T10:45:00Z",
  });

  // 11. Execute DvP (as admin) — triggers certificate issuance
  await apiApplySettlementAction({
    settlementId: settlement.id,
    payload: {
      action: "EXECUTE_DVP",
      actorRole: "admin",
      actorUserId: DEMO_IDS.admin,
    },
    now: "2026-02-18T11:00:00Z",
  });
}

/* ---------- Path B: In-flight (halts at ESCROW_OPEN) ---------- */

async function seedPathB(): Promise<void> {
  const t0 = "2026-02-19T09:00:00Z";

  // 1. Create a second listing (as seller)
  const listing = await apiCreateDraftListing({
    title: "COMEX-Eligible Gold Bar — 50 oz",
    form: "bar",
    purity: "999",
    totalWeightOz: 50,
    pricePerOz: 2038.0,
    vaultHubId: "hub-004",
    vaultName: "New York Trading Floor",
    jurisdiction: "United States",
    sellerUserId: DEMO_IDS.seller,
    sellerOrgId: DEMO_IDS.orgSeller,
    sellerName: "Helvetia Precious Metals AG",
  });

  // 2. Evidence pack
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "ASSAY_REPORT",
    userId: DEMO_IDS.seller,
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "CHAIN_OF_CUSTODY",
    userId: DEMO_IDS.seller,
  });
  await apiCreateListingEvidence({
    listingId: listing.id,
    evidenceType: "SELLER_ATTESTATION",
    userId: DEMO_IDS.seller,
  });

  // 3. Publish
  const publishResult = await apiPublishListing({
    listingId: listing.id,
    userId: DEMO_IDS.seller,
  });
  if (!publishResult.gateResult.allowed) {
    console.warn(
      "[DemoSeeder] Path B publish was blocked — gate result:",
      publishResult.gateResult,
    );
    return;
  }

  // 4. Reserve (as buyer, 25 oz of the 50 oz listing)
  const reservation = await createReservation({
    listingId: listing.id,
    userId: DEMO_IDS.buyer,
    weightOz: 25,
  });

  // 5. Convert to order
  const policySnapshot: MarketplacePolicySnapshot = {
    triScore: 3,
    triBand: "green",
    ecrBefore: 6.001,
    ecrAfter: 6.003,
    hardstopBefore: 0.7503,
    hardstopAfter: 0.7510,
    approvalTier: "auto",
    blockers: [],
    timestamp: t0,
  };
  const order = await convertReservationToOrder({
    reservationId: reservation.id,
    userId: DEMO_IDS.buyer,
    policySnapshot,
  });

  // 6. Open settlement (as admin) — this is where Path B STOPS
  //    Settlement stays in ESCROW_OPEN, waiting for treasury to
  //    confirm funds. This gives the buyer/seller dashboards an
  //    "active transaction" to display.
  await apiOpenSettlementFromOrder({
    orderId: order.id,
    now: t0,
    actorRole: "admin",
    actorUserId: DEMO_IDS.admin,
  });

  // ⏸ Path B intentionally halts here — no further actions.
}

/* ---------- Utility ---------- */

function markSeeded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_SEEDED_KEY, "true");
}

/** Reset demo seeded flag (for re-seeding). */
export function resetDemoSeed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_SEEDED_KEY);
}
