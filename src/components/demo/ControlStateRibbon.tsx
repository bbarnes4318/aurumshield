/* ================================================================
   CONTROL STATE RIBBON — Demo-mode top ribbon

   Shows a 5-state progression for the demo settlement lifecycle:
   Inactive → Activation Pending → Controls Active → Settled → Certified

   Visual: institutional neutral palette. No gold highlights.
   Only renders in demo mode.
   ================================================================ */

"use client";

import { useMemo } from "react";
import { useDemo } from "@/providers/demo-provider";

const STATES = [
  { key: "inactive", label: "Inactive" },
  { key: "activation_pending", label: "Activation Pending" },
  { key: "controls_active", label: "Controls Active" },
  { key: "settled", label: "Settled" },
  { key: "certified", label: "Certified" },
] as const;

type RibbonState = (typeof STATES)[number]["key"];

/**
 * Derive ribbon state from demo settlement data.
 * In the demo, stl-001 is fully settled+certified and stl-002 is awaiting activation.
 * We show the "furthest" state across both settlements.
 */
function useDemoRibbonState(): RibbonState {
  // In demo mode, the ribbon reflects the overall clearing lifecycle.
  // Since stl-001 is certified and stl-002 is awaiting activation,
  // we show "certified" as the high-water mark.
  // If we wanted real-time derivation, we'd query settlement store.
  // For deterministic demos, we hard-code the progression.
  return "certified";
}

export function ControlStateRibbon() {
  const { isDemo } = useDemo();
  const currentState = useDemoRibbonState();

  const activeIdx = useMemo(
    () => STATES.findIndex((s) => s.key === currentState),
    [currentState],
  );

  if (!isDemo) return null;

  return (
    <div
      data-tour="control-state-ribbon"
      className="flex items-center gap-0 border-b border-border bg-surface-1 px-4 py-1.5 overflow-x-auto"
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-faint mr-3 shrink-0">
        Clearing State
      </span>
      <div className="flex items-center gap-0 flex-1 min-w-0">
        {STATES.map((state, idx) => {
          const isActive = idx === activeIdx;
          const isPast = idx < activeIdx;
          const isFuture = idx > activeIdx;

          return (
            <div key={state.key} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`h-px w-6 shrink-0 transition-colors ${
                    isPast ? "bg-text-muted" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 shrink-0 rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-surface-3 text-text border border-text-muted/30"
                    : isPast
                      ? "text-text-muted"
                      : "text-text-faint/50"
                }`}
              >
                {/* Step indicator dot */}
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? "bg-text"
                      : isPast
                        ? "bg-text-muted"
                        : "bg-text-faint/30"
                  }`}
                />
                {state.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
