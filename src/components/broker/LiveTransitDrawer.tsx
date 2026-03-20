"use client";

/* ================================================================
   LIVE TRANSIT DRAWER — Physical Deal Logistics Tracker
   ================================================================
   Slide-out drawer (600px, fixed right) showing real-time deal
   logistics. Triggered from the Deal Pipeline table.

   Structure:
     ┌───────────────────────────────────────────┐
     │  HEADER: Deal ID, Counterparties, Status  │
     ├───────────────────────────────────────────┤
     │  DIGITAL TRACK: Capital Escrow Panel      │
     ├───────────────────────────────────────────┤
     │  PHYSICAL TRACK: Vertical Logistics TL    │
     │    1. Producer Intake                     │
     │    2. Brinks Armored Transit (ACTIVE)     │
     │    3. Refinery Assay                      │
     │    4. Final Vaulting                      │
     └───────────────────────────────────────────┘
   ================================================================ */

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

/* ── Types ── */
interface TransitDeal {
  id: string;
  buyer: string;
  seller: string;
  asset: string;
  notionalUsd: number;
  status: string;
  escrowAmount: string;
  escrowProvider: string;
  escrowStatus: string;
  transitStage: number; // 0-based index of ACTIVE step
}

/* ── Mock transit data keyed by deal ID ── */
const TRANSIT_DATA: Record<string, TransitDeal> = {
  "BRK-001": {
    id: "BRK-001", buyer: "Aurelia Sovereign Fund", seller: "Perth Mint",
    asset: "LBMA 400oz Good Delivery Bar × 12",
    notionalUsd: 12_734_400, status: "AWAITING FUNDING",
    escrowAmount: "$12.7M", escrowProvider: "TURNKEY", escrowStatus: "PENDING LOCK",
    transitStage: 0,
  },
  "BRK-002": {
    id: "BRK-002", buyer: "Meridian Capital Partners", seller: "Valcambi SA",
    asset: "LBMA 400oz Good Delivery Bar × 3",
    notionalUsd: 3_183_600, status: "IN TRANSIT",
    escrowAmount: "$3.2M", escrowProvider: "TURNKEY", escrowStatus: "LOCKED",
    transitStage: 1,
  },
  "BRK-003": {
    id: "BRK-003", buyer: "Pacific Bullion Trust", seller: "Argor-Heraeus",
    asset: "Unrefined Doré — 3,200 oz gross",
    notionalUsd: 8_489_600, status: "CLEARING",
    escrowAmount: "$8.5M", escrowProvider: "TURNKEY", escrowStatus: "LOCKED",
    transitStage: 2,
  },
  "BRK-004": {
    id: "BRK-004", buyer: "Nordic Reserve AG", seller: "Rand Refinery",
    asset: "LBMA 400oz Good Delivery Bar × 5",
    notionalUsd: 5_306_000, status: "AWAITING FUNDING",
    escrowAmount: "$5.3M", escrowProvider: "TURNKEY", escrowStatus: "PENDING LOCK",
    transitStage: 0,
  },
  "BRK-005": {
    id: "BRK-005", buyer: "Caspian Trade Finance", seller: "PAMP SA",
    asset: "LBMA 400oz Good Delivery Bar × 20",
    notionalUsd: 21_224_000, status: "ESCROW OPEN",
    escrowAmount: "$21.2M", escrowProvider: "TURNKEY", escrowStatus: "AWAITING DEPOSIT",
    transitStage: 0,
  },
  "BRK-006": {
    id: "BRK-006", buyer: "Emirates Gold DMCC", seller: "Royal Canadian Mint",
    asset: "LBMA 400oz Good Delivery Bar × 2",
    notionalUsd: 2_122_400, status: "SETTLED",
    escrowAmount: "$2.1M", escrowProvider: "TURNKEY", escrowStatus: "RELEASED",
    transitStage: 3,
  },
  "BRK-007": {
    id: "BRK-007", buyer: "Helvetia Heritage SA", seller: "Metalor Technologies",
    asset: "Unrefined Doré — 2,400 oz gross",
    notionalUsd: 6_367_200, status: "IN TRANSIT",
    escrowAmount: "$6.4M", escrowProvider: "TURNKEY", escrowStatus: "LOCKED",
    transitStage: 1,
  },
  "BRK-008": {
    id: "BRK-008", buyer: "Shanghai Gold Exchange", seller: "Tanaka Kikinzoku",
    asset: "LBMA 400oz Good Delivery Bar × 15",
    notionalUsd: 15_918_000, status: "CLEARING",
    escrowAmount: "$15.9M", escrowProvider: "TURNKEY", escrowStatus: "LOCKED",
    transitStage: 2,
  },
  "BRK-009": {
    id: "BRK-009", buyer: "Rand Refinery Ltd", seller: "Perth Mint",
    asset: "LBMA 400oz Good Delivery Bar × 4",
    notionalUsd: 4_244_800, status: "ESCROW OPEN",
    escrowAmount: "$4.2M", escrowProvider: "TURNKEY", escrowStatus: "AWAITING DEPOSIT",
    transitStage: 0,
  },
  "BRK-010": {
    id: "BRK-010", buyer: "Banco del Oro SA", seller: "PAMP SA",
    asset: "Unrefined Doré — 4,000 oz gross",
    notionalUsd: 10_612_000, status: "AWAITING FUNDING",
    escrowAmount: "$10.6M", escrowProvider: "TURNKEY", escrowStatus: "PENDING LOCK",
    transitStage: 0,
  },
};

