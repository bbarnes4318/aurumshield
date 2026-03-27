"use client";

/* ================================================================
   ORDER DETAIL — /institutional/orders/[orderId]
   ================================================================
   Resolves the 404 from marketplace execution. Renders a compact
   order view and links to the Settlement Case operational center.

   Data sources (priority order):
     1. settlement_cases DB table (via API — future)
     2. sessionStorage aurumshield:execution (marketplace)
     3. Mock data fallback for known mock trade IDs
   ================================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Shield,
  Loader2,
  Vault,
  Truck,
  Activity,
} from "lucide-react";

/* ── Types ── */

interface OrderData {
  orderId: string;
  asset: string;
  quantity: number;
  deliveryMode: string;
  destination: string;
  rail: string;
  executedAt: string;
  notional: number;
  status: string;
}

/* ── Known Mock Orders ── */

const MOCK_ORDERS: Record<string, OrderData> = {
  "ORD-8842-XAU": {
    orderId: "ORD-8842-XAU",
    asset: "400oz LBMA",
    quantity: 100,
    deliveryMode: "VAULT",
    destination: "Zurich — Malca-Amit Hub 1",
    rail: "Fedwire RTGS",
    executedAt: "2026-03-18T09:00:00Z",
    notional: 106_106_000,
    status: "pending_execution",
  },
  "ORD-8837-XAU": {
    orderId: "ORD-8837-XAU",
    asset: "1kg Bar",
    quantity: 250,
    deliveryMode: "VAULT",
    destination: "London — Brink's Sovereign",
    rail: "USDT (ERC-20)",
    executedAt: "2026-03-17T11:00:00Z",
    notional: 16_812_500,
    status: "active",
  },
  "ORD-8801-XAU": {
    orderId: "ORD-8801-XAU",
    asset: "400oz LBMA",
    quantity: 50,
    deliveryMode: "VAULT",
    destination: "Singapore — Malca-Amit Asia",
    rail: "Fedwire RTGS",
    executedAt: "2026-03-15T14:00:00Z",
    notional: 53_053_000,
    status: "settled",
  },
};

/* ── Formatters ── */

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      // Source 1: Mock orders
      if (MOCK_ORDERS[orderId]) {
        setOrder(MOCK_ORDERS[orderId]);
        setLoading(false);
        return;
      }

      // Source 2: sessionStorage (marketplace execution)
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("aurumshield:execution");
        if (raw) {
          try {
            const exec = JSON.parse(raw) as {
              orderId: string;
              asset?: { shortName?: string; title?: string };
              deliveryMode?: string;
              destination?: string;
              rail?: string;
              executedAt?: string;
            };

            if (exec.orderId === orderId) {
              setOrder({
                orderId: exec.orderId,
                asset: exec.asset?.shortName ?? exec.asset?.title ?? "Gold Bar",
                quantity: 1,
                deliveryMode: exec.deliveryMode ?? "VAULT",
                destination: exec.destination ?? "Pending Assignment",
                rail: exec.rail === "FEDWIRE" ? "Fedwire RTGS" : exec.rail === "TURNKEY_USDT" ? "USDT (ERC-20)" : (exec.rail ?? "Fedwire RTGS"),
                executedAt: exec.executedAt ?? new Date().toISOString(),
                notional: 0,
                status: "pending_execution",
              });
              setLoading(false);
              return;
            }
          } catch {
            // Invalid JSON
          }
        }
      }

      setLoading(false);
    });
  }, [orderId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-[#C6A86B] animate-spin" />
          <p className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Loading Order…
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-slate-900">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
          <h2 className="font-mono text-sm text-white font-bold">
            Order Not Found
          </h2>
          <p className="font-mono text-[11px] text-slate-500 leading-relaxed">
            No order found for reference{" "}
            <strong className="text-slate-400">{orderId}</strong>.
          </p>
          <Link
            href="/institutional/orders"
            className="font-mono text-[10px] text-[#C6A86B] tracking-wider uppercase hover:text-[#d4b87a] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Return to Trade Blotter
          </Link>
        </div>
      </div>
    );
  }

  const caseRef = `SC-${orderId.replace("ORD-", "")}`;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/institutional/orders")}
              className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <h1 className="font-mono text-sm text-white font-bold tracking-wide">
                {order.orderId}
              </h1>
              <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                Executed {fmtTime(order.executedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Order Detail
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Order Summary */}
          <div className="border border-slate-800 bg-black/40 p-5 space-y-3">
            <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
              Order Summary
            </h3>
            <div className="space-y-2">
              {[
                { label: "Order ID", value: order.orderId },
                { label: "Asset", value: `${order.asset} × ${order.quantity}` },
                {
                  label: "Handling",
                  value: order.deliveryMode === "VAULT" ? "Vaulted Custody" : "Physical Delivery",
                  icon: order.deliveryMode === "VAULT" ? <Vault className="h-3 w-3 text-[#C6A86B]" /> : <Truck className="h-3 w-3 text-[#C6A86B]" />,
                },
                { label: "Destination", value: order.destination },
                { label: "Rail", value: order.rail },
                { label: "Status", value: order.status.replace(/_/g, " ").toUpperCase() },
                ...(order.notional > 0 ? [{ label: "Notional", value: fmtUsd(order.notional) }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500">{row.label}</span>
                  <span className="font-mono text-[11px] text-slate-300 text-right max-w-[60%] truncate flex items-center gap-1.5">
                    {"icon" in row && row.icon}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Case Link */}
          <Link
            href={`/institutional/settlement/${caseRef}`}
            className="flex items-center justify-between w-full p-5 border border-[#C6A86B]/20 bg-[#C6A86B]/5 hover:bg-[#C6A86B]/10 hover:border-[#C6A86B]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#C6A86B]/30 bg-[#C6A86B]/10">
                <Activity className="h-4 w-4 text-[#C6A86B]" />
              </div>
              <div>
                <p className="font-mono text-xs text-white font-bold">
                  View Settlement Case
                </p>
                <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                  Live operational center · {caseRef}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C6A86B]" />
          </Link>

          {/* Back to Blotter */}
          <Link
            href="/institutional/orders"
            className="flex items-center justify-center gap-2 w-full py-3 border border-slate-800 bg-slate-900/30 font-mono text-[10px] text-slate-500 tracking-wider uppercase hover:text-white hover:border-slate-600 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Return to Trade Blotter
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2">
        <p className="font-mono text-[9px] text-slate-700 text-center tracking-wider">
          AurumShield Clearing · Append-Only Settlement Ledger · End-to-End Encryption
        </p>
      </div>
    </div>
  );
}
