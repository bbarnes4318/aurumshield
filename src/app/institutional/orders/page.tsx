"use client";

/* ================================================================
   TRADE BLOTTER — /institutional/orders
   ================================================================
   Ruthless, data-dense table of all historical and active atomic
   swaps. Click a row to open a slide-out detail panel — no page
   navigation. Preserves the DualAuth/WebAuthn execution pipeline.

   Zero-Scroll Layout: h-full flex flex-col overflow-hidden
   Aesthetic:           bg-slate-950, 1px border-slate-800, font-mono
   ================================================================ */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightLeft,
  Search,
  Filter,
  ChevronRight,
  X,
  Clock,
  Shield,
  FileText,
  Activity,
  Loader2,
  MapPin,
  Truck,
  Info,
  ArrowRight,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { DualAuthGate } from "@/components/checkout/DualAuthGate";
import { WebAuthnModal } from "@/components/checkout/WebAuthnModal";
import { ClearingCertificate } from "@/components/checkout/ClearingCertificate";

/* ── Types ── */

type DVPState =
  | "PENDING_WIRE"
  | "WIRE_CONFIRMED"
  | "ESCROW_LOCKED"
  | "DVP_RELEASING"
  | "DVP_SETTLED";

type LogisticsState =
  | "AWAITING_DISPATCH"
  | "BRINKS_TRANSIT"
  | "CUSTOMS_HOLD"
  | "DELIVERED"
  | "VAULTED";

type TradeStatus = "active" | "settled" | "pending_execution" | "cancelled";

interface Trade {
  id: string;
  asset: string;
  qty: number;
  notional: number;
  dvpState: DVPState;
  logisticsState: LogisticsState;
  status: TradeStatus;
  date: string;
  counterparty: string;
  vault: string;
  rail: string;
}

/* ── No mock trades — trades come only from real execution records ── */

/* ── Formatting ── */

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

/* ── State Labels ── */

const DVP_LABELS: Record<DVPState, { label: string; color: string }> = {
  PENDING_WIRE:   { label: "Pending Wire",    color: "text-[#C6A86B]" },
  WIRE_CONFIRMED: { label: "Wire Confirmed",  color: "text-blue-400" },
  ESCROW_LOCKED:  { label: "Escrow Locked",   color: "text-purple-400" },
  DVP_RELEASING:  { label: "DVP Releasing",   color: "text-amber-400" },
  DVP_SETTLED:    { label: "Settled",          color: "text-emerald-400" },
};

const LOGISTICS_LABELS: Record<LogisticsState, { label: string; color: string }> = {
  AWAITING_DISPATCH: { label: "Awaiting Dispatch", color: "text-slate-400" },
  BRINKS_TRANSIT:    { label: "Brinks Transit",    color: "text-blue-400" },
  CUSTOMS_HOLD:      { label: "Customs Hold",      color: "text-amber-400" },
  DELIVERED:         { label: "Delivered",          color: "text-emerald-400" },
  VAULTED:           { label: "Vaulted",            color: "text-emerald-400" },
};

/* States that imply asset movement — these get a "Track Asset" button */
const TRACKABLE_LOGISTICS: LogisticsState[] = [
  "AWAITING_DISPATCH",
  "BRINKS_TRANSIT",
  "CUSTOMS_HOLD",
];

const STATUS_FILTERS: { value: TradeStatus | "all"; label: string }[] = [
  { value: "all",               label: "All Trades" },
  { value: "pending_execution", label: "Pending" },
  { value: "active",            label: "Active" },
  { value: "settled",           label: "Settled" },
  { value: "cancelled",         label: "Cancelled" },
];

/* ── Execution pipeline state machine ── */
type ExecutionPhase = "idle" | "auth" | "webauthn" | "complete";

/* ================================================================
   SLIDE-OUT DRAWER
   ================================================================ */

