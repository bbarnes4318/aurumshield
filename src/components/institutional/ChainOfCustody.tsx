/* ================================================================
   CHAIN OF CUSTODY — Physical Gold Supply Chain Visualization
   ================================================================
   Shows the 5-link insured pipeline from source mine to final
   destination. Each link animates to "completed" based on the
   settlement milestone count.

   Key trust signal: buyer's capital remains in escrow until the
   destination vault confirms physical receipt and title transfer.

   compact=true: renders as horizontal strip for zero-scroll demo.
   ================================================================ */

"use client";

import {
  Mountain,
  ShieldCheck,
  FlaskConical,
  Truck,
  Vault,
  Lock,
} from "lucide-react";
import type { ReactNode } from "react";

/* ── Chain Link Definitions ── */

interface ChainLink {
  id: string;
  icon: ReactNode;
  label: string;
  sublabel: string;
  shortLabel: string;
  detail: string;
}

const CHAIN_LINKS: ChainLink[] = [
  {
    id: "origin",
    icon: <Mountain className="h-3.5 w-3.5" />,
    label: "LBMA-Approved Origin",
    shortLabel: "LBMA Origin",
    sublabel: "Source Extraction",
    detail: "Conflict-free, provenance-certified mining operation",
  },
  {
    id: "transit-1",
    icon: <Truck className="h-3.5 w-3.5" />,
    label: "Sovereign Armored Logistics",
    shortLabel: "Armored Transit",
    sublabel: "Sealed Transit",
    detail: "GPS-tracked, full replacement coverage — Brink's / Malca-Amit",
  },
  {
    id: "assay",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
    label: "Good Delivery Assay",
    shortLabel: "Assay Lab",
    sublabel: "Refinery Certification",
    detail: "LBMA referee lab — fineness verification, serial stamping",
  },
  {
    id: "transit-2",
    icon: <Truck className="h-3.5 w-3.5" />,
    label: "Insured Chain Transfer",
    shortLabel: "Chain Transfer",
    sublabel: "Custody Handoff",
    detail: "Continuous insurance — zero custody gaps between links",
  },
  {
    id: "destination",
    icon: <Vault className="h-3.5 w-3.5" />,
    label: "Allocated Freeport Vault",
    shortLabel: "Freeport Vault",
    sublabel: "Title Transfer",
    detail: "Funds released only after vault confirms receipt + title",
  },
];

/* ── Props ── */

interface ChainOfCustodyProps {
  /** Number of settlement milestones completed (0-8). Chain links
   *  map proportionally: link N completes at milestone ceil(N * 8/5). */
  completedMilestones?: number;
  /** Whether to show the animated version */
  animate?: boolean;
  /** Compact horizontal strip for zero-scroll demo pages */
  compact?: boolean;
  /** Override: force all links to completed state */
  allComplete?: boolean;
}

/* ── Helpers ── */

function linkState(
  linkIndex: number,
  completedMilestones: number,
): "completed" | "active" | "pending" {
  const thresholds = [2, 3, 5, 6, 8];
  const threshold = thresholds[linkIndex];

  if (completedMilestones >= threshold) return "completed";
  if (completedMilestones >= threshold - 1) return "active";
  return "pending";
}

function stateColors(state: "completed" | "active" | "pending") {
  switch (state) {
    case "completed":
      return {
        ring: "border-emerald-400/50 bg-emerald-400/10",
        icon: "text-emerald-400",
        label: "text-slate-200",
        sublabel: "text-emerald-400/70",
        detail: "text-slate-400",
        connector: "bg-emerald-400/40",
        badge: "✓",
      };
    case "active":
      return {
        ring: "border-[#C6A86B]/50 bg-[#C6A86B]/10 shadow-[0_0_12px_rgba(198,168,107,0.15)]",
        icon: "text-[#C6A86B] animate-pulse",
        label: "text-white",
        sublabel: "text-[#C6A86B]",
        detail: "text-slate-400",
        connector: "bg-slate-700",
        badge: "●",
      };
    case "pending":
      return {
        ring: "border-slate-700/50 bg-slate-800/30",
        icon: "text-slate-600",
        label: "text-slate-500",
        sublabel: "text-slate-600",
        detail: "text-slate-700",
        connector: "bg-slate-800",
        badge: "",
      };
  }
}

/* ── Component ── */

