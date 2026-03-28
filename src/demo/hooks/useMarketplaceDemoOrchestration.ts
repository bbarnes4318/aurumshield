/* ================================================================
   USE-MARKETPLACE-DEMO — Orchestration hook for Act V cinematic flow

   Bridges tool calls from the concierge voice agent into
   marketplace page state. Handles:
   - Auto-selecting the 400oz LBMA bar
   - Setting quantity
   - Choosing vault destination (Zurich) or delivery mode
   - Setting settlement rail (USDC stablecoin or Fedwire)
   - Animating cost derivation line items in sequence
   - Pulsing the total amount after full breakdown is visible
   - Navigating to /institutional/first-trade/review when Act V ends

   This hook consumes conciergeSimulated state from TourProvider
   and dispatches side effects back into the marketplace's local state.

   All demo data references demoConstants for consistency.
   ================================================================ */

"use client";

import { useRef, useCallback, useMemo } from "react";
import { useTour } from "@/demo/tour-engine/TourProvider";

/* ── Types for the marketplace state setters ── */

export interface MarketplaceDemoSetters {
  selectAssetById: (assetId: string) => void;
  setQuantity: (qty: number) => void;
  setDeliveryMode: (mode: "VAULT" | "PHYSICAL") => void;
  setDestination: (dest: string) => void;
  setSettlementRail: (rail: "FEDWIRE" | "TURNKEY_USDT") => void;
  setPanelStep: (step: 1 | 2 | 3) => void;
}

/* ── Staged reveal phases ── */

export type DemoRevealPhase =
  | "IDLE"
  | "HERO_MOMENT"       // Show the gold imagery, let it breathe
  | "ASSET_SELECTED"    // 400oz LBMA bar selected
  | "CUSTODY_SET"       // Zurich vaulting chosen
  | "RAIL_SET"          // Settlement rail configured
  | "COST_ANIMATING"    // Line items appearing sequentially
  | "TOTAL_REVEALED"    // Total pulses, ready for review
  | "COMPLETE";         // Exit to review

/* ── Phase ordering for comparison ── */

const PHASE_ORDER: DemoRevealPhase[] = [
  "IDLE",
  "HERO_MOMENT",
  "ASSET_SELECTED",
  "CUSTODY_SET",
  "RAIL_SET",
  "COST_ANIMATING",
  "TOTAL_REVEALED",
  "COMPLETE",
];

function phaseFromSimulated(marketplacePhase: unknown): DemoRevealPhase {
  switch (marketplacePhase) {
    case "hero": return "HERO_MOMENT";
    case "asset-select": return "ASSET_SELECTED";
    case "custody-set": return "CUSTODY_SET";
    case "rail-set": return "RAIL_SET";
    case "cost-animate": return "COST_ANIMATING";
    case "total-reveal": return "TOTAL_REVEALED";
    case "complete": return "COMPLETE";
    default: return "IDLE";
  }
}

/* ── Hook ── */

export function useMarketplaceDemoOrchestration(
  isDemoMode: boolean,
  setters: MarketplaceDemoSetters,
) {
  const { state } = useTour();
  const lastAppliedPhaseRef = useRef<DemoRevealPhase>("IDLE");

  /* Derive phase directly from concierge state — no internal state */
  const revealPhase = useMemo<DemoRevealPhase>(() => {
    if (!isDemoMode) return "IDLE";
    return phaseFromSimulated(state.conciergeSimulated.__marketplacePhase);
  }, [isDemoMode, state.conciergeSimulated.__marketplacePhase]);

  /* Apply side effects when phase advances — called imperatively by the page */
  const applyPhaseEffects = useCallback(() => {
    if (revealPhase === lastAppliedPhaseRef.current) return;

    const phaseIdx = PHASE_ORDER.indexOf(revealPhase);
    const lastIdx = PHASE_ORDER.indexOf(lastAppliedPhaseRef.current);
    if (phaseIdx <= lastIdx) return; // Only advance forward

    lastAppliedPhaseRef.current = revealPhase;

    switch (revealPhase) {
      case "ASSET_SELECTED":
        setters.selectAssetById("lbma-400oz");
        setters.setQuantity(1);
        break;
      case "CUSTODY_SET":
        setters.setDeliveryMode("VAULT");
        setters.setDestination("zurich-malcaamit-1");
        break;
      case "RAIL_SET":
        setters.setSettlementRail("TURNKEY_USDT");
        setters.setPanelStep(2);
        break;
      default:
        break;
    }
  }, [revealPhase, setters]);

  /* Reset on demo exit */
  const resetDemo = useCallback(() => {
    lastAppliedPhaseRef.current = "IDLE";
  }, []);

  return {
    revealPhase,
    /** Call this in the render cycle (or a layout effect) to apply side effects */
    applyPhaseEffects,
    /** Reset internal tracking when demo exits */
    resetDemo,
    /** Whether the total amount should be pulsing */
    totalPulsing: revealPhase === "TOTAL_REVEALED",
    /** Whether a specific cost line should be visible based on cinematic phase */
    isCostLineVisible: () => {
      // Before cost animation phase, show nothing; during/after, show all
      // Fine-grained stagger is handled by CSS animation-delay in the component
      return PHASE_ORDER.indexOf(revealPhase) >= PHASE_ORDER.indexOf("COST_ANIMATING");
    },
  };
}
