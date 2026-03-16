"use client";

/* ================================================================
   OFFTAKER ORDERS — Allocation Ledger + Execution Pipeline
   ================================================================
   Dual-purpose page:
   1. Shows the Offtaker's Allocation Ledger (mock order grid)
   2. When an order row is clicked, triggers the institutional
      execution pipeline:
        Phase 1: Dual-Auth Gate (Maker → Checker approval)
        Phase 2: WebAuthn Biometric Signing Ceremony
        Phase 3: Clearing Certificate (Fedwire + ERC-3643)

   This page is Step 5 of the demo tour.
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  ChevronRight,
  Activity,
  Clock,
  FileText,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { DualAuthGate } from "@/components/checkout/DualAuthGate";
import { WebAuthnModal } from "@/components/checkout/WebAuthnModal";
import { ClearingCertificate } from "@/components/checkout/ClearingCertificate";
import { DemoTooltip } from "@/components/demo/DemoTooltip";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";

/* ── Execution Phases (state machine) ── */
type ExecutionPhase = "ledger" | "auth" | "webauthn" | "complete";

/* ── Mock Orders ── */
const MOCK_ORDERS = [
  {
    id: "ORD-8842-XAU",
    asset: "400oz LBMA Good Delivery",
    qty: 100,
    notional: 106_106_000.0,
    status: "pending_execution",
    statusLabel: "PENDING EXECUTION",
    statusColor: "text-gold-primary",
    date: "2026-03-13",
    vault: "Zurich — Malca-Amit Hub 1",
  },
  {
    id: "ORD-7291-XAU",
    asset: "1kg LBMA Bar",
    qty: 250,
    notional: 16_812_500.0,
    status: "settled",
    statusLabel: "SETTLED",
    statusColor: "text-emerald-400",
    date: "2026-03-10",
    vault: "London — Brink's Sovereign",
  },
  {
    id: "ORD-6103-XAU",
    asset: "400oz LBMA Good Delivery",
    qty: 50,
    notional: 53_053_000.0,
    status: "settled",
    statusLabel: "SETTLED",
    statusColor: "text-emerald-400",
    date: "2026-03-05",
    vault: "Zurich — Malca-Amit Hub 1",
  },
];