export function ChainOfCustody({
  completedMilestones = 8,
  animate = true,
  compact = false,
  allComplete = false,
}: ChainOfCustodyProps) {
  /* ── Compact horizontal strip ── */
  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase font-bold">
            Chain of Custody
          </h3>
          <div className="flex items-center gap-1">
            <Lock className="h-2 w-2 text-[#C6A86B]/60" />
            <span className="font-mono text-[7px] text-[#C6A86B]/60 tracking-wider uppercase">
              Fully Insured
            </span>
          </div>
        </div>

        {/* Horizontal chain strip */}
        <div className="flex items-center gap-0">
          {CHAIN_LINKS.map((link, index) => {
            const state = allComplete
              ? "completed"
              : linkState(index, completedMilestones);
            const colors = stateColors(state);
            const isLast = index === CHAIN_LINKS.length - 1;

            return (
              <div key={link.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${animate ? "duration-500" : ""} ${colors.ring}`}
                  >
                    <span className={`transition-colors ${animate ? "duration-500" : ""} ${colors.icon} [&>svg]:h-2.5 [&>svg]:w-2.5`}>
                      {link.icon}
                    </span>
                  </div>
                  <span className={`font-mono text-[7px] mt-1 text-center leading-tight font-semibold truncate max-w-full ${colors.label}`}>
                    {link.shortLabel}
                  </span>
                  {state === "completed" && (
                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-400/70 mt-px" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-3 h-px shrink-0 transition-colors ${animate ? "duration-500" : ""} ${colors.connector}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Compact escrow signal */}
        <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center gap-1.5">
          <ShieldCheck className="h-2.5 w-2.5 text-[#C6A86B]/70 shrink-0" />
          <p className="font-mono text-[7px] text-slate-500">
            <span className="text-[#C6A86B]/80 font-bold">Capital in escrow</span> until
            vault confirms receipt + title transfer.
          </p>
        </div>
      </div>
    );
  }

  /* ── Full vertical layout ── */
  return (
    <div className="border border-slate-800 bg-slate-900/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
          Chain of Custody
        </h3>
        <div className="flex items-center gap-1.5">
          <Lock className="h-2.5 w-2.5 text-[#C6A86B]/60" />
          <span className="font-mono text-[8px] text-[#C6A86B]/60 tracking-wider uppercase">
            Fully Insured
          </span>
        </div>
      </div>

      {/* Chain Links */}
      <div className="space-y-0">
        {CHAIN_LINKS.map((link, index) => {
          const state = allComplete
            ? "completed"
            : linkState(index, completedMilestones);
          const colors = stateColors(state);
          const isLast = index === CHAIN_LINKS.length - 1;

          return (
            <div key={link.id}>
              {/* Link Row */}
              <div
                className={`flex items-start gap-3 py-2 transition-all ${
                  animate ? "duration-700" : ""
                }`}
              >
                {/* Icon Circle */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                    animate ? "duration-500" : ""
                  } ${colors.ring}`}
                >
                  <span className={`transition-colors ${animate ? "duration-500" : ""} ${colors.icon}`}>
                    {link.icon}
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-wide transition-colors ${
                        animate ? "duration-500" : ""
                      } ${colors.label}`}
                    >
                      {link.label}
                    </span>
                    {state === "completed" && (
                      <ShieldCheck
                        className="h-3 w-3 text-emerald-400 animate-in fade-in zoom-in duration-300"
                      />
                    )}
                  </div>
                  <p
                    className={`font-mono text-[8px] tracking-wider uppercase transition-colors ${
                      animate ? "duration-500" : ""
                    } ${colors.sublabel}`}
                  >
                    {link.sublabel}
                  </p>
                  {state !== "pending" && (
                    <p
                      className={`font-mono text-[9px] mt-0.5 leading-snug animate-in fade-in slide-in-from-left-2 duration-500 ${colors.detail}`}
                    >
                      {link.detail}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex items-stretch ml-3.5 pl-px">
                  <div
                    className={`w-px h-2 transition-colors ${
                      animate ? "duration-500" : ""
                    } ${colors.connector}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Escrow Trust Signal */}
      <div className="mt-3 pt-3 border-t border-slate-800/50">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#C6A86B]/70 shrink-0 mt-0.5" />
          <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
            <span className="text-[#C6A86B]/80 font-bold">Capital remains in escrow</span>{" "}
            until the destination vault confirms physical receipt and executes
            title transfer. At no point does uninsured gold exist in this pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
