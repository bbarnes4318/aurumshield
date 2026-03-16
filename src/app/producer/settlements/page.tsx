"use client";

/* ================================================================
   PRODUCER ESCROW RELEASES — Settlement Payout History
   ================================================================
   Shows all completed and pending settlement payouts for the
   authenticated producer. Displays payout rail, amount, status,
   and completion timestamps.
   ================================================================ */

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  Banknote,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import ProducerTelemetryFooter from "@/components/producer/ProducerTelemetryFooter";

/* ----------------------------------------------------------------
   MOCK SETTLEMENT DATA
   ---------------------------------------------------------------- */
interface SettlementPayout {
  orderId: string;
  amount: number;
  rail: "FEDWIRE" | "USDT";
  railLabel: string;
  status: "SETTLED" | "IN_FLIGHT" | "PENDING";
  settledAt: string | null;
  offtakerEntity: string;
}

const MOCK_PAYOUTS: SettlementPayout[] = [
  {
    orderId: "ORDER-8801",
    amount: 1_250_000,
    rail: "FEDWIRE",
    railLabel: "Column Bank (Fedwire RTGS)",
    status: "SETTLED",
    settledAt: "2026-03-10T14:22:00Z",
    offtakerEntity: "Aureus Capital Partners Ltd.",
  },
  {
    orderId: "ORDER-8790",
    amount: 3_100_000,
    rail: "FEDWIRE",
    railLabel: "Column Bank (Fedwire RTGS)",
    status: "SETTLED",
    settledAt: "2026-03-08T09:15:00Z",
    offtakerEntity: "Sovereign Metals Group AG",
  },
  {
    orderId: "ORDER-8842",
    amount: 2_052_000,
    rail: "FEDWIRE",
    railLabel: "Column Bank (Fedwire RTGS)",
    status: "IN_FLIGHT",
    settledAt: null,
    offtakerEntity: "Aureus Capital Partners Ltd.",
  },
  {
    orderId: "ORDER-9910",
    amount: 500_000,
    rail: "USDT",
    railLabel: "Turnkey MPC (USDT ERC-20)",
    status: "IN_FLIGHT",
    settledAt: null,
    offtakerEntity: "Dubai Gold & Commodities DWC-LLC",
  },
  {
    orderId: "ORDER-9001",
    amount: 780_000,
    rail: "USDT",
    railLabel: "Turnkey MPC (USDT ERC-20)",
    status: "PENDING",
    settledAt: null,
    offtakerEntity: "Pacific Rim Metals Pte. Ltd.",
  },
];

/* ── Formatter ── */
function fmtUsd(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function ProducerSettlementsPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "active";
  const [filter, setFilter] = useState<"ALL" | "SETTLED" | "IN_FLIGHT" | "PENDING">("ALL");

  const payouts = MOCK_PAYOUTS.filter(
    (p) => filter === "ALL" || p.status === filter
  );

  const totalSettled = MOCK_PAYOUTS.filter((p) => p.status === "SETTLED").reduce((s, p) => s + p.amount, 0);
  const totalInFlight = MOCK_PAYOUTS.filter((p) => p.status === "IN_FLIGHT" || p.status === "PENDING").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-4 py-3">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Producer Settlement Ledger
          </span>
          {isDemo && (
            <span className="ml-1 font-mono text-[8px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 tracking-wider uppercase">
              DEMO
            </span>
          )}
        </div>
        <h1 className="font-mono text-2xl text-white font-bold tracking-tight mb-1">
          Escrow Release History
        </h1>
        <p className="font-mono text-[11px] text-slate-600 mb-4">
          ALL PAYOUTS · FEDWIRE RTGS · USDT ERC-20 · SETTLEMENT ENGINE
        </p>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-800 border border-slate-800 mb-3 shrink-0">
          <div className="bg-slate-900 p-5 border-t-2 border-t-emerald-500/40">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
                Total Settled (YTD)
              </span>
            </div>
            <p className="font-mono text-xl text-white font-bold tabular-nums tracking-tight">
              {fmtUsd(totalSettled)}
            </p>
          </div>
          <div className="bg-slate-900 p-5 border-t-2 border-t-gold-primary/40">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-gold-primary" />
              <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
                In Flight / Pending
              </span>
            </div>
            <p className="font-mono text-xl text-white font-bold tabular-nums tracking-tight">
              {fmtUsd(totalInFlight)}
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          {(["ALL", "SETTLED", "IN_FLIGHT", "PENDING"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border transition-colors cursor-pointer ${
                filter === f
                  ? "bg-gold-primary/10 border-gold-primary/40 text-gold-primary"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              {f === "IN_FLIGHT" ? "IN FLIGHT" : f}
            </button>
          ))}
        </div>

        {/* ── Payout Table ── */}
        <div className="bg-slate-900 border border-slate-800 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 bg-black/30">
            <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Order Ref
            </span>
            <span className="col-span-3 font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Offtaker
            </span>
            <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase text-right">
              Amount
            </span>
            <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Rail
            </span>
            <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Status
            </span>
            <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase text-right">
              Action
            </span>
          </div>

          {/* Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto">
          {payouts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-mono text-xs text-slate-600">No payouts match the current filter.</p>
            </div>
          ) : (
            payouts.map((p) => (
              <div
                key={p.orderId}
                className="grid grid-cols-12 gap-2 px-4 py-3.5 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <span className="col-span-2 font-mono text-xs text-white font-bold">
                  {p.orderId}
                </span>
                <span className="col-span-3 font-mono text-xs text-slate-400 truncate">
                  {p.offtakerEntity}
                </span>
                <span className={`col-span-2 font-mono text-xs font-bold tabular-nums text-right ${
                  p.rail === "FEDWIRE" ? "text-gold-primary" : "text-cyan-400"
                }`}>
                  {fmtUsd(p.amount)}
                </span>
                <span className={`col-span-2 font-mono text-[10px] tracking-wider uppercase ${
                  p.rail === "FEDWIRE" ? "text-gold-primary/60" : "text-cyan-400/60"
                }`}>
                  {p.rail === "FEDWIRE" ? "FEDWIRE" : "USDT"}
                </span>
                <span className="col-span-2">
                  {p.status === "SETTLED" ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      SETTLED
                    </span>
                  ) : p.status === "IN_FLIGHT" ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase font-bold text-gold-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-pulse" />
                      IN FLIGHT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase font-bold text-slate-500">
                      <Clock className="h-3 w-3" />
                      PENDING
                    </span>
                  )}
                </span>
                <span className="col-span-1 text-right">
                  <Link
                    href={`/producer/orders/${p.orderId}/settlement${isDemo ? '?demo=active' : ''}`}
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-gold-primary tracking-wider uppercase transition-colors"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </span>
              </div>
            ))
          )}
          </div>
        </div>

        <p className="mt-3 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Producer Settlement Ledger · Column Bank · Turnkey MPC
        </p>
      </div>

      <ProducerTelemetryFooter />
    </div>
  );
}
