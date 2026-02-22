"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Store,
  Shield,
  Award,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import {
  TransactionProgressSidebar,
  deriveCurrentPhase,
  type BuyerLifecyclePhase,
  type PhaseAction,
} from "@/components/buyer/TransactionProgressSidebar";
import {
  useMyOrders,
  useMyReservations,
  useSettlements,
  useSettlementLedger,
  useListings,
} from "@/hooks/use-mock-queries";
import type {
  Order,
  SettlementCase,
  Listing,
  LedgerEntry,
} from "@/lib/mock-data";

const MOCK_USER_ID = "user-1";

/* ================================================================
   Derive lifecycle timestamps from ledger entries
   ================================================================ */

function deriveTimestamps(
  order: Order | undefined,
  settlement: SettlementCase | undefined,
  ledger: LedgerEntry[],
): (string | null)[] {
  const timestamps: (string | null)[] = [null, null, null, null];

  // Phase 1: Inventory Lock — order created
  if (order) timestamps[0] = order.createdAt;

  // Phase 2: Identity Perimeter — verification passed
  const verEntry = ledger.find((e) => e.type === "VERIFICATION_PASSED");
  if (verEntry) timestamps[1] = verEntry.timestamp;

  // Phase 3: Capital Activation — funds deposited
  const fundsEntry = ledger.find((e) => e.type === "FUNDS_DEPOSITED");
  if (fundsEntry) timestamps[2] = fundsEntry.timestamp;

  // Phase 4: Finality — settlement settled
  if (settlement?.status === "SETTLED") timestamps[3] = settlement.updatedAt;

  return timestamps;
}

/* ================================================================
   Active Transaction Card
   ================================================================ */

