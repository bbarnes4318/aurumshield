/* ================================================================
   GOLD PRICE HOOK — Live GoldAPI.io XAU/USD Spot Feed
   ================================================================
   Production TanStack Query hook polling the GoldAPI.io REST API
   every 10 seconds. Returns the current XAU/USD spot price,
   24h change data, and a live/error status for UI telemetry.

   Requirements:
     - NEXT_PUBLIC_GOLD_API_KEY must be set (client-side env var)
     - API endpoint: https://www.goldapi.io/api/XAU/USD
     - Hard error if key is missing or API returns 401/403/429
     - No fake simulator fallbacks — data is real or offline
   ================================================================ */

import { useQuery } from "@tanstack/react-query";

/* ── Return types ── */

export interface GoldPriceData {
  /** Current XAU/USD spot price in dollars */
  spotPriceUsd: number;
  /** 24h price change in dollars */
  change24h: number;
  /** 24h price change as a percentage */
  changePct24h: number;
  /** ISO 8601 timestamp of last successful fetch */
  updatedAt: string;
}

export interface GoldPriceResult {
  /** The live price data (undefined while loading or on error) */
  data: GoldPriceData | undefined;
  /** True while the initial fetch is in-flight */
  isLoading: boolean;
  /** True if the API key is missing or the fetch failed */
  isError: boolean;
  /** Human-readable error message for logging/debug */
  errorMessage: string | null;
  /** True only when data is fresh and the polling connection is active */
  isLive: boolean;
}

/* ── Institutional-grade USD formatter ── */
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format a number as USD (e.g., "$2,648.32") */
export function formatSpotPrice(price: number): string {
  return usdFormatter.format(price);
}

/* ── API Key gate ── */
const GOLD_API_KEY = typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_GOLD_API_KEY ?? ""
  : process.env.NEXT_PUBLIC_GOLD_API_KEY ?? "";

const API_KEY_PRESENT = GOLD_API_KEY.length > 0;

/* ── GoldAPI response shape ── */
interface GoldApiResponse {
  /** XAU/USD spot price */
  price: number;
  /** Previous close price */
  prev_close_price: number;
  /** 24h price change */
  ch: number;
  /** 24h percentage change */
  chp: number;
  /** API timestamp */
  timestamp: number;
}

/* ── Fetcher ── */
async function fetchGoldPrice(): Promise<GoldPriceData> {
  if (!API_KEY_PRESENT) {
    console.error(
      "[GOLD-ORACLE] NEXT_PUBLIC_GOLD_API_KEY is not configured. " +
      "Live pricing is OFFLINE. Set the env var and redeploy."
    );
    throw new Error("GOLD_API_KEY_MISSING");
  }

  const res = await fetch("https://www.goldapi.io/api/XAU/USD", {
    headers: {
      "x-access-token": GOLD_API_KEY,
      "Content-Type": "application/json",
    },
    // Bypass Next.js caching — always hit the origin
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    console.error(
      `[GOLD-ORACLE] GoldAPI returned ${res.status} — API key is invalid or revoked.`
    );
    throw new Error(`GOLD_API_AUTH_FAILURE_${res.status}`);
  }

  if (res.status === 429) {
    console.error(
      "[GOLD-ORACLE] GoldAPI returned 429 — rate limit exceeded. " +
      "Current plan may need upgrade or reduce polling frequency."
    );
    throw new Error("GOLD_API_RATE_LIMITED");
  }

  if (!res.ok) {
    console.error(
      `[GOLD-ORACLE] GoldAPI returned unexpected ${res.status}: ${res.statusText}`
    );
    throw new Error(`GOLD_API_HTTP_${res.status}`);
  }

  const data: GoldApiResponse = await res.json();

  if (typeof data.price !== "number" || data.price <= 0) {
    console.error("[GOLD-ORACLE] GoldAPI returned invalid price payload:", data);
    throw new Error("GOLD_API_INVALID_PAYLOAD");
  }

  return {
    spotPriceUsd: data.price,
    change24h: data.ch ?? 0,
    changePct24h: data.chp ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

/* ── Error dedup (module-scoped) ── */
const _loggedErrors = new Set<string>();

/* ── Hook ── */

/**
 * Live XAU/USD spot price hook backed by GoldAPI.io.
 * Polls every 10 seconds. Returns `isError: true` and
 * `isLive: false` when the API key is missing or the feed fails.
 *
 * UI components should render [PRICING OFFLINE] when `isError` is true.
 */
export function useGoldPrice(): GoldPriceResult {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<GoldPriceData>({
    queryKey: ["gold-spot-price-live"],
    queryFn: fetchGoldPrice,
    // Poll exactly every 10 seconds
    refetchInterval: 10_000,
    // Data is stale after 8 seconds (triggers background refetch)
    staleTime: 8_000,
    // Keep showing previous data while refetching
    refetchOnWindowFocus: true,
    // Don't retry on auth/missing-key errors — they won't self-heal
    retry: (failureCount, err) => {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg === "GOLD_API_KEY_MISSING" ||
        msg.startsWith("GOLD_API_AUTH_FAILURE")
      ) {
        return false;
      }
      // Retry transient errors up to 3 times
      return failureCount < 3;
    },
    // Disable the query entirely if the key is missing (avoids noise)
    enabled: API_KEY_PRESENT,
  });

  const errorMessage = !API_KEY_PRESENT
    ? "NEXT_PUBLIC_GOLD_API_KEY not configured"
    : isError && error instanceof Error
      ? error.message
      : isError
        ? "Unknown pricing oracle failure"
        : null;

  // Log errors once on mount failures (not on every render)
  if (errorMessage && typeof window !== "undefined") {
    if (!_loggedErrors.has(errorMessage)) {
      console.error(`[GOLD-ORACLE] ${errorMessage}`);
      _loggedErrors.add(errorMessage);
    }
  }

  return {
    data,
    isLoading: API_KEY_PRESENT ? isLoading : false,
    isError: !API_KEY_PRESENT || isError,
    errorMessage,
    // Live = we have data AND no current error AND key is present
    isLive: API_KEY_PRESENT && !isError && data !== undefined,
  };
}
