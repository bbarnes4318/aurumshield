"use client";

/* ================================================================
   COUNTERPARTY TRANSACTIONS — /counterparty/transactions
   ================================================================
   Full transaction history for counterparty entities. Dense data
   table with DVP state tracking and settlement pipeline visibility.
   ================================================================ */

import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  Search,
  Filter,
  Activity,
} from "lucide-react";

/* ── Types ── */
type TxStatus = "PENDING_WIRE" | "WIRE_CONFIRMED" | "ESCROW_LOCKED" | "DVP_RELEASING" | "DVP_SETTLED";

interface Transaction {
  id: string;
  counterparty: string;
  asset: string;
  notional: number;
  status: TxStatus;
  date: string;
  rail: string;
}

/* ── Mock data ── */
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "CP-001", counterparty: "AurumShield Prime", asset: "400oz LBMA × 5", notional: 13_263_250, status: "ESCROW_LOCKED", date: "2026-03-20", rail: "Fedwire RTGS" },
  { id: "CP-002", counterparty: "AurumShield Prime", asset: "1kg Bar × 20", notional: 1_681_250, status: "DVP_SETTLED", date: "2026-03-18", rail: "USDT (ERC-20)" },
  { id: "CP-003", counterparty: "AurumShield Prime", asset: "400oz LBMA × 2", notional: 5_305_300, status: "PENDING_WIRE", date: "2026-03-21", rail: "Fedwire RTGS" },
  { id: "CP-004", counterparty: "AurumShield Prime", asset: "10oz Cast × 50", notional: 1_326_325, status: "DVP_SETTLED", date: "2026-03-15", rail: "Fedwire RTGS" },
  { id: "CP-005", counterparty: "AurumShield Prime", asset: "400oz LBMA × 8", notional: 21_221_200, status: "WIRE_CONFIRMED", date: "2026-03-19", rail: "Fedwire RTGS" },
  { id: "CP-006", counterparty: "AurumShield Prime", asset: "1kg Bar × 10", notional: 840_625, status: "DVP_SETTLED", date: "2026-03-12", rail: "USDT (ERC-20)" },
] as const;

/* ── Status styles ── */
const STATUS_META: Record<TxStatus, { label: string; color: string }> = {
  PENDING_WIRE:   { label: "Pending Wire",   color: "text-yellow-400" },
  WIRE_CONFIRMED: { label: "Wire Confirmed", color: "text-blue-400" },
  ESCROW_LOCKED:  { label: "Escrow Locked",  color: "text-purple-400" },
  DVP_RELEASING:  { label: "DVP Releasing",  color: "text-[#C6A86B]" },
  DVP_SETTLED:    { label: "Settled",         color: "text-emerald-400" },
};

const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

/* ── Filter options ── */
const FILTER_OPTIONS: { value: TxStatus | "all"; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "PENDING_WIRE",   label: "Pending" },
  { value: "WIRE_CONFIRMED", label: "Confirmed" },
  { value: "ESCROW_LOCKED",  label: "Escrow" },
  { value: "DVP_SETTLED",    label: "Settled" },
];

export default function CounterpartyTransactionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TxStatus | "all">("all");

  const filtered = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((tx) => {
      const matchesSearch = search === "" || tx.id.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || tx.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A86B]/10">
              <ArrowLeftRight className="h-4.5 w-4.5 text-[#C6A86B]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Transaction Ledger
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                DVP Settlement Pipeline · Counterparty View
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] tracking-wider uppercase">
              {filtered.length} / {MOCK_TRANSACTIONS.length} Transactions
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/30 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TX ID..."
              className="w-full bg-black border border-slate-700 pl-9 pr-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-[#C6A86B] focus:ring-1 focus:ring-[#C6A86B]/30 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors border ${
                  filter === opt.value
                    ? "border-[#C6A86B]/40 bg-[#C6A86B]/10 text-[#C6A86B]"
                    : "border-slate-800 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-800 bg-black/40">
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">TX ID</span>
          <span className="col-span-3 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Asset</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Notional</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Status</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Rail</span>
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Date</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-600">
              <span className="font-mono text-xs">No transactions match current filters</span>
            </div>
          ) : (
            filtered.map((tx) => {
              const meta = STATUS_META[tx.status];
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-12 gap-2 px-6 py-3.5 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                >
                  <span className="col-span-2 font-mono text-xs text-white font-bold">{tx.id}</span>
                  <span className="col-span-3 font-mono text-xs text-slate-300">{tx.asset}</span>
                  <span className="col-span-2 font-mono text-xs text-white font-bold text-right tabular-nums">{fmtUsd(tx.notional)}</span>
                  <span className={`col-span-2 font-mono text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  <span className="col-span-2 font-mono text-[10px] text-slate-500">{tx.rail}</span>
                  <span className="col-span-1 font-mono text-[10px] text-slate-500 text-right">{tx.date}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2">
        <p className="font-mono text-[9px] text-slate-700 text-center tracking-wider">
          AurumShield Clearing · Counterparty Settlement Ledger · End-to-End Encryption
        </p>
      </div>
    </div>
  );
}
