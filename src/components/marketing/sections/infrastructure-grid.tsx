"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ShieldCheck, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ================================================================
   INSTITUTIONAL INFRASTRUCTURE GRID
   ================================================================
   Benefit-driven value section with Paper vs. Physical comparison
   table, interactive hover expansions, and pillar highlight cards.
   ================================================================ */

/* ── Comparison data ── */
interface ComparisonRow {
  dimension: string;
  paper: string;
  physical: string;
  detail: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    dimension: "Ownership",
    paper: "Synthetic claim on a pool",
    physical: "Direct legal title to specific bars",
    detail:
      "Paper gold (ETFs, unallocated accounts) gives you a contractual claim. Physical allocation under bailment law gives you outright ownership with serial-number specificity.",
  },
  {
    dimension: "Counterparty Risk",
    paper: "Bank or ETF issuer solvency",
    physical: "Zero — asset exists outside balance sheets",
    detail:
      "If the custodian bank or ETF issuer fails, paper gold holders become unsecured creditors. Allocated physical gold is legally segregated and bankruptcy-remote.",
  },
  {
    dimension: "Custody",
    paper: "Pooled with other investors",
    physical: "Individually allocated in sovereign vaults",
    detail:
      "Paper products commingle assets. Goldwire allocates each bar individually in LBMA-accredited vaults (Malca-Amit, Brink's) with your name on the warrant.",
  },
  {
    dimension: "Audit Rights",
    paper: "Fund-level reports only",
    physical: "Per-bar serial verification anytime",
    detail:
      "ETF audits are published annually at the fund level. Physical allocation lets you verify your specific bar serial numbers against vault records at any time.",
  },
  {
    dimension: "Liquidity",
    paper: "Exchange hours only",
    physical: "T+0 via Goldwire — 24/7/365",
    detail:
      "Paper gold trades only during exchange hours. The Goldwire engine enables instant physical-to-fiat conversion at any time with zero extraction delay.",
  },
  {
    dimension: "Insurance",
    paper: "SIPC (limited, not guaranteed)",
    physical: "Full Lloyd's of London underwriting",
    detail:
      "Brokerage insurance covers account failure, not commodity loss. Every ounce on the Goldwire network is individually underwritten by Lloyd's syndicates.",
  },
];

/* ── Pillar data ── */
interface Pillar {
  icon: LucideIcon;
  title: string;
  emphasis: string[];
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Scale,
    title: "Bailment Jurisprudence",
    emphasis: ["UCC Article 7", "Bankruptcy Remoteness"],
    description:
      "All allocated metal is held under strict bailment law. Your gold is legally segregated and cannot be claimed by any creditor, counterparty, or liquidator.",
  },
  {
    icon: ShieldCheck,
    title: "Unbroken Chain of Custody",
    emphasis: ["LBMA-Accredited", "Tarmac Supervision"],
    description:
      "From refiner pour to vault allocation, every custody transfer is witnessed, documented, and cryptographically sealed via Brink's and Loomis carriers.",
  },
  {
    icon: Activity,
    title: "Non-Destructive Assaying",
    emphasis: ["Ultrasonic Testing", "Conductivity Scanning"],
    description:
      "Every bar undergoes non-destructive verification using ultrasonic thickness gauging and four-point conductivity measurement. Bureau Veritas certified.",
  },
];

