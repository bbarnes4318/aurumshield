/* ================================================================
   SETTLEMENT RAILS VISUALIZATION

   Two-rail DvP (Delivery versus Payment) visualization.
   Funds rail + Asset rail shown side by side.
   States: Reserved → Authorized → Executed → Certified
   Clean lines, monospace labels, subtle state transitions.
   ================================================================ */

"use client";

import { DollarSign, Shield, CheckCircle2 } from "lucide-react";

type RailState = "pending" | "reserved" | "authorized" | "executed" | "certified";

interface SettlementRailsVisualizationProps {
  fundsState?: RailState;
  assetState?: RailState;
  settlementId?: string;
}

const STATE_ORDER: RailState[] = [
  "pending",
  "reserved",
  "authorized",
  "executed",
  "certified",
];

const STATE_LABELS: Record<RailState, string> = {
  pending: "Pending",
  reserved: "Reserved",
  authorized: "Authorized",
  executed: "Executed",
  certified: "Certified",
};

function RailTrack({
  label,
  icon,
  currentState,
}: {
  label: string;
  icon: React.ReactNode;
  currentState: RailState;
}) {
  const activeIdx = STATE_ORDER.indexOf(currentState);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-0">
        {STATE_ORDER.map((state, idx) => {
          const isPast = idx < activeIdx;
          const isActive = idx === activeIdx;
          const isFuture = idx > activeIdx;

          return (
            <div key={state} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`h-px w-4 ${
                    isPast ? "bg-success" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-surface-3 text-text border border-text-muted/30"
                    : isPast
                      ? "text-success"
                      : "text-text-faint/40"
                }`}
              >
                {isPast && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                )}
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-text" />
                )}
                {STATE_LABELS[state]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettlementRailsVisualization({
  fundsState = "certified",
  assetState = "certified",
  settlementId = "stl-001",
}: SettlementRailsVisualizationProps) {
  return (
    <div
      className="card-base border border-border p-5 space-y-4"
      data-tour="settlement-rails"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">
          DvP Settlement Rails
        </h3>
        <span className="font-mono text-[10px] text-text-faint">
          {settlementId}
        </span>
      </div>

      <p className="text-[10px] uppercase tracking-wider text-text-faint">
        Atomic Delivery-versus-Payment — Dual Rail Progression
      </p>

      {/* Two rails */}
      <div className="space-y-4">
        <RailTrack
          label="Funds Rail"
          icon={<DollarSign className="h-3.5 w-3.5 text-info" />}
          currentState={fundsState}
        />
        <div className="border-t border-border" />
        <RailTrack
          label="Asset Rail"
          icon={<Shield className="h-3.5 w-3.5 text-gold" />}
          currentState={assetState}
        />
      </div>

      {/* Finality stamp */}
      {fundsState === "certified" && assetState === "certified" && (
        <div className="flex items-center gap-2 rounded-sm bg-success/5 border border-success/20 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-[11px] font-medium text-success">
            Settlement Final — Atomic DvP Complete
          </span>
        </div>
      )}
    </div>
  );
}
