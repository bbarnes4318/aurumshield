/* ================================================================
   OANDA ADAPTER — Live XAU/USD Spot Price
   ================================================================
   Fetches the live gold spot price from the OANDA REST API (v3).
   Falls back to a static mock price when credentials are absent.

   Requires:
     - OANDA_API_KEY  (env var, not public)
     - OANDA_ACCOUNT_ID (env var, not public) — optional for pricing

   API Endpoint:
     GET https://api-fxpractice.oanda.com/v3/accounts/{accountId}/pricing
         ?instruments=XAU_USD

   The adapter caches the last fetched price for 30 seconds to
   reduce API calls during rapid page loads.
   ================================================================ */

/* ---------- Types ---------- */

export interface SpotPriceResult {
  /** Mid-market price per troy ounce in USD */
  pricePerOz: number;
  /** ISO timestamp of the price observation */
  timestamp: string;
  /** Whether this price came from the live API or a mock fallback */
  source: "oanda_live" | "mock_fallback";
  /** Bid price (if available from API) */
  bid: number | null;
  /** Ask price (if available from API) */
  ask: number | null;
  /** Spread in USD (ask - bid) */
  spread: number | null;
}

/* ---------- Environment ---------- */

const OANDA_API_BASE = "https://api-fxpractice.oanda.com/v3";

function getOandaCredentials(): { apiKey: string; accountId: string } | null {
  const apiKey = process.env.OANDA_API_KEY;
  const accountId = process.env.OANDA_ACCOUNT_ID ?? "101-001-00000000-001";

  if (!apiKey || apiKey === "YOUR_OANDA_API_KEY") return null;
  return { apiKey, accountId };
}

/* ---------- Cache ---------- */

const CACHE_TTL_MS = 30_000; // 30 seconds

let cachedResult: SpotPriceResult | null = null;
let cachedAt = 0;

/* ---------- Mock Fallback ---------- */

const MOCK_SPOT_PRICE = 2_342.50; // Realistic XAU/USD price

function mockSpotPrice(): SpotPriceResult {
  return {
    pricePerOz: MOCK_SPOT_PRICE,
    timestamp: new Date().toISOString(),
    source: "mock_fallback",
    bid: MOCK_SPOT_PRICE - 0.25,
    ask: MOCK_SPOT_PRICE + 0.25,
    spread: 0.50,
  };
}

/* ---------- Public API ---------- */

/**
 * Fetch the current XAU/USD spot price.
 *
 * 1. Returns cached value if within TTL.
 * 2. Calls OANDA v3 Pricing API if credentials are present.
 * 3. Falls back to deterministic mock price if OANDA_API_KEY is absent
 *    or the API call fails.
 *
 * Never throws — always returns a structured SpotPriceResult.
 */
export async function getSpotPrice(): Promise<SpotPriceResult> {
  const now = Date.now();

  // Return cache if fresh
  if (cachedResult && now - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }

  const creds = getOandaCredentials();
  if (!creds) {
    console.warn(
      "[AurumShield] OANDA_API_KEY not set — using mock spot price ($" +
        MOCK_SPOT_PRICE.toLocaleString() +
        "/oz)",
    );
    const result = mockSpotPrice();
    cachedResult = result;
    cachedAt = now;
    return result;
  }

  try {
    const url = `${OANDA_API_BASE}/accounts/${creds.accountId}/pricing?instruments=XAU_USD`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[AurumShield] OANDA API ${response.status}: ${body}`);
      const fallback = mockSpotPrice();
      cachedResult = fallback;
      cachedAt = now;
      return fallback;
    }

    const data = await response.json();
    const pricing = data.prices?.[0];

    if (!pricing) {
      console.warn("[AurumShield] OANDA returned no pricing data — using mock fallback");
      const fallback = mockSpotPrice();
      cachedResult = fallback;
      cachedAt = now;
      return fallback;
    }

    const bid = parseFloat(pricing.bids?.[0]?.price ?? "0");
    const ask = parseFloat(pricing.asks?.[0]?.price ?? "0");
    const mid = (bid + ask) / 2;

    const result: SpotPriceResult = {
      pricePerOz: parseFloat(mid.toFixed(2)),
      timestamp: pricing.time ?? new Date().toISOString(),
      source: "oanda_live",
      bid: parseFloat(bid.toFixed(2)),
      ask: parseFloat(ask.toFixed(2)),
      spread: parseFloat((ask - bid).toFixed(2)),
    };

    cachedResult = result;
    cachedAt = now;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] OANDA getSpotPrice exception:", message);
    const fallback = mockSpotPrice();
    cachedResult = fallback;
    cachedAt = now;
    return fallback;
  }
}

/**
 * Force-clear the cached price.
 * Useful for testing or when a manual refresh is needed.
 */
export function invalidateSpotPriceCache(): void {
  cachedResult = null;
  cachedAt = 0;
}
