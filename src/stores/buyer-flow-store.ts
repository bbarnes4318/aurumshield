/* ================================================================
   BUYER FLOW STORE — Linear Phase Progression
   ================================================================
   Zustand store managing the buyer's journey through 5 locked
   phases. Each phase must complete before the next unlocks.
   Persisted to localStorage.
   ================================================================ */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BuyerPhase =
  | "register"
  | "verify"
  | "shop"
  | "checkout"
  | "purchase";

export const BUYER_PHASES: BuyerPhase[] = [
  "register",
  "verify",
  "shop",
  "checkout",
  "purchase",
];

export const PHASE_META: Record<
  BuyerPhase,
  { label: string; description: string; path: string }
> = {
  register: {
    label: "Create Account",
    description: "Email & two-factor authentication",
    path: "/buy/register",
  },
  verify: {
    label: "Verify Identity",
    description: "ID upload & compliance screening",
    path: "/buy/verify",
  },
  shop: {
    label: "Select Gold",
    description: "Browse the marketplace",
    path: "/buy/marketplace",
  },
  checkout: {
    label: "Review Order",
    description: "Pricing, fees & confirmation",
    path: "/buy/checkout",
  },
  purchase: {
    label: "Complete Purchase",
    description: "Payment & delivery",
    path: "/buy/purchase",
  },
};

interface BuyerFlowState {
  currentPhase: BuyerPhase;
  completedPhases: BuyerPhase[];

  /** Selected product (set when buyer picks from marketplace) */
  selectedProduct: {
    id: string;
    type: "nuggets" | "bullion" | "dore";
    weightOz: number;
  } | null;

  /** Checkout totals (set when price is locked) */
  lockedQuote: {
    spotPricePerOz: number;
    totalGoldCost: number;
    transitInsurance: number;
    platformFee: number;
    optionalServices: number;
    grandTotal: number;
    lockedAt: number; // timestamp
  } | null;

  /* ── Actions ── */
  completePhase: (phase: BuyerPhase) => void;
  setCurrentPhase: (phase: BuyerPhase) => void;
  canAccess: (phase: BuyerPhase) => boolean;
  setSelectedProduct: (
    product: BuyerFlowState["selectedProduct"],
  ) => void;
  setLockedQuote: (quote: BuyerFlowState["lockedQuote"]) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  currentPhase: "register" as BuyerPhase,
  completedPhases: [] as BuyerPhase[],
  selectedProduct: null,
  lockedQuote: null,
};

export const useBuyerFlow = create<BuyerFlowState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      completePhase: (phase) => {
        const { completedPhases } = get();
        if (completedPhases.includes(phase)) return;

        const nextIndex = BUYER_PHASES.indexOf(phase) + 1;
        const nextPhase =
          nextIndex < BUYER_PHASES.length
            ? BUYER_PHASES[nextIndex]
            : phase;

        set({
          completedPhases: [...completedPhases, phase],
          currentPhase: nextPhase,
        });
      },

      setCurrentPhase: (phase) => {
        if (get().canAccess(phase)) {
          set({ currentPhase: phase });
        }
      },

      canAccess: (phase) => {
        const { completedPhases } = get();
        const phaseIndex = BUYER_PHASES.indexOf(phase);

        // First phase is always accessible
        if (phaseIndex === 0) return true;

        // Can access if the previous phase is completed
        const prevPhase = BUYER_PHASES[phaseIndex - 1];
        return completedPhases.includes(prevPhase);
      },

      setSelectedProduct: (product) => set({ selectedProduct: product }),
      setLockedQuote: (quote) => set({ lockedQuote: quote }),

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: "aurumshield-buyer-flow",
    },
  ),
);
