/* ================================================================
   PRODUCER COMMAND CENTER — Async Server Component
   ================================================================
   Dual-Mode Data Fetching:
     - Demo mode (?demo=true): Passes empty arrays as props;
       CommandCenterUI uses its internal mock arrays.
     - Live mode: Queries PostgreSQL via producer-queries.ts
       using the authenticated Clerk userId.

   Interactive UI (zero-state toggle, table, radar) is delegated
   to the CommandCenterUI client component.
   ================================================================ */

import { auth } from "@clerk/nextjs/server";
import {
  getProducerInventory,
  getProducerSettlements,
  getProducerMetrics,
} from "@/actions/producer-queries";
import CommandCenterUI, {
  type InventoryAsset,
  type Settlement,
  type CommandCenterMetrics,
} from "./CommandCenterUI";

/* ================================================================
   SERVER COMPONENT
   ================================================================ */
export default async function ProducerCommandCenter({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const isDemo =
    resolvedSearchParams.demo === "true" ||
    resolvedSearchParams.demo === "active";

  let inventory: InventoryAsset[] = [];
  let settlements: Settlement[] = [];
  let metrics: CommandCenterMetrics = {
    vaultedGoodDeliveryOz: 0,
    doreInRefineryOz: 0,
    pendingCapital: 0,
    ytdClearedCapital: 0,
  };

  if (!isDemo) {
    /* ── Live Branch: Query PostgreSQL with authenticated userId ── */
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized: Clerk session required for live Producer Command Center.");
    }

    const producerId = userId;

    try {
      const [liveInventory, liveSettlements, liveMetrics] = await Promise.all([
        getProducerInventory(producerId),
        getProducerSettlements(producerId),
        getProducerMetrics(producerId),
      ]);

      inventory = liveInventory;
      settlements = liveSettlements;
      metrics = liveMetrics;
    } catch (err) {
      console.error(
        "[ProducerCommandCenter] Failed to fetch live data, falling back to empty state:",
        err instanceof Error ? err.message : err,
      );
      // Graceful degradation: render zero-state rather than crash
    }
  }
  /* ── Demo Branch: pass empty arrays, CommandCenterUI will use its internal mocks ── */

  return (
    <CommandCenterUI
      inventory={inventory}
      settlements={settlements}
      metrics={metrics}
      isDemo={isDemo}
    />
  );
}
