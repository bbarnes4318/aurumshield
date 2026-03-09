"use client";

import { create } from "zustand";

/* ================================================================
   Institutional Wizard — Zustand Global Store
   ================================================================
   Single source of truth for all wizard state. Persists across
   step navigation (Back/Forward). Accessible from any component
   wrapped inside InstitutionalPortalWrapper.
   ================================================================ */

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Carrier = "brinks" | "loomis";
export type Jurisdiction = "london" | "zurich" | "new_york";
export type StorageType = "allocated" | "unallocated";
export type PaymentMethod = "wire" | "goldwire" | null;

interface WizardState {
  /* ── Navigation ── */
  currentStep: WizardStep;
  goTo: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;

  /* ── Step 1: KYC ── */
  kycCleared: boolean;
  setKycCleared: (v: boolean) => void;

  /* ── Step 2: Trade Execution ── */
  barCount: number;
  setBarCount: (n: number) => void;
  priceLocked: boolean;
  setPriceLocked: (v: boolean) => void;

  /* ── Step 3: Logistics ── */
  carrier: Carrier;
  setCarrier: (c: Carrier) => void;
  jurisdiction: Jurisdiction;
  setJurisdiction: (j: Jurisdiction) => void;
  logisticsCost: number;
  setLogisticsCost: (n: number) => void;

  /* ── Step 4: Vaulting ── */
  storageType: StorageType;
  setStorageType: (s: StorageType) => void;

  /* ── Step 5: Funding ── */
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;

  /* ── Derived helpers ── */
  spotPrice: number;
  setSpotPrice: (n: number) => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  /* Navigation */
  currentStep: 1,
  goTo: (step) => set({ currentStep: step }),
  goNext: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 8) as WizardStep })),
  goBack: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) as WizardStep })),

  /* KYC */
  kycCleared: false,
  setKycCleared: (v) => set({ kycCleared: v }),

  /* Trade */
  barCount: 48,
  setBarCount: (n) => set({ barCount: Math.max(1, n) }),
  priceLocked: false,
  setPriceLocked: (v) => set({ priceLocked: v }),

  /* Logistics */
  carrier: "brinks",
  setCarrier: (c) => set({ carrier: c }),
  jurisdiction: "london",
  setJurisdiction: (j) => set({ jurisdiction: j }),
  logisticsCost: 0,
  setLogisticsCost: (n) => set({ logisticsCost: n }),

  /* Vaulting */
  storageType: "allocated",
  setStorageType: (s) => set({ storageType: s }),

  /* Funding */
  paymentMethod: null,
  setPaymentMethod: (m) => set({ paymentMethod: m }),

  /* Derived */
  spotPrice: 5171.92,
  setSpotPrice: (n) => set({ spotPrice: n }),
}));

/* ── Fee calculation helper (used across components) ── */

interface FeeBreakdown {
  grossValue: number;
  platformFeeBps: number;
  physicalPremiumBps: number;
  platformFee: number;
  physicalPremium: number;
  subtotal: number;
  totalWithLogistics: number;
}

export function computeFees(barCount: number, spotPrice: number, logisticsCost: number): FeeBreakdown {
  const totalOz = barCount * 400;
  const grossValue = totalOz * spotPrice;

  // Dynamic tiered fees: scale inversely with allocation
  let platformFeeBps: number;
  let physicalPremiumBps: number;

  if (grossValue >= 100_000_000) {
    platformFeeBps = 5;
    physicalPremiumBps = 5;
  } else if (grossValue >= 50_000_000) {
    platformFeeBps = 7;
    physicalPremiumBps = 10;
  } else if (grossValue >= 25_000_000) {
    platformFeeBps = 8;
    physicalPremiumBps = 15;
  } else {
    platformFeeBps = 10;
    physicalPremiumBps = 20;
  }

  const platformFee = grossValue * (platformFeeBps / 10_000);
  const physicalPremium = grossValue * (physicalPremiumBps / 10_000);
  const subtotal = grossValue + platformFee + physicalPremium;
  const totalWithLogistics = subtotal + logisticsCost;

  return {
    grossValue,
    platformFeeBps,
    physicalPremiumBps,
    platformFee,
    physicalPremium,
    subtotal,
    totalWithLogistics,
  };
}
