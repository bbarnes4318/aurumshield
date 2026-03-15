/* ================================================================
   TREASURY RISK DASHBOARD — Async Server Component
   ================================================================
   Dual-Mode Data Fetching:
     - Demo mode (?demo=true): Passes getMockDashboardData() to UI.
     - Live mode: Queries PostgreSQL via getLiveDashboardMetrics()
       and passes live data to the DashboardUI client component.

   Interactive UI (scenario toggle, panels, intraday card) is
   delegated to the DashboardUI client component.
   ================================================================ */

import { getLiveDashboardMetrics } from "@/actions/treasury-queries";
import { getMockDashboardData } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/mock-data";
import DashboardUI from "./DashboardUI";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const isDemo =
    resolvedSearchParams.demo === "true" ||
    resolvedSearchParams.demo === "active";

  let dashboardData: DashboardData;

  if (isDemo) {
    /* ── Demo Branch: Use mock data ── */
    dashboardData = getMockDashboardData("phase1");
  } else {
    /* ── Live Branch: Query PostgreSQL ── */
    try {
      dashboardData = await getLiveDashboardMetrics();
    } catch (err) {
      console.error(
        "[DashboardPage] Failed to fetch live metrics, falling back to mock data:",
        err instanceof Error ? err.message : err,
      );
      // Graceful degradation: render with mock data rather than crash
      dashboardData = getMockDashboardData("phase1");
    }
  }

  return <DashboardUI initialData={dashboardData} isDemo={isDemo} />;
}