export default function OfftakerOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";

  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>("ledger");

  /* ── Merge mock orders with any dynamically created order from marketplace ── */
  const [allOrders] = useState(() => {
    const orders = [...MOCK_ORDERS];
    if (typeof window !== "undefined") {
      const executionRaw = sessionStorage.getItem("aurumshield:execution");
      if (executionRaw) {
        try {
          const exec = JSON.parse(executionRaw) as {
            orderId: string;
            asset?: { title?: string };
            executedAt?: string;
          };
          // Only add if not already in mock orders
          if (!orders.some((o) => o.id === exec.orderId)) {
            orders.unshift({
              id: exec.orderId,
              asset: exec.asset?.title || "400oz LBMA Good Delivery",
              qty: 1,
              notional: 2_652_650.0,
              status: "pending_execution",
              statusLabel: "PENDING EXECUTION",
              statusColor: "text-gold-primary",
              date: new Date(exec.executedAt || Date.now()).toISOString().slice(0, 10),
              vault: "Zurich — Malca-Amit Hub 1",
            });
          }
        } catch {
          // Invalid JSON — skip
        }
      }
    }
    return orders;
  });

  const [selectedOrder, setSelectedOrder] = useState<(typeof MOCK_ORDERS)[0] | null>(null);

  const handleOrderClick = useCallback((order: (typeof MOCK_ORDERS)[0]) => {
    if (order.status === "pending_execution") {
      setSelectedOrder(order);
      setExecutionPhase("auth");
    } else {
      // Navigate to order details
      const demoParam = isDemoActive ? "?demo=active" : "";
      router.push(`/offtaker/orders/${order.id}${demoParam}`);
    }
  }, [isDemoActive, router]);

  const handleBothApproved = useCallback(() => {
    setExecutionPhase("webauthn");
  }, []);

  const handleAuthenticated = useCallback(() => {
    setExecutionPhase("complete");
  }, []);

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-4">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Settlement Positions
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Offtaker Allocation Ledger
        </h1>

        <p className="text-slate-400 text-xs max-w-2xl mb-4 leading-relaxed">
          All settlement positions for your institutional entity. Click a pending
          order to initiate the dual-authorization execution pipeline.
        </p>

        {/* ════════════════════════════════════════════════════════════
           PHASE: LEDGER — Show the order grid
           ════════════════════════════════════════════════════════════ */}
        {executionPhase === "ledger" && (
          <div className="bg-slate-900 border border-slate-800 rounded-sm shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 bg-black/30">
              <span className="col-span-2 font-mono text-[10px] text-slate-600 tracking-wider uppercase">
                Order Ref
              </span>
              <span className="col-span-3 font-mono text-[10px] text-slate-600 tracking-wider uppercase">
                Asset
              </span>
              <span className="col-span-1 font-mono text-[10px] text-slate-600 tracking-wider uppercase text-right">
                Qty
              </span>
              <span className="col-span-2 font-mono text-[10px] text-slate-600 tracking-wider uppercase text-right">
                Notional
              </span>
              <span className="col-span-2 font-mono text-[10px] text-slate-600 tracking-wider uppercase">
                Status
              </span>
              <span className="col-span-2 font-mono text-[10px] text-slate-600 tracking-wider uppercase text-right">
                Date
              </span>
            </div>

            {/* Rows — internal scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto">
            {allOrders.map((order, idx) => {
              const isPending = order.status === "pending_execution";
              return (
                <div key={order.id} className="relative">
                  {isDemoActive && idx === 0 && isPending && (
                    <DemoTooltip text="Click to begin dual-authorization execution ↓" position="top" />
                  )}
                  <button
                    onClick={() => handleOrderClick(order)}
                    className={`
                      w-full grid grid-cols-12 gap-2 px-4 py-3.5 text-left
                      border-b border-slate-800/50 transition-all duration-150
                      ${isPending
                        ? "hover:bg-gold-primary/5 cursor-pointer"
                        : "hover:bg-slate-800/30 cursor-pointer"
                      }
                      ${isDemoActive && idx === 0 && isPending ? DEMO_SPOTLIGHT_CLASSES : ""}
                    `}
                  >
                    <span className="col-span-2 font-mono text-xs text-white font-bold">
                      {order.id}
                    </span>
                    <span className="col-span-3 font-mono text-xs text-slate-300 truncate">
                      {order.asset}
                    </span>
                    <span className="col-span-1 font-mono text-xs text-slate-300 text-right tabular-nums">
                      {order.qty.toLocaleString()}
                    </span>
                    <span className="col-span-2 font-mono text-xs text-white font-bold text-right tabular-nums">
                      ${order.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`col-span-2 font-mono text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 ${order.statusColor}`}>
                      {isPending ? (
                        <Clock className="h-3 w-3 animate-pulse" />
                      ) : (
                        <Activity className="h-3 w-3" />
                      )}
                      {order.statusLabel}
                    </span>
                    <span className="col-span-2 font-mono text-xs text-slate-500 text-right tabular-nums flex items-center justify-end gap-1">
                      {order.date}
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                    </span>
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
           PHASE: AUTH — Dual-Authorization Gate
           ════════════════════════════════════════════════════════════ */}
        {executionPhase === "auth" && selectedOrder && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {/* Order context bar */}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-sm px-4 py-3">
              <FileText className="h-4 w-4 text-gold-primary" />
              <div>
                <span className="font-mono text-xs text-white font-bold">{selectedOrder.id}</span>
                <span className="font-mono text-xs text-slate-500 ml-3">
                  {selectedOrder.asset} × {selectedOrder.qty}
                </span>
              </div>
              <span className="ml-auto font-mono text-sm text-gold-primary font-bold tabular-nums">
                ${selectedOrder.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <DualAuthGate
              onBothApproved={handleBothApproved}
              isDemoActive={isDemoActive}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
           PHASE: WEBAUTHN — Biometric Signing Ceremony
           ════════════════════════════════════════════════════════════ */}
        {executionPhase === "webauthn" && (
          <WebAuthnModal
            onAuthenticated={handleAuthenticated}
            isDemoActive={isDemoActive}
          />
        )}

        {/* ════════════════════════════════════════════════════════════
           PHASE: COMPLETE — Clearing Certificate
           ════════════════════════════════════════════════════════════ */}
        {executionPhase === "complete" && selectedOrder && (
          <ClearingCertificate
            orderRef={selectedOrder.id}
            notionalValue={selectedOrder.notional}
            assetType={`${selectedOrder.asset} × ${selectedOrder.qty}`}
          />
        )}

        {/* ── Footer ── */}
        <p className="mt-3 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Append-Only Settlement Ledger ·
          End-to-End Encryption · Sovereign Custody
        </p>

      </div>
      <TelemetryFooter />
    </div>
  );
}
