"use client";

/* ================================================================
   MARKETPLACE — Legacy Redirect Stub
   ================================================================
   This page previously served standalone product selection.
   All buyer-facing marketplace access now routes through the
   canonical /institutional/marketplace path.
   
   The middleware handles the redirect for direct URL hits.
   This component handles any in-app navigation that bypasses
   middleware (e.g. client-side router.push).
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { INSTITUTIONAL_ROUTES } from "@/lib/routing/institutional-routes";

export default function MarketplacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(INSTITUTIONAL_ROUTES.MARKETPLACE);
  }, [router]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
      <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
        Redirecting to Institutional Marketplace…
      </span>
    </div>
  );
}
