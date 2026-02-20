"use client";

/* ================================================================
   BUYER HOME — Transaction Console

   Dedicated buy-side surface showing:
   - Active transaction tile (latest in-flight settlement)
   - Portfolio summary (reservations, orders, settlements)
   - Placeholder slots for Phase 3 visual components:
     • CounterpartyVerificationPanel
     • IndemnificationPolicyCard
     • CapitalAllocationSequence
   ================================================================ */

import Link from "next/link";
import {
  ShoppingCart,
  FileText,
  ArrowRight,
  Landmark,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import {
  useMyOrders,
  useMyReservations,
  useSettlements,
} from "@/hooks/use-mock-queries";
import { DEMO_IDS } from "@/lib/demo-seeder";
import { PageHeader } from "@/components/ui/page-header";

/* ---------- Status chip config ---------- */
const STATUS_STYLE: Record<string, string> = {
  ESCROW_OPEN: "bg-info/10 text-info border-info/20",
  AWAITING_FUNDS: "bg-warning/10 text-warning border-warning/20",
  AWAITING_GOLD: "bg-gold/10 text-gold border-gold/20",
  READY_TO_SETTLE: "bg-success/10 text-success border-success/20",
  AUTHORIZED: "bg-info/10 text-info border-info/20",
  SETTLED: "bg-success/10 text-success border-success/20",
  DRAFT: "bg-surface-3 text-text-faint border-border",
};

function BuyerContent() {
  const { user } = useAuth();
  const userId = user?.id ?? DEMO_IDS.buyer;

  /* ---------- Data queries ---------- */
  const { data: orders = [] } = useMyOrders(userId);
  const { data: reservations = [] } = useMyReservations(userId);
  const { data: settlements = [] } = useSettlements();

  // Filter settlements relevant to THIS buyer
  const mySettlements = settlements.filter((s) => s.buyerUserId === userId);

  // Active settlement: first non-SETTLED, non-CANCELLED
  const activeSettlement = mySettlements.find(
    (s) => s.status !== "SETTLED" && s.status !== "CANCELLED" && s.status !== "FAILED",
  );

  // Completed settlement: first SETTLED
  const completedSettlement = mySettlements.find((s) => s.status === "SETTLED");

  /* ---------- Summary stats ---------- */
  const activeReservations = reservations.filter((r) => r.state === "ACTIVE");
  const pendingOrders = orders.filter(
    (o) => o.status === "draft" || o.status === "pending_verification" || o.status === "reserved" || o.status === "settlement_pending",
  );
  const settledCount = mySettlements.filter((s) => s.status === "SETTLED").length;

  return (
    <>
      <PageHeader
        title="Transaction Console"
        description="Buy-side overview — active transactions, portfolio summary, and settlement status"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">

        {/* ── Column 1: Active Transaction ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Settlement Tile */}
          {activeSettlement ? (
            <Link
              href={`/settlements/${activeSettlement.id}`}
              className="block card-base border border-border p-5 hover:border-gold/40 transition-colors group"
              data-tour="buyer-active-transaction"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-gold" />
                  <span className="text-sm font-semibold text-text">
                    Active Settlement
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    STATUS_STYLE[activeSettlement.status] ?? STATUS_STYLE.DRAFT
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {activeSettlement.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Weight</p>
                  <p className="font-mono tabular-nums text-text">
                    {activeSettlement.weightOz} oz
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Price</p>
                  <p className="font-mono tabular-nums text-text">
                    ${activeSettlement.pricePerOzLocked.toLocaleString("en-US", { minimumFractionDigits: 2 })}/oz
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Notional</p>
                  <p className="font-mono tabular-nums text-text">
                    ${activeSettlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Opened</p>
                  <p className="font-mono tabular-nums text-text text-xs">
                    {new Date(activeSettlement.openedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <span className="text-xs text-gold flex items-center gap-1 group-hover:gap-2 transition-all">
                  View settlement <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="card-base border border-border p-5 text-center">
              <Landmark className="h-8 w-8 text-text-faint/40 mx-auto mb-2" />
              <p className="text-sm text-text-faint">No active settlements</p>
              <Link
                href="/marketplace"
                className="text-xs text-gold hover:underline mt-2 inline-flex items-center gap-1"
              >
                Browse marketplace <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Completed Settlement (Path A) */}
          {completedSettlement && (
            <Link
              href={`/settlements/${completedSettlement.id}`}
              className="block card-base border border-success/20 p-5 hover:border-success/40 transition-colors group"
              data-tour="buyer-completed-settlement"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-semibold text-text">
                    Last Completed Settlement
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border-success/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  SETTLED
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Weight</p>
                  <p className="font-mono tabular-nums text-text">
                    {completedSettlement.weightOz} oz
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Notional</p>
                  <p className="font-mono tabular-nums text-text">
                    ${completedSettlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint mb-0.5">Settled</p>
                  <p className="font-mono tabular-nums text-text text-xs">
                    {new Date(completedSettlement.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <span className="text-xs text-success flex items-center gap-1 group-hover:gap-2 transition-all">
                  View certificate <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* ── Phase 3 Slot: CounterpartyVerificationPanel ── */}
          {/* TODO: Phase 3 will insert <CounterpartyVerificationPanel /> here */}

          {/* ── Phase 3 Slot: CapitalAllocationSequence ── */}
          {/* TODO: Phase 3 will insert <CapitalAllocationSequence /> here */}
        </div>

        {/* ── Column 2: Portfolio Summary ── */}
        <div className="space-y-6">

          {/* Stats cards */}
          <div className="space-y-3">
            <Link
              href="/reservations"
              className="card-base border border-border p-4 flex items-center gap-3 hover:border-gold/30 transition-colors"
              data-tour="buyer-reservations"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Active Reservations</p>
                <p className="text-lg font-semibold tabular-nums text-text">{activeReservations.length}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-faint" />
            </Link>

            <Link
              href="/orders"
              className="card-base border border-border p-4 flex items-center gap-3 hover:border-gold/30 transition-colors"
              data-tour="buyer-orders"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10">
                <ShoppingCart className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Open Orders</p>
                <p className="text-lg font-semibold tabular-nums text-text">{pendingOrders.length}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-faint" />
            </Link>

            <div className="card-base border border-border p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Settled</p>
                <p className="text-lg font-semibold tabular-nums text-text">{settledCount}</p>
              </div>
            </div>
          </div>

          {/* Recent orders list */}
          <div className="card-base border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-text">Recent Orders</h3>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-text-faint">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-surface-2 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-text">
                        {order.weightOz} oz @ ${order.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-text-faint font-mono">
                        {order.id}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-text-faint">
                      {order.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Phase 3 Slot: IndemnificationPolicyCard ── */}
          {/* TODO: Phase 3 will insert <IndemnificationPolicyCard /> here */}
        </div>
      </div>
    </>
  );
}

export default function BuyerPage() {
  return (
    <RequireAuth>
      <BuyerContent />
    </RequireAuth>
  );
}
