import { useQuery } from "@tanstack/react-query";
import { DEFAULT_RISK_CONFIG, type RiskConfiguration } from "@/lib/policy-engine";

/**
 * Fetches the active RiskConfiguration from /api/risk-config.
 *
 * - With a live DB: returns the active row from global_risk_parameters
 * - Without a DB (mock data): the endpoint falls back to DEFAULT_RISK_CONFIG
 * - On any client-side fetch failure: returns DEFAULT_RISK_CONFIG immediately
 *
 * staleTime is 60s to match the server-side TTL cache.
 */
export function useRiskConfig() {
  return useQuery<RiskConfiguration>({
    queryKey: ["risk-config"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/risk-config");
        if (!res.ok) return { ...DEFAULT_RISK_CONFIG };
        return (await res.json()) as RiskConfiguration;
      } catch {
        return { ...DEFAULT_RISK_CONFIG };
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    // Start with defaults so components never wait for the fetch
    initialData: DEFAULT_RISK_CONFIG,
  });
}