function ActiveTransactionCard({
  order,
  listing,
  settlement,
  ledger,
}: {
  order: Order;
  listing: Listing | undefined;
  settlement: SettlementCase | undefined;
  ledger: LedgerEntry[];
}) {
  const phase = deriveCurrentPhase(
    order.status,
    settlement?.status ?? null,
    settlement?.status === "SETTLED",
  );
  const timestamps = deriveTimestamps(order, settlement, ledger);

  // Phase-specific CTA routing
  const phaseActions = useMemo((): Partial<Record<BuyerLifecyclePhase, PhaseAction>> => {
    const actions: Partial<Record<BuyerLifecyclePhase, PhaseAction>> = {
      1: { label: "View Order", href: `/orders/${order.id}` },
      2: { label: "Complete Verification", href: "/verification", primary: true },
    };
    if (settlement) {
      actions[3] = {
        label: "Activate Payment",
        href: `/settlements/${settlement.id}/activation`,
        primary: true,
      };
      actions[4] = {
        label: "View Certificate",
        href: `/settlements/${settlement.id}`,
      };
      actions[5] = {
        label: "Track Delivery",
        href: `/buyer/delivery/${settlement.id}`,
        primary: true,
      };
    } else {
      actions[3] = { label: "View Order", href: `/orders/${order.id}` };
      actions[4] = { label: "View Order", href: `/orders/${order.id}` };
    }
    return actions;
  }, [order.id, settlement]);

  return (
    <div
      className="card-base border border-gold/20 p-5 space-y-5"
      data-tour="buyer-active-transaction"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              Active Transaction
            </span>
          </div>
          <h3 className="text-sm font-medium text-text">
            {listing?.title ?? `Order ${order.id}`}
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            {order.weightOz} oz @ $
            {order.pricePerOz.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
            /oz
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-text">
            $
            {order.notional.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[10px] text-text-faint uppercase">Notional</p>
        </div>
      </div>

      {/* Two-column: Progress Rail + Details */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        {/* Progress Rail */}
        <TransactionProgressSidebar
          currentPhase={phase}
          timestamps={timestamps}
          phaseActions={phaseActions}
        />

        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-faint">Order ID</span>
              <span className="font-mono text-xs text-text">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Listing</span>
              <span className="font-mono text-xs text-text">
                {order.listingId}
              </span>
            </div>
            {settlement && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-faint">Settlement</span>
                  <span className="font-mono text-xs text-text">
                    {settlement.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                      settlement.status === "SETTLED"
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-gold/20 bg-gold/10 text-gold",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {settlement.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Rail</span>
                  <span className="text-text">{settlement.rail}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-text-faint">Created</span>
              <span className="text-xs text-text-muted tabular-nums">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Vault & Purity */}
          {listing && (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-faint">Vault</span>
                <span className="text-text">{listing.vaultName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-faint">Purity</span>
                <span className="text-text">.{listing.purity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-faint">Form</span>
                <span className="text-text capitalize">{listing.form}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Completed Transaction Card
   ================================================================ */

function CompletedCard({
  order,
  listing,
  settlement,
}: {
  order: Order;
  listing: Listing | undefined;
  settlement: SettlementCase | undefined;
}) {
  return (
    <Link
      href={
        settlement
          ? `/settlements/${settlement.id}`
          : `/orders/${order.id}`
      }
      className="block card-base border border-success/10 p-4 hover:border-success/30 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-text">
              {listing?.title ?? `Order ${order.id}`}
            </p>
            <p className="text-xs text-text-faint">
              {order.weightOz} oz · $
              {order.notional.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-faint tabular-nums">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-success transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ================================================================
   Empty State — No Active Transactions
   ================================================================ */

function EmptyState() {
  return (
    <div className="card-base border border-border p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          <Store className="h-7 w-7 text-gold" />
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-text">
          No active transactions
        </h3>
        <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
          Browse the marketplace to find verified gold allocations. One
          click to lock, one path to settlement.
        </p>
      </div>
      <Link
        href="/marketplace"
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
          "bg-gold px-5 py-2.5 text-sm font-medium text-bg",
          "transition-colors hover:bg-gold-hover",
        )}
        data-tour="buyer-browse-marketplace"
      >
        <Store className="h-4 w-4" />
        Browse Marketplace
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ================================================================
   Quick Action Cards
   ================================================================ */

function QuickActions() {
  const actions = [
    {
      label: "Marketplace",
      description: "Browse verified gold allocations",
      href: "/marketplace",
      icon: Store,
      accent: "text-gold",
    },
    {
      label: "Verification",
      description: "Complete your KYC/KYB identity check",
      href: "/verification",
      icon: Shield,
      accent: "text-info",
    },
    {
      label: "Certificates",
      description: "View issued clearing certificates",
      href: "/settlements",
      icon: Award,
      accent: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="card-base border border-border p-4 hover:border-gold/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("h-5 w-5", action.accent)} />
              <div>
                <p className="text-sm font-medium text-text group-hover:text-gold transition-colors">
                  {action.label}
                </p>
                <p className="text-[11px] text-text-faint">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ================================================================
   Buyer Page — Mission Control
   ================================================================ */

export default function BuyerPage() {
  const ordersQ = useMyOrders(MOCK_USER_ID);
  const reservationsQ = useMyReservations(MOCK_USER_ID);
  const settlementsQ = useSettlements();
  const listingsQ = useListings();

  const isLoading =
    ordersQ.isLoading ||
    reservationsQ.isLoading ||
    settlementsQ.isLoading ||
    listingsQ.isLoading;

  // Derive active and completed orders
  const { activeOrder, completedOrders, activeSettlement } = useMemo(() => {
    if (!ordersQ.data || !settlementsQ.data)
      return { activeOrder: null, completedOrders: [], activeSettlement: null };

    const buyerSettlements = settlementsQ.data.filter(
      (s: SettlementCase) => s.buyerUserId === MOCK_USER_ID,
    );

    // Active = most recent non-completed order
    const active = ordersQ.data.find(
      (o: Order) =>
        o.status !== "completed" && o.status !== "cancelled",
    );

    // Find settlement for active order
    const activeSett = active
      ? buyerSettlements.find((s: SettlementCase) => s.orderId === active.id) ?? null
      : null;

    // Completed = settled orders
    const completed = ordersQ.data.filter(
      (o: Order) => o.status === "completed",
    );

    return {
      activeOrder: active ?? null,
      completedOrders: completed,
      activeSettlement: activeSett,
    };
  }, [ordersQ.data, settlementsQ.data]);

  // Get ledger for active settlement
  const ledgerQ = useSettlementLedger(activeSettlement?.id ?? "");

  // Resolve listing for active order
  const activeListing = useMemo(() => {
    if (!activeOrder || !listingsQ.data) return undefined;
    return listingsQ.data.find(
      (l: Listing) => l.id === activeOrder.listingId,
    );
  }, [activeOrder, listingsQ.data]);

  if (isLoading) return <LoadingState message="Loading buyer console…" />;
  if (ordersQ.isError)
    return (
      <ErrorState
        message="Failed to load buyer data."
        onRetry={() => ordersQ.refetch()}
      />
    );

  return (
    <>
      <PageHeader
        title="Buyer Mission Control"
        description="Single-path transaction lifecycle — from discovery to certificate"
      />

      {/* Quick Actions */}
      <div className="mt-4">
        <QuickActions />
      </div>

      {/* Active Transaction or Empty State */}
      <div className="mt-6">
        {activeOrder ? (
          <ActiveTransactionCard
            order={activeOrder}
            listing={activeListing}
            settlement={activeSettlement ?? undefined}
            ledger={ledgerQ.data ?? []}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Completed Transactions */}
      {completedOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint mb-3">
            Completed Transactions
          </h2>
          <div className="space-y-2">
            {completedOrders.map((order: Order) => {
              const listing = listingsQ.data?.find(
                (l: Listing) => l.id === order.listingId,
              );
              const settlement = settlementsQ.data?.find(
                (s: SettlementCase) => s.orderId === order.id,
              );
              return (
                <CompletedCard
                  key={order.id}
                  order={order}
                  listing={listing}
                  settlement={settlement}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
