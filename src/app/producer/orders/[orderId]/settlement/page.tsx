/* ================================================================
   PRODUCER SETTLEMENT PAGE — Async Server Component
   ================================================================
   Dual-Mode Data Fetching:
     - Demo mode (?demo=true): Uses MOCK_ORDER
     - Live mode: Queries PostgreSQL via getSettlementCaseForOrder
       using the authenticated Clerk session.

   The interactive UI (execute button, state transitions) is
   delegated to the SettlementTerminalUI client component.
   ================================================================ */

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getSettlementCaseForOrder } from "@/actions/producer-queries";
import SettlementTerminalUI, {
  type SettlementOrder,
} from "./SettlementTerminalUI";

/* ----------------------------------------------------------------
   MOCK ORDER DATA — Preserved for demo/investor presentations
   ---------------------------------------------------------------- */
const MOCK_ORDER: SettlementOrder = {
  id: "ORD-8842-XAU",
  orderId: "ORD-8842-XAU",
  asset: "400 oz LBMA Good Delivery Bar",
  quantity: 10,
  totalWeightOz: 4_000,
  fineness: "≥995.0",
  lockedPricePerOz: 2_652.65,
  totalNotional: 10_610_600.0,
  offtakerEntity: "Aureus Capital Partners Ltd.",
  offtakerLei: "5493001KJTIIGC8Y1R12",
  vaultLocation: "Zurich Free Trade Zone — Malca-Amit Vault VII",
  status: "FUNDS_CLEARED_READY_FOR_RELEASE",
  escrowConfirmedAt: "2026-03-11T18:32:00Z",
  producerId: "producer-001",
  fundingRoute: "fedwire",
  producerWalletAddress: undefined,
};

/* ================================================================
   SERVER COMPONENT
   ================================================================ */
export default async function ProducerSettlementPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const orderId = resolvedParams.orderId;
  const isDemo =
    resolvedSearchParams.demo === "true" ||
    resolvedSearchParams.demo === "active";

  let order: SettlementOrder;

  if (isDemo) {
    /* ── Demo Branch: Use mock data ── */
    order = MOCK_ORDER;
  } else {
    /* ── Live Branch: Authenticated query to PostgreSQL ── */
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized: Clerk session required for live Settlement Terminal.");
    }

    const liveOrder = await getSettlementCaseForOrder(orderId);
    if (!liveOrder) {
      notFound();
    }
    order = liveOrder;
  }

  return <SettlementTerminalUI order={order} isDemo={isDemo} />;
}
