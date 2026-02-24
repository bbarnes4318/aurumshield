"use client";

/* ================================================================
   MARKETPLACE PAGE — Route entry for /marketplace
   ================================================================
   Thin wrapper that imports MarketplaceContent and renders it
   inside a Suspense boundary.

   MarketplaceContent is extracted to a separate component file
   so it can be reused in the buyer slide-out panel without
   violating Next.js page export constraints.
   ================================================================ */

import { Suspense } from "react";
import { LoadingState } from "@/components/ui/state-views";
import { MarketplaceContent } from "@/components/marketplace/MarketplaceContent";

/* ================================================================
   Default Page Export
   ================================================================ */

export default function MarketplacePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading marketplace…" />}>
      <MarketplaceContent />
    </Suspense>
  );
}
