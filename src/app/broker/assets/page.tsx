"use client";

/* ================================================================
   LBMA ASSET INTAKE — Broker Inventory + Verification Panel
   ================================================================
   Zero-scroll dual-pane: vaulted bar inventory (left) and
   LBMA Good Delivery verification intake form (right).
   ================================================================ */

import { useState, useCallback } from "react";
import LbmaVerificationPanel from "@/components/compliance/LbmaVerificationPanel";
import type { LbmaAccreditationData } from "@/components/compliance/LbmaVerificationPanel";

/* ── Mock vaulted bar inventory ── */
const MOCK_BARS = [
  { serial: "GD-2026-001", refiner: "Valcambi SA",         vault: "Zurich Custody Vault",        weightOz: 400, purity: "999.9", status: "VERIFIED" },
  { serial: "GD-2026-002", refiner: "PAMP SA",             vault: "Zurich Custody Vault",        weightOz: 400, purity: "999.9", status: "VERIFIED" },
  { serial: "GD-2026-003", refiner: "Argor-Heraeus",       vault: "London Clearing Centre",      weightOz: 400, purity: "999.9", status: "PENDING" },
  { serial: "GD-2026-004", refiner: "Metalor Technologies", vault: "London Clearing Centre",     weightOz: 400, purity: "999.5", status: "VERIFIED" },
  { serial: "GD-2026-005", refiner: "Rand Refinery",       vault: "Singapore Settlement Node",   weightOz: 400, purity: "999.9", status: "VERIFIED" },
  { serial: "GD-2026-006", refiner: "Perth Mint",          vault: "Singapore Settlement Node",   weightOz: 400, purity: "999.9", status: "PENDING" },
  { serial: "GD-2026-007", refiner: "Royal Canadian Mint", vault: "New York Trading Floor",      weightOz: 400, purity: "999.9", status: "VERIFIED" },
  { serial: "GD-2026-008", refiner: "Tanaka Kikinzoku",    vault: "Frankfurt Settlement Hub",    weightOz: 400, purity: "999.9", status: "REJECTED" },
  { serial: "GD-2026-009", refiner: "Heraeus",             vault: "Frankfurt Settlement Hub",    weightOz: 400, purity: "999.5", status: "VERIFIED" },
  { serial: "GD-2026-010", refiner: "Johnson Matthey",     vault: "London Clearing Centre",      weightOz: 400, purity: "999.9", status: "PENDING" },
  { serial: "GD-2026-011", refiner: "Asahi Refining",      vault: "New York Trading Floor",      weightOz: 400, purity: "999.9", status: "VERIFIED" },
  { serial: "GD-2026-012", refiner: "Umicore",             vault: "Zurich Custody Vault",        weightOz: 400, purity: "999.9", status: "VERIFIED" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "text-emerald-400",
  PENDING:  "text-yellow-400",
  REJECTED: "text-red-400",
};

const fmtOz = (v: number) => new Intl.NumberFormat("en-US").format(v);

export default function BrokerAssetsPage() {
  const verified = MOCK_BARS.filter((b) => b.status === "VERIFIED").length;
  const pending = MOCK_BARS.filter((b) => b.status === "PENDING").length;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLbmaSubmit = useCallback(async (data: LbmaAccreditationData) => {
    setIsSubmitting(true);
    // TODO: Wire to server action for LBMA verification
    console.log("[BrokerAssets] LBMA submission:", data);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            LBMA Asset Registry
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            {MOCK_BARS.length} bars &middot; {fmtOz(MOCK_BARS.reduce((s, b) => s + b.weightOz, 0))} oz total &middot; {verified} verified &middot; {pending} pending
          </p>
        </div>
      </div>

      {/* ── Dual-Pane Split ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: Vaulted Bar Inventory ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm">
                <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="text-left px-4 py-2 font-medium">Serial</th>
                  <th className="text-left px-4 py-2 font-medium">Refiner</th>
                  <th className="text-left px-4 py-2 font-medium">Vault Location</th>
                  <th className="text-right px-4 py-2 font-medium">Weight</th>
                  <th className="text-right px-4 py-2 font-medium">Purity</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_BARS.map((bar) => (
                  <tr
                    key={bar.serial}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-amber-400/80">
                      {bar.serial}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {bar.refiner}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {bar.vault}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                      {fmtOz(bar.weightOz)} oz
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                      {bar.purity}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${STATUS_STYLES[bar.status] ?? "text-slate-500"}`}
                      >
                        {bar.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: LBMA Verification Panel ── */}
        <div className="w-[420px] shrink-0 min-h-0 overflow-hidden border-l border-slate-800 bg-slate-900/30 p-4 flex flex-col">
          <LbmaVerificationPanel onSubmit={handleLbmaSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>
    </div>
  );
}