function TradeDrawer({
  trade,
  onClose,
}: {
  trade: Trade;
  onClose: () => void;
}) {
  const [execPhase, setExecPhase] = useState<ExecutionPhase>("idle");
  const dvp = DVP_LABELS[trade.dvpState];
  const logistics = LOGISTICS_LABELS[trade.logisticsState];
  const isPending = trade.status === "pending_execution";

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-slate-800 bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={`Trade ${trade.id} Details`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-mono text-sm font-bold text-white">{trade.id}</h2>
            <p className="font-mono text-[10px] text-slate-500 mt-0.5">
              {trade.asset} × {trade.qty} · {trade.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {execPhase === "idle" ? (
            <div className="p-5 space-y-4">
              {/* Notional */}
              <div className="border border-slate-800 bg-black/40 p-4">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block mb-1">
                  Notional Value
                </span>
                <span className="font-mono text-2xl text-[#C6A86B] font-bold tabular-nums">
                  {fmtUsd(trade.notional)}
                </span>
              </div>

              {/* State Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-800 bg-slate-900/50 p-3">
                  <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider block mb-1.5">
                    DVP Escrow State
                  </span>
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider ${dvp.color}`}>
                    {dvp.label}
                  </span>
                </div>
                <div className="border border-slate-800 bg-slate-900/50 p-3">
                  <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider block mb-1.5">
                    Logistics State
                  </span>
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider ${logistics.color}`}>
                    {logistics.label}
                  </span>
                </div>
              </div>

              {/* Trade Details */}
              <div className="border border-slate-800 bg-slate-900/30 p-4 space-y-3">
                <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Trade Details
                </h3>
                {[
                  { label: "Counterparty", value: trade.counterparty },
                  { label: "Settlement Rail", value: trade.rail },
                  { label: "Vault / Destination", value: trade.vault },
                  { label: "Trade Date", value: trade.date },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">{row.label}</span>
                    <span className="font-mono text-[11px] text-slate-300 text-right max-w-[60%] truncate">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="border border-slate-800 bg-slate-900/30 p-4">
                <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  Settlement Timeline
                </h3>
                <div className="space-y-3">
                  {[
                    { step: "Order Placed", done: true, time: `${trade.date} 09:00 UTC` },
                    { step: "Wire Initiated", done: trade.dvpState !== "PENDING_WIRE", time: trade.dvpState !== "PENDING_WIRE" ? `${trade.date} 10:15 UTC` : "—" },
                    { step: "Escrow Locked", done: ["ESCROW_LOCKED", "DVP_RELEASING", "DVP_SETTLED"].includes(trade.dvpState), time: ["ESCROW_LOCKED", "DVP_RELEASING", "DVP_SETTLED"].includes(trade.dvpState) ? `${trade.date} 11:30 UTC` : "—" },
                    { step: "DVP Settlement", done: trade.dvpState === "DVP_SETTLED", time: trade.dvpState === "DVP_SETTLED" ? `${trade.date} 14:00 UTC` : "—" },
                    { step: "Custody Transfer", done: ["DELIVERED", "VAULTED"].includes(trade.logisticsState), time: ["DELIVERED", "VAULTED"].includes(trade.logisticsState) ? `${trade.date} 16:00 UTC` : "—" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          item.done
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                            : "bg-slate-700"
                        }`}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span
                          className={`font-mono text-[10px] ${
                            item.done ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          {item.step}
                        </span>
                        <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execute Button (pending orders only) */}
              {isPending && (
                <button
                  type="button"
                  onClick={() => setExecPhase("auth")}
                  className="w-full flex items-center justify-center gap-2 rounded border border-[#C6A86B]/40 bg-[#C6A86B]/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#C6A86B] hover:bg-[#C6A86B]/20 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Initiate Execution Pipeline
                </button>
              )}

              {/* Track Asset — orders with movement logistics */}
              {TRACKABLE_LOGISTICS.includes(trade.logisticsState) && (
                <Link
                  href={`/institutional/settlement/SC-${trade.id.replace("ORD-", "")}`}
                  className="w-full flex items-center justify-center gap-2 rounded border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Track Asset
                </Link>
              )}
            </div>
          ) : execPhase === "auth" ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-3">
                <FileText className="h-4 w-4 text-[#C6A86B]" />
                <div>
                  <span className="font-mono text-xs text-white font-bold">{trade.id}</span>
                  <span className="font-mono text-xs text-slate-500 ml-3">
                    {trade.asset} × {trade.qty}
                  </span>
                </div>
                <span className="ml-auto font-mono text-sm text-[#C6A86B] font-bold tabular-nums">
                  {fmtUsd(trade.notional)}
                </span>
              </div>
              <DualAuthGate
                onBothApproved={() => setExecPhase("webauthn")}
                isDemoActive={false}
              />
            </div>
          ) : execPhase === "webauthn" ? (
            <div className="p-5">
              <WebAuthnModal
                onAuthenticated={() => setExecPhase("complete")}
                isDemoActive={false}
              />
            </div>
          ) : (
            <div className="p-5">
              <ClearingCertificate
                orderRef={trade.id}
                notionalValue={trade.notional}
                assetType={`${trade.asset} × ${trade.qty}`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 bg-black/80 px-5 py-3">
          <p className="font-mono text-[9px] text-slate-600 text-center tracking-wider">
            AurumShield Clearing · Append-Only Audit Trail · Sovereign Custody
          </p>
        </div>
      </aside>
    </>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function InstitutionalOrdersPage() {
  const router = useRouter();
  const { data: onboardingState, isLoading: complianceLoading, isError } = useOnboardingState();
  const isCleared = onboardingState?.status === "COMPLETED";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TradeStatus | "all">("all");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  /* ── All hooks MUST be above early returns ── */

  /* ── Only real execution records from marketplace (no pre-seeded mocks) ── */
  const allTrades = useMemo(() => {
    const trades: Trade[] = [];
    if (typeof window !== "undefined") {
      const executionRaw = sessionStorage.getItem("aurumshield:execution");
      if (executionRaw) {
        try {
          const exec = JSON.parse(executionRaw) as {
            orderId: string;
            asset?: { title?: string; shortName?: string };
            executedAt?: string;
            deliveryMode?: string;
            destination?: string;
            rail?: string;
          };
          trades.push({
            id: exec.orderId,
            asset: exec.asset?.shortName || exec.asset?.title || "Gold Bar",
            qty: 1,
            notional: 0,
            dvpState: "PENDING_WIRE",
            logisticsState: "AWAITING_DISPATCH",
            status: "pending_execution",
            date: exec.executedAt
              ? new Date(exec.executedAt).toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            counterparty: "Self-Directed",
            vault: exec.destination ?? "Pending Assignment",
            rail: exec.rail === "FEDWIRE" ? "Fedwire RTGS" : exec.rail === "TURNKEY_USDT" ? "USDT (ERC-20)" : (exec.rail ?? "Fedwire RTGS"),
          });
        } catch {
          // Invalid JSON — skip
        }
      }
    }
    return trades;
  }, []);

  const filteredTrades = useMemo(() => {
    return allTrades.filter((trade) => {
      const matchesSearch =
        searchQuery === "" ||
        trade.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || trade.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTrades, searchQuery, statusFilter]);

  const handleRowClick = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
  }, []);

  /* ── Hard Ejection ── */
  useEffect(() => {
    if (!complianceLoading && !isError && !isCleared) {
      router.replace("/institutional/get-started/welcome");
    }
  }, [complianceLoading, isCleared, isError, router]);

  if (complianceLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">Syncing Telemetry...</span>
        </div>
      </div>
    );
  }

  if (!isCleared) {
    return <div className="h-full bg-slate-950" />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A86B]/10">
              <ArrowRightLeft className="h-4.5 w-4.5 text-[#C6A86B]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Trade Blotter
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Atomic Swap Ledger · DVP Settlement Pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] tracking-wider uppercase">
              {filteredTrades.length} / {allTrades.length} Trades
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Pipeline Cards ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/20">
        {(() => {
          const active = allTrades.filter((t) => t.status === "active" || t.status === "pending_execution");
          const inTransit = allTrades.filter((t) => t.logisticsState === "BRINKS_TRANSIT" || t.logisticsState === "CUSTOMS_HOLD");
          const pendingDispatch = allTrades.filter((t) => t.logisticsState === "AWAITING_DISPATCH");
          const pipelineAum = active.reduce((s, t) => s + t.notional, 0);
          return (
            <>
              <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
                <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Active Deals</p>
                <p className="font-mono text-lg font-bold text-white mt-1 leading-none">{active.length}</p>
                <p className="font-mono text-[10px] text-slate-600 mt-0.5">of {allTrades.length} total</p>
              </div>
              <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
                <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Pipeline AUM</p>
                <p className="font-mono text-lg font-bold text-[#C6A86B] mt-1 leading-none tabular-nums">{fmtUsd(pipelineAum)}</p>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className="font-mono text-[9px] text-[#C6A86B]/60 mt-0.5 hover:text-[#C6A86B] transition-colors block"
                >
                  View Active Pipeline →
                </button>
              </div>
              <div className="rounded border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <p className="font-mono text-[9px] text-blue-400/60 uppercase tracking-widest">In Transit</p>
                <p className="font-mono text-lg font-bold text-blue-400 mt-1 leading-none">{inTransit.length}</p>
                <p className="font-mono text-[10px] text-slate-600 mt-0.5">Brink&apos;s / Customs</p>
              </div>
              <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
                <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Pending Dispatch</p>
                <p className="font-mono text-lg font-bold text-amber-400 mt-1 leading-none">{pendingDispatch.length}</p>
                <p className="font-mono text-[10px] text-slate-600 mt-0.5">awaiting shipment</p>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Filter Bar ── */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/30 px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Trade ID…"
              className="w-full bg-black border border-slate-700 pl-9 pr-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-[#C6A86B] focus:ring-1 focus:ring-[#C6A86B]/30 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors border ${
                    statusFilter === filter.value
                      ? "border-[#C6A86B]/40 bg-[#C6A86B]/10 text-[#C6A86B]"
                      : "border-slate-800 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Sticky Header */}
        <div className="shrink-0 grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-800 bg-black/40">
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Trade ID
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Asset
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">
            Notional Value
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            DVP Escrow
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Logistics
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">
            Actions
          </span>
        </div>

        {/* Scrollable Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 mb-3">
                <ArrowRightLeft className="h-5 w-5 text-slate-600" />
              </div>
              <p className="font-mono text-sm text-slate-400 font-semibold mb-1">
                No settlement cases initiated yet
              </p>
              <p className="font-mono text-[11px] text-slate-600 max-w-sm leading-relaxed mb-4">
                Trades will appear here as you execute orders through the
                marketplace. Each trade tracks DvP escrow state and logistics.
              </p>
              <Link
                href="/institutional/marketplace"
                className="inline-flex items-center gap-2 border border-[#C6A86B]/30 bg-[#C6A86B]/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C6A86B] hover:bg-[#C6A86B]/20 transition-colors"
              >
                Open Marketplace
                <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="mt-4 inline-flex items-center gap-1 font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                <Info className="h-2.5 w-2.5" />
                Derived from settlement cases
              </span>
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const dvp = DVP_LABELS[trade.dvpState];
              const logistics = LOGISTICS_LABELS[trade.logisticsState];
              const isPending = trade.status === "pending_execution";

              return (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => handleRowClick(trade)}
                  className="w-full grid grid-cols-12 gap-2 px-6 py-3.5 text-left border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                  {/* Trade ID */}
                  <span className="col-span-2 font-mono text-xs text-white font-bold flex items-center gap-1.5">
                    {isPending && (
                      <Clock className="h-3 w-3 text-[#C6A86B] animate-pulse shrink-0" />
                    )}
                    {trade.id}
                  </span>

                  {/* Asset */}
                  <span className="col-span-2 font-mono text-xs text-slate-300">
                    {trade.asset} × {trade.qty.toLocaleString()}
                  </span>

                  {/* Notional */}
                  <span className="col-span-2 font-mono text-xs text-white font-bold text-right tabular-nums">
                    {fmtUsd(trade.notional)}
                  </span>

                  {/* DVP State */}
                  <span className={`col-span-2 font-mono text-[10px] font-bold uppercase tracking-wider ${dvp.color}`}>
                    {dvp.label}
                  </span>

                  {/* Logistics */}
                  <span className={`col-span-2 font-mono text-[10px] font-bold uppercase tracking-wider ${logistics.color}`}>
                    {logistics.label}
                  </span>

                  {/* Actions */}
                  <span className="col-span-2 flex items-center justify-end gap-2">
                    {(trade.status === "pending_execution" || trade.status === "active") && (
                      <Link
                        href={`/institutional/settlement/SC-${trade.id.replace("ORD-", "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded border border-[#C6A86B]/30 bg-[#C6A86B]/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#C6A86B] hover:bg-[#C6A86B]/20 transition-colors"
                      >
                        <Shield className="h-2.5 w-2.5" />
                        Case
                      </Link>
                    )}
                    {TRACKABLE_LOGISTICS.includes(trade.logisticsState) && (
                      <Link
                        href={`/institutional/settlement/SC-${trade.id.replace("ORD-", "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        Track
                      </Link>
                    )}
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="font-mono text-[9px] tracking-wider uppercase">
                        Detail
                      </span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2">
        <p className="font-mono text-[9px] text-slate-700 text-center tracking-wider">
          AurumShield Clearing · Append-Only Settlement Ledger · End-to-End Encryption · Sovereign Custody
        </p>
      </div>

      {/* ── Telemetry Footer ── */}
      <TelemetryFooter />

      {/* ── Slide-Out Drawer ── */}
      {selectedTrade && (
        <TradeDrawer
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
}