/* ── Expandable row component ── */
function ComparisonTableRow({ row, index }: { row: ComparisonRow; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group cursor-pointer transition-colors duration-200 hover:bg-[rgba(212,175,55,0.02)]"
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      {/* Main row */}
      <div
        className={`grid grid-cols-[140px_1fr_1fr_32px] sm:grid-cols-[180px_1fr_1fr_32px] gap-0 items-center ${
          index < COMPARISON_ROWS.length - 1 ? "border-b border-slate-800/50" : ""
        }`}
      >
        {/* Dimension */}
        <div className="px-5 py-4 border-r border-slate-800/50">
          <span className="font-mono text-xs font-bold text-slate-300 tracking-wide">
            {row.dimension}
          </span>
        </div>

        {/* Paper */}
        <div className="px-5 py-4 border-r border-slate-800/50 flex items-start gap-2.5">
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-red-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-sm text-slate-400 leading-snug">{row.paper}</span>
        </div>

        {/* Physical */}
        <div className="px-5 py-4 border-r border-slate-800/50 flex items-start gap-2.5">
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-white leading-snug">{row.physical}</span>
        </div>

        {/* Expand chevron */}
        <div className="px-2 py-4 flex items-center justify-center">
          <motion.svg
            className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-5 py-4 text-sm leading-relaxed border-b border-slate-800/50"
              style={{ backgroundColor: "rgba(212,175,55,0.02)", color: "#94a3b8" }}
            >
              {row.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mobile comparison card ── */
function MobileComparisonCard({ row }: { row: ComparisonRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-slate-800/80 rounded-lg p-5 transition-colors cursor-pointer hover:border-[rgba(212,175,55,0.2)]"
      style={{ backgroundColor: "#0D1320" }}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-3">
        {row.dimension}
      </p>
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <svg className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-xs text-slate-400">{row.paper}</span>
        </div>
        <div className="flex items-start gap-2">
          <svg className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-white">{row.physical}</span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs leading-relaxed text-slate-500 mt-3 pt-3 border-t border-slate-800/50 overflow-hidden"
          >
            {row.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InstitutionalInfrastructureGrid() {
  return (
    <section id="procurement" className="py-28 lg:py-40" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="mb-16 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px w-10" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#D4AF37" }}>
              SOVEREIGN ARCHITECTURE
            </p>
          </div>
          <h2
            className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15]"
            style={{ fontFamily: "var(--font-inter), sans-serif", color: "#f1f5f9" }}
          >
            Own the Asset,{" "}
            <span style={{ color: "#94a3b8" }}>Not the Promise.</span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl"
            style={{ lineHeight: 1.75, color: "#cbd5e1" }}
          >
            Direct physical allocation, simplified. See exactly how sovereign-grade
            physical ownership compares to paper instruments — and why the difference
            matters to your balance sheet.
          </p>
        </div>

        {/* ── Comparison Table — Desktop ── */}
        <div className="hidden md:block rounded-lg border border-slate-800/80 overflow-hidden" style={{ backgroundColor: "#0D1320" }}>
          {/* Header */}
          <div className="grid grid-cols-[180px_1fr_1fr_32px] gap-0 border-b-2 border-slate-700" style={{ backgroundColor: "#0A0E18" }}>
            <div className="px-5 py-4 border-r border-slate-800/50">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Dimension
              </span>
            </div>
            <div className="px-5 py-4 border-r border-slate-800/50 flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-red-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Paper / ETF
              </span>
            </div>
            <div className="px-5 py-4 border-r border-slate-800/50 flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-emerald-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Physical / Goldwire
              </span>
            </div>
            <div className="px-2 py-4" />
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <ComparisonTableRow key={row.dimension} row={row} index={i} />
          ))}

          {/* Footer */}
          <div className="border-t-2 border-slate-700 px-5 py-3.5 flex items-center justify-between" style={{ backgroundColor: "#0A0E18" }}>
            <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
              CLICK ANY ROW TO EXPAND
            </span>
            <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(212,175,55,0.4)" }}>
              [ INSTITUTIONAL ANALYSIS ]
            </span>
          </div>
        </div>

        {/* ── Comparison Cards — Mobile ── */}
        <div className="md:hidden grid gap-3">
          {COMPARISON_ROWS.map((row) => (
            <MobileComparisonCard key={row.dimension} row={row} />
          ))}
        </div>

        {/* ── Pillar Cards ── */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group relative rounded-lg border border-slate-800/80 p-7 lg:p-8 transition-all duration-300 hover:border-[rgba(212,175,55,0.3)]"
                style={{ backgroundColor: "#0D1320" }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-[rgba(212,175,55,0.03)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-6">
                    <Icon
                      className="h-6 w-6 text-slate-500 transition-colors duration-300 group-hover:text-[#D4AF37]"
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold text-white mb-3 tracking-tight"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    {pillar.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pillar.emphasis.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded border border-slate-700 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors duration-300 group-hover:border-[rgba(212,175,55,0.25)] group-hover:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed text-slate-400" style={{ lineHeight: 1.6 }}>
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
