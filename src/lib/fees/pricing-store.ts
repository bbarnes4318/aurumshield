/* ================================================================
   PRICING STORE — localStorage-backed PricingConfig persistence
   
   Same pattern as settlement-store.ts.
   SSR-safe: falls back to factory defaults when window is unavailable.
   ================================================================ */

import {
  type PricingConfig,
  defaultPricingConfig,
} from "./fee-engine";

const STORAGE_KEY = "aurumshield:pricing-config";

/**
 * Load the current PricingConfig from localStorage.
 * Returns factory defaults when localStorage is empty, corrupt,
 * or when running server-side (SSR).
 */
export function loadPricingConfig(): PricingConfig {
  if (typeof window === "undefined") return defaultPricingConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PricingConfig;
      if (parsed.coreFee && parsed.addOnOverrides) {
        return parsed;
      }
    }
  } catch {
    // Corrupt data — fall through to defaults
  }
  return defaultPricingConfig();
}

/**
 * Persist PricingConfig to localStorage.
 * No-op during SSR.
 */
export function savePricingConfig(config: PricingConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Reset PricingConfig to factory defaults and persist.
 * Returns the fresh config.
 */
export function resetPricingConfig(): PricingConfig {
  const config = defaultPricingConfig();
  savePricingConfig(config);
  return config;
}
