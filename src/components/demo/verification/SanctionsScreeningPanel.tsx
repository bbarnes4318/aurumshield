/* ================================================================
   SANCTIONS SCREENING PANEL — Global AML/Sanctions console
   
   Shows screening results against 7 jurisdictions/databases:
   - OFAC, EU, UN, UK HMT, DFAT, Adverse Media, On-Chain
   - Full database name + code
   - Case status (NO_MATCH / FALSE_POSITIVE / ESCALATED)
   - Screening timestamps
   - Enhanced Due Diligence flag per jurisdiction
   - Aggregate screening outcome

   All data is demonstration material.
   ================================================================ */

"use client";

import { Shield, CheckCircle2, Clock, AlertTriangle, Lock } from "lucide-react";
import { DEMO_SCREENING_JURISDICTIONS, DEMO_ENTITY } from "@/demo/data/demoConstants";

interface Props {
  isVisible: boolean;
}

export function SanctionsScreeningPanel({ isVisible }: Props) {
  if (!isVisible) return null;

  const totalScreened = DEMO_SCREENING_JURISDICTIONS.length;
  const allClear = DEMO_SCREENING_JURISDICTIONS.every((j) => j.status === "CLEAR");
  const anyEdd = DEMO_SCREENING_JURISDICTIONS.some((j) => j.eddRequired);
  const totalMatches = DEMO_SCREENING_JURISDICTIONS.reduce((sum, j) => sum + j.matchCount, 0);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#C6A86B]" />
          <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
            Global AML & Sanctions Screening
          </h4>
        </div>
        <span className="text-[9px] text-slate-600 font-mono">
          {DEMO_ENTITY.companyName}
        </span>
      </div>

      {/* ── Aggregate status bar ── */}
      <div className={`
        flex items-center justify-between rounded-lg border px-4 py-2.5
        ${allClear
          ? "border-emerald-500/15 bg-emerald-500/5"
          : "border-amber-500/15 bg-amber-500/5"
        }
      `}>
        <div className="flex items-center gap-2">
          {allClear ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400/80" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400/80" />
          )}
          <div>
            <p className={`text-[11px] font-semibold ${allClear ? "text-emerald-400" : "text-amber-400"}`}>
              {allClear ? `All ${totalScreened} databases screened — 0 matches` : `${totalScreened} databases screened — review required`}
            </p>
            <p className="text-[8px] text-slate-500 mt-0.5">
              Entity screening, UBO screening, and wallet origin — concurrent batch execution
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="text-slate-500">Matches: <strong className="text-slate-300">{totalMatches}</strong></span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
            anyEdd
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-slate-800/50 text-slate-500 border border-slate-700/30"
          }`}>
            <Lock className="h-2 w-2" />
            EDD: {anyEdd ? "REQUIRED" : "NOT REQUIRED"}
          </span>
        </div>
      </div>

      {/* ── Screening table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-800/60">
        {/* Header */}
        <div className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.6fr_0.8fr] gap-2 bg-slate-900/70 px-3 py-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Database</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Status</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Matches</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Case</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Screened At</span>
        </div>

        {/* Rows */}
        {DEMO_SCREENING_JURISDICTIONS.map((j, i) => (
          <div
            key={j.code}
            className={`
              grid grid-cols-[1.4fr_0.7fr_0.5fr_0.6fr_0.8fr] gap-2 items-center px-3 py-2.5
              border-t border-slate-800/30 transition-colors duration-150
              hover:bg-slate-900/30
              ${i % 2 === 0 ? "bg-slate-950/20" : "bg-transparent"}
            `}
          >
            {/* Database name */}
            <div>
              <p className="text-[10px] text-slate-300 font-medium">{j.label}</p>
              <p className="text-[8px] text-slate-600 leading-tight mt-0.5">{j.fullName}</p>
            </div>

            {/* Status */}
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
                j.status === "CLEAR"
                  ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20"
                  : j.status === "MATCH"
                    ? "bg-red-500/10 text-red-400/80 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
              }`}>
                {j.status === "CLEAR" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                {j.status}
              </span>
            </div>

            {/* Match count */}
            <span className="text-[11px] text-slate-400 font-mono text-center tabular-nums font-bold">
              {j.matchCount}
            </span>

            {/* Case status */}
            <div className="flex justify-center">
              <span className={`text-[8px] font-bold uppercase tracking-wider ${
                j.caseStatus === "NO_MATCH" ? "text-emerald-400/60" :
                j.caseStatus === "FALSE_POSITIVE" ? "text-amber-400/60" :
                "text-red-400/60"
              }`}>
                {j.caseStatus.replace("_", " ")}
              </span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-2.5 w-2.5 text-slate-600 shrink-0" />
              <span className="text-[9px] text-slate-500 font-mono tabular-nums">
                {new Date(j.screenedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Demo footer ── */}
      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/20">
        <Shield className="h-2.5 w-2.5 text-[#C6A86B]/40" />
        <span className="text-[8px] text-[#C6A86B]/50 tracking-wider uppercase">
          DEMONSTRATION SCREENING RESULTS — NOT A LIVE COMPLIANCE CASE
        </span>
      </div>
    </div>
  );
}
