"use client";

/* ================================================================
   COUNTERPARTY DASHBOARD — /counterparty
   ================================================================
   Dashboard for counterparty entities. Checks AML training status
   and renders a blocking banner if training is incomplete.
   Shows verification metrics, active transactions, and settlement totals.
   ================================================================ */

import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
} from "lucide-react";
import { useAmlStatus } from "@/hooks/use-aml-status";

/* ── Mock counterparty data ── */
const MOCK_TRANSACTIONS = [
  { id: "CP-001", counterparty: "AurumShield Prime", asset: "400oz LBMA × 5", notional: 13_263_250, status: "ESCROW_LOCKED", date: "2026-03-20" },
  { id: "CP-002", counterparty: "AurumShield Prime", asset: "1kg Bar × 20", notional: 1_681_250, status: "DVP_SETTLED", date: "2026-03-18" },
  { id: "CP-003", counterparty: "AurumShield Prime", asset: "400oz LBMA × 2", notional: 5_305_300, status: "PENDING_WIRE", date: "2026-03-21" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING_WIRE: "text-yellow-400",
  ESCROW_LOCKED: "text-purple-400",
  DVP_SETTLED: "text-emerald-400",
};

const fmtUsd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function CounterpartyDashboard() {
  const { data: amlStatus, isLoading } = useAmlStatus();
  const isAmlComplete = amlStatus?.isComplete ?? false;

  const activeCount = MOCK_TRANSACTIONS.filter((t) => t.status !== "DVP_SETTLED").length;
  const settledNotional = MOCK_TRANSACTIONS.filter((t) => t.status === "DVP_SETTLED").reduce((s, t) => s + t.notional, 0);
  const pipelineNotional = MOCK_TRANSACTIONS.filter((t) => t.status !== "DVP_SETTLED").reduce((s, t) => s + t.notional, 0);

  return (
    <div className="absolute inset-0 flex flex-col p-4 overflow-hidden gap-4">
      {/* ── AML BLOCKING BANNER ── */}
      {!isAmlComplete && !isLoading && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 rounded border border-red-500/40 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">
              AML Training Required
            </p>
            <p className="text-[11px] text-red-400/70 mt-0.5">
              You must complete mandatory AML training before executing any transactions.
            </p>
          </div>
          <Link
            href="/counterparty/compliance"
            className="shrink-0 font-mono text-[10px] text-red-300 border border-red-500/30 px-4 py-2 hover:bg-red-500/20 transition-colors uppercase tracking-wider font-bold"
          >
            Complete Training →
          </Link>
        </div>
      )}

      {/* ── KPI ROW ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Verification Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            {isAmlComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-sm font-bold text-emerald-400">VERIFIED</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="font-mono text-sm font-bold text-yellow-400">PENDING</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Active Transactions
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-100 leading-none">
            {activeCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">of {MOCK_TRANSACTIONS.length} total</p>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Pipeline Notional
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-[#C6A86B] leading-none tabular-nums">
            {fmtUsd(pipelineNotional)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">pending settlement</p>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Settled Total
          </p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-emerald-400 leading-none tabular-nums">
            {fmtUsd(settledNotional)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">all-time</p>
        </div>
      </div>

      {/* ── RECENT TRANSACTIONS TABLE ── */}
      <div className="flex-1 min-h-0 flex flex-col rounded border border-slate-800 bg-slate-900/40">
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
            <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              Recent Transactions
            </h2>
          </div>
          <Link
            href="/counterparty/transactions"
            className="font-mono text-[10px] text-[#C6A86B] hover:text-[#d4b94d] transition-colors uppercase tracking-wider"
          >
            View All →
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
              <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="text-left px-4 py-2 font-medium">TX ID</th>
                <th className="text-left px-4 py-2 font-medium">Asset</th>
                <th className="text-right px-4 py-2 font-medium">Notional</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 font-semibold">{tx.id}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-300">{tx.asset}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-200 tabular-nums">{fmtUsd(tx.notional)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${STATUS_COLORS[tx.status] ?? "text-slate-500"}`}>
                      {tx.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-500">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
