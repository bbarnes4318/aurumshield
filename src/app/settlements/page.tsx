/* ================================================================
   SETTLEMENT CONSOLE — Async Server Component
   ================================================================
   Dual-Mode Data Fetching:
     - Demo mode (?demo=true): Passes mock settlement data to UI.
     - Live mode: Queries PostgreSQL via getLiveSettlements()
       and passes live data to the SettlementsUI client component.

   Interactive UI (search, filters, table) is delegated to the
   SettlementsUI client component.
   ================================================================ */

import { getLiveSettlements, type LiveSettlementRow } from "@/actions/settlement-queries";
import SettlementsUI from "./SettlementsUI";

/* ----------------------------------------------------------------
   MOCK SETTLEMENTS — Preserved for demo/investor walkthroughs
   ---------------------------------------------------------------- */
const MOCK_SETTLEMENTS: LiveSettlementRow[] = [
  {
    id: "stl-demo-001",
    orderId: "ORD-2026-00001",
    listingId: "lst-001",
    buyerUserId: "demo-buyer",
    sellerUserId: "demo-seller",
    buyerOrgId: "org-demo-buyer",
    sellerOrgId: "org-demo-seller",
    corridorId: "cor-001",
    hubId: "hub-001",
    vaultHubId: "hub-002",
    rail: "WIRE",
    weightOz: 400,
    pricePerOzLocked: 2652.65,
    notionalUsd: 1_061_060,
    status: "FUNDS_CLEARED_READY_FOR_RELEASE",
    openedAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-14T15:30:00Z",
    notionalCents: 106_106_000,
    currency: "USD",
  },
  {
    id: "stl-demo-002",
    orderId: "ORD-2026-00002",
    listingId: "lst-003",
    buyerUserId: "demo-buyer",
    sellerUserId: "demo-seller",
    buyerOrgId: "org-demo-buyer",
    sellerOrgId: "org-demo-seller",
    corridorId: "cor-002",
    hubId: "hub-004",
    vaultHubId: "hub-004",
    rail: "RTGS",
    weightOz: 100,
    pricePerOzLocked: 2645.00,
    notionalUsd: 264_500,
    status: "DVP_EXECUTED",
    openedAt: "2026-03-05T14:00:00Z",
    updatedAt: "2026-03-13T11:00:00Z",
    notionalCents: 26_450_000,
    currency: "USD",
  },
  {
    id: "stl-demo-003",
    orderId: "ORD-2026-00003",
    listingId: "lst-004",
    buyerUserId: "demo-buyer",
    sellerUserId: "demo-seller",
    buyerOrgId: "org-demo-buyer",
    sellerOrgId: "org-demo-seller",
    corridorId: "cor-003",
    hubId: "hub-003",
    vaultHubId: "hub-003",
    rail: "WIRE",
    weightOz: 1000,
    pricePerOzLocked: 2650.00,
    notionalUsd: 2_650_000,
    status: "AMBIGUOUS_STATE",
    openedAt: "2026-03-10T08:00:00Z",
    updatedAt: "2026-03-14T10:00:00Z",
    notionalCents: 265_000_000,
    currency: "USD",
  },
  {
    id: "stl-demo-004",
    orderId: "ORD-2026-00004",
    listingId: "lst-007",
    buyerUserId: "demo-buyer",
    sellerUserId: "demo-seller",
    buyerOrgId: "org-demo-buyer",
    sellerOrgId: "org-demo-seller",
    corridorId: "cor-001",
    hubId: "hub-001",
    vaultHubId: "hub-001",
    rail: "WIRE",
    weightOz: 200,
    pricePerOzLocked: 2648.50,
    notionalUsd: 529_700,
    status: "SETTLED",
    openedAt: "2026-02-20T12:00:00Z",
    updatedAt: "2026-03-12T16:00:00Z",
    notionalCents: 52_970_000,
    currency: "USD",
  },
];

/* ================================================================
   SERVER COMPONENT
   ================================================================ */
export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const isDemo =
    resolvedSearchParams.demo === "true" ||
    resolvedSearchParams.demo === "active";

  let settlements: LiveSettlementRow[];

  if (isDemo) {
    /* ── Demo Branch: Use mock data ── */
    settlements = MOCK_SETTLEMENTS;
  } else {
    /* ── Live Branch: Query PostgreSQL ── */
    try {
      settlements = await getLiveSettlements();
    } catch (err) {
      console.error(
        "[SettlementsPage] Failed to fetch live settlements, falling back to empty state:",
        err instanceof Error ? err.message : err,
      );
      settlements = [];
    }
  }

  return <SettlementsUI settlements={settlements} isDemo={isDemo} />;
}
