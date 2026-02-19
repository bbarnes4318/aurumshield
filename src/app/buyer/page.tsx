"use client";

/* ================================================================
   BUYER HOME — Transaction Console

   Dedicated buy-side surface showing:
   - Active transaction tile (latest in-flight settlement)
   - Counterparty verification panel
   - Indemnification coverage
   - Portfolio summary (reservations, orders, settlements)
   ================================================================ */

import { useRouter } from "next/navigation";
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
import { useDemo } from "@/providers/demo-provider";
import {
  useMyOrders,
  useMyReservations,
  useSettlements,
} from "@/hooks/use-mock-queries";
import { CounterpartyVerificationPanel } from "@/components/demo/CounterpartyVerificationPanel";
import { IndemnificationPolicyCard } from "@/components/demo/IndemnificationPolicyCard";
import { SupportBanner } from "@/components/demo/SupportBanner";


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
  const router = useRouter();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const userId = user?.id ?? "demo-buyer";

  const ordersQ = useMyOrders(userId);
  const reservationsQ = useMyReservations(userId);
  const settlementsQ = useSettlements();

  const orders = ordersQ.data ?? [];
  const reservations = reservationsQ.data ?? [];
  const allSettlements = settlementsQ.data ?? [];

  // Filter settlements relevant to this buyer
  const mySettlements = allSettlements.filter(
    (s) => s.buyerUserId === userId,
  );

  // DETERMINISTIC: In demo mode, anchor to specific settlement IDs
  // stl-002 = active in-flight settlement, stl-001 = settled (certificate ready)
  const activeSettlement = isDemo
    ? mySettlements.find((s) => s.id === "stl-002") ??
      mySettlements.find(
        (s) =>
          s.status !== "SETTLED" &&
          s.status !== "FAILED" &&
          s.status !== "CANCELLED",
      )
    : mySettlements.find(
        (s) =>
          s.status !== "SETTLED" &&
          s.status !== "FAILED" &&
          s.status !== "CANCELLED",
      );

  // DETERMINISTIC: In demo mode, anchor to stl-001 for certificate
  const settledSettlement = isDemo
    ? mySettlements.find((s) => s.id === "stl-001") ??
      mySettlements.find((s) => s.status === "SETTLED")
    : mySettlements.find((s) => s.status === "SETTLED");


  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-surface-2">
            <ShoppingCart className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">
              Transaction Console
            </h1>
            <p className="text-xs text-text-faint">
              Buy-side clearing operations
            </p>
          </div>
        </div>
        {isDemo && <SupportBanner compact />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ Active Transaction Tile ═══ */}
        <div
          className="card-base border border-border p-5 space-y-4"
          data-tour="buyer-active-transaction"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              Active Transaction
            </h2>
            {activeSettlement && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  STATUS_STYLE[activeSettlement.status] ??
                  STATUS_STYLE.DRAFT
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {activeSettlement.status.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {activeSettlement ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint">
                    Settlement
                  </p>
                  <p className="text-sm font-mono text-text mt-0.5">
                    {activeSettlement.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint">
                    Notional
                  </p>
                  <p className="text-sm font-mono tabular-nums text-text mt-0.5">
                    $
                    {activeSettlement.notionalUsd.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint">
                    Weight
                  </p>
                  <p className="text-sm font-mono tabular-nums text-text mt-0.5">
                    {activeSettlement.weightOz} oz
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint">
                    Activation
                  </p>
                  <p className="text-sm text-text mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        activeSettlement.activationStatus === "activated"
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {activeSettlement.activationStatus === "activated" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {activeSettlement.activationStatus.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
              </div>

              {/* Activate Clearing CTA */}
              {activeSettlement.activationStatus !== "activated" && (
                <Link
                  href={`/settlements/${activeSettlement.id}/activation?demo=true`}
                  data-tour="activation-pay-cta"
                  className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2.5 text-xs font-semibold text-text hover:bg-surface-3 transition-colors"
                >
                  <Landmark className="h-3.5 w-3.5" />
                  Activate Clearing
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              {activeSettlement.activationStatus === "activated" && (
                <Link
                  href={`/settlements/${activeSettlement.id}?demo=true`}
                  className="flex items-center justify-center gap-2 w-full rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  View Settlement Detail
                </Link>
              )}
            </div>
          ) : settledSettlement ? (
            <div className="space-y-3">
              <div className="rounded-sm bg-success/5 border border-success/20 px-3 py-2">
                <p className="text-xs font-medium text-success">
                  Most recent settlement completed
                </p>
                <p className="text-[10px] font-mono text-text-muted mt-1">
                  {settledSettlement.id}
                </p>
              </div>
              <Link
                href={`/settlements/${settledSettlement.id}?demo=true`}
                className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
              >
                <FileText className="h-3 w-3" />
                View Settlement
              </Link>
            </div>
          ) : (
            <p className="text-xs text-text-faint">
              No active transactions. Browse the marketplace to begin.
            </p>
          )}
        </div>

        {/* ═══ Counterparty Verification ═══ */}
        <CounterpartyVerificationPanel
          buyerOrg="Sovereign Acquisition Corp."
          sellerOrg="Helvetia Precious Metals AG"
          onOpenReport={() =>
            router.push(`/verification/status/demo-buyer?demo=true`)
          }
        />

        {/* ═══ Indemnification Coverage ═══ */}
        <IndemnificationPolicyCard
          active={
            activeSettlement?.activationStatus === "activated" ||
            !!settledSettlement
          }
        />

        {/* ═══ Portfolio Summary ═══ */}
        <div
          className="card-base border border-border p-5 space-y-4"
          data-tour="buyer-portfolio"
        >
          <h2 className="text-sm font-semibold text-text">
            Portfolio Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/reservations?demo=true"
              className="rounded-sm border border-border bg-surface-2 p-3 hover:bg-surface-3 transition-colors text-center"
            >
              <p className="text-lg font-semibold font-mono tabular-nums text-text">
                {reservations.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-faint mt-1">
                Reservations
              </p>
            </Link>
            <Link
              href="/orders?demo=true"
              className="rounded-sm border border-border bg-surface-2 p-3 hover:bg-surface-3 transition-colors text-center"
            >
              <p className="text-lg font-semibold font-mono tabular-nums text-text">
                {orders.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-faint mt-1">
                Orders
              </p>
            </Link>
            <Link
              href="/settlements?demo=true"
              className="rounded-sm border border-border bg-surface-2 p-3 hover:bg-surface-3 transition-colors text-center"
            >
              <p className="text-lg font-semibold font-mono tabular-nums text-text">
                {mySettlements.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-faint mt-1">
                Settlements
              </p>
            </Link>
          </div>
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