/* ── Logistics timeline steps ── */
const LOGISTICS_STEPS = [
  { label: "Producer Intake",          sub: "Origin facility verification & bar serialization" },
  { label: "Brinks Armored Transit",   sub: "Secure chain-of-custody transport via Brink's" },
  { label: "Refinery Assay",           sub: "Independent purity verification & LBMA certification" },
  { label: "Final Vaulting",           sub: "Destination vault acceptance & custodian confirmation" },
] as const;

/* ── Status chip styling ── */
const STATUS_CHIP: Record<string, { text: string; bg: string; border: string; pulse: boolean }> = {
  "ESCROW OPEN":       { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30", pulse: false },
  "AWAITING FUNDING":  { text: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30", pulse: true },
  "CLEARING":          { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", pulse: true },
  "IN TRANSIT":        { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30", pulse: true },
  "SETTLED":           { text: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-700/30", pulse: false },
};

const DEFAULT_CHIP = { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-700/30", pulse: false };

/* ── Escrow status styling ── */
const ESCROW_STYLES: Record<string, string> = {
  "LOCKED":           "text-emerald-400",
  "PENDING LOCK":     "text-amber-400",
  "AWAITING DEPOSIT": "text-yellow-400",
  "RELEASED":         "text-slate-500",
};

/* ================================================================
   COMPONENT
   ================================================================ */

interface LiveTransitDrawerProps {
  dealId: string | null;
  onClose: () => void;
}

export function LiveTransitDrawer({ dealId, onClose }: LiveTransitDrawerProps) {
  const deal = dealId ? TRANSIT_DATA[dealId] : null;
  const isOpen = !!deal;

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !deal) return null;

  const chip = STATUS_CHIP[deal.status] ?? DEFAULT_CHIP;

  return (
    <>
      {/* ── Backdrop overlay ── */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <div className="w-[600px] border-l border-slate-800 bg-slate-950/95 backdrop-blur-md fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden shadow-2xl">
        {/* ── Header ── */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-amber-400 font-semibold">
                {deal.id}
              </span>
              {/* Pulsing StateChip */}
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${chip.text} ${chip.bg} ${chip.border}`}
              >
                {chip.pulse && (
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${chip.text.replace("text-", "bg-")} animate-pulse`} />
                )}
                {deal.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Counterparties */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Buyer</p>
              <p className="text-xs text-slate-200 mt-0.5">{deal.buyer}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Seller</p>
              <p className="text-xs text-slate-200 mt-0.5">{deal.seller}</p>
            </div>
          </div>

          {/* Asset + Notional */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-mono text-slate-400">{deal.asset}</p>
            <p className="text-sm font-mono font-semibold text-slate-200 tabular-nums">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(deal.notionalUsd)}
            </p>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ═══ DIGITAL TRACK: Capital Escrow ═══ */}
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.15em] font-bold mb-3">
              Digital Track — Capital Escrow
            </p>
            <div className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Escrow Amount</p>
                  <p className="text-lg font-mono font-bold text-slate-100 mt-0.5 tabular-nums">
                    {deal.escrowAmount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Status</p>
                  <p className={`text-xs font-mono font-semibold uppercase tracking-wider mt-0.5 ${ESCROW_STYLES[deal.escrowStatus] ?? "text-slate-500"}`}>
                    {deal.escrowStatus}
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  Provider: <span className="text-slate-400">{deal.escrowProvider}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  {deal.escrowStatus === "LOCKED" ? "LOCKED VIA " + deal.escrowProvider : deal.escrowStatus}
                </span>
              </div>
            </div>
          </div>

          {/* ═══ PHYSICAL TRACK: Logistics Timeline ═══ */}
          <div className="px-5 py-4">
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.15em] font-bold mb-4">
              Physical Track — Logistics Pipeline
            </p>

            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-800" />

              {LOGISTICS_STEPS.map((step, idx) => {
                const isActive = idx === deal.transitStage;
                const isCompleted = idx < deal.transitStage;
                const isPending = idx > deal.transitStage;

                return (
                  <div key={step.label} className="relative pb-6 last:pb-0">
                    {/* Node dot */}
                    <div
                      className={[
                        "absolute -left-6 top-0.5 h-[15px] w-[15px] rounded-full border-2 flex items-center justify-center",
                        isActive
                          ? "border-blue-400 bg-blue-500/20 shadow-[0_0_8px_rgba(96,165,250,0.4)]"
                          : isCompleted
                            ? "border-emerald-400 bg-emerald-500/20"
                            : "border-slate-700 bg-slate-900",
                      ].join(" ")}
                    >
                      {isCompleted && (
                        <span className="text-[8px] text-emerald-400">✓</span>
                      )}
                      {isActive && (
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                    </div>

                    {/* Step content */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-600 tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={[
                            "text-xs font-mono font-semibold uppercase tracking-wider",
                            isActive
                              ? "text-blue-400"
                              : isCompleted
                                ? "text-emerald-400"
                                : "text-slate-600",
                          ].join(" ")}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-wider">
                            Complete
                          </span>
                        )}
                      </div>
                      <p
                        className={[
                          "text-[11px] mt-1",
                          isPending ? "text-slate-700" : "text-slate-500",
                        ].join(" ")}
                      >
                        {step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
            Live Transit Monitor v1.0
          </span>
          <button
            onClick={onClose}
            className="text-[10px] font-mono text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
}
