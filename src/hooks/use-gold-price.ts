/* ================================================================
   GOLD PRICE HOOK — Real-Time Spot Price
   ================================================================
   TanStack Query hook returning the current XAU/USD spot price.
   Currently uses mock data with simulated fluctuation.
   TODO: Replace mock with live API (e.g., GoldAPI.io, Metals API)
   ================================================================ */

import { useQuery } from "@tanstack/react-query";

interface GoldPriceData {
  spotPriceUsd: number;
  change24h: number;
  changePct24h: number;
  updatedAt: string;
}

/**
 * Simulates a gold spot price with small random fluctuation.
 * In production, this will call a real pricing API.
 */
async function fetchGoldPrice(): Promise<GoldPriceData> {
  // TODO: Replace with real API call, e.g.:
  // const res = await fetch("https://api.goldapi.io/v1/XAU/USD", {
  //   headers: { "x-access-token": process.env.NEXT_PUBLIC_GOLD_API_KEY },
  // });
  // return res.json();

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));

  // Base price with small random fluctuation (±0.3%)
  const base = 2650.0;
  const fluctuation = (Math.random() - 0.5) * base * 0.006;
  const spot = Math.round((base + fluctuation) * 100) / 100;

  return {
    spotPriceUsd: spot,
    change24h: +(Math.random() * 30 - 15).toFixed(2),
    changePct24h: +(Math.random() * 1.2 - 0.6).toFixed(2),
    updatedAt: new Date().toISOString(),
  };
}

export function useGoldPrice() {
  return useQuery<GoldPriceData>({
    queryKey: ["gold-spot-price"],
    queryFn: fetchGoldPrice,
    refetchInterval: 30_000, // Refresh every 30 seconds
    staleTime: 15_000,
  });
}
