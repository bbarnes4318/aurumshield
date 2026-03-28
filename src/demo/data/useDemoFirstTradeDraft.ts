/* ================================================================
   USE-DEMO-FIRST-TRADE-DRAFT — Shared hook for demo mode
   
   Provides deterministic first-trade draft data across all
   first-trade pages (review, authorize, success, settlement)
   when running in demo mode (?demo=true).
   
   Data sources (priority order):
   1. TourProvider conciergeSimulated state (live tool-call driven)
   2. sessionStorage fallback (persisted by marketplace demo flow)
   3. Static demo constants (final fallback)
   ================================================================ */

"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEMO_DRAFT_SS_KEY,
  DEMO_INTENT_SS_KEY,
  buildDemoFirstTradeDraft,
  buildDemoFirstTradeIntent,
  DEMO_TRADE_REF,
  DEMO_SETTLEMENT_REF,
} from "./demoConstants";

/* ---------- Types ---------- */

export interface DemoFirstTradeDraft {
  selectedAssetId: string;
  quantity: number;
  deliveryMethod: string;
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  transactionIntent: string;
}

export interface DemoIndicativeSnapshot {
  tier: string;
  spotPriceUsd: number;
  totalWeightOz: number;
  baseSpotValueUsd: number;
  assetPremiumUsd: number;
  assetPremiumBps: number;
  platformFeeUsd: number;
  platformFeeBps: number;
  estimatedTotalUsd: number;
  capturedAt: string;
}

export interface DemoFirstTradeIntent {
  ref: string;
  assetId: string;
  quantity: number;
  deliveryMethod: string;
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  indicativeSnapshot?: DemoIndicativeSnapshot;
  submittedAt: string;
}

export interface UseDemoFirstTradeDraftReturn {
  /** Whether we're in demo mode */
  isDemoMode: boolean;
  /** The draft data for review/authorize pages */
  draft: DemoFirstTradeDraft;
  /** The full intent data for success/settlement pages */
  intent: DemoFirstTradeIntent;
  /** The trade reference */
  tradeRef: string;
  /** The settlement case reference */
  settlementRef: string;
}

/* ---------- Helpers ---------- */

function readSessionStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ---------- Hook ---------- */

/**
 * Returns deterministic demo first-trade data when ?demo=true.
 * Falls through: sessionStorage → static constants.
 * 
 * The fallback spot price of $3050/oz is used only when no
 * sessionStorage data exists. Live spot is preferred.
 */
export function useDemoFirstTradeDraft(
  liveSpotPrice?: number,
): UseDemoFirstTradeDraftReturn {
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  return useMemo(() => {
    // Try sessionStorage first (written by marketplace demo flow)
    const ssDraft = readSessionStorage<DemoFirstTradeDraft>(DEMO_DRAFT_SS_KEY);
    const ssIntent = readSessionStorage<DemoFirstTradeIntent>(DEMO_INTENT_SS_KEY);

    const spotFallback = liveSpotPrice ?? 3050;

    const draft: DemoFirstTradeDraft = ssDraft ?? buildDemoFirstTradeDraft();

    const intent: DemoFirstTradeIntent =
      ssIntent ?? buildDemoFirstTradeIntent(spotFallback);

    return {
      isDemoMode,
      draft,
      intent,
      tradeRef: intent.ref ?? DEMO_TRADE_REF,
      settlementRef: DEMO_SETTLEMENT_REF,
    };
  }, [isDemoMode, liveSpotPrice]);
}
