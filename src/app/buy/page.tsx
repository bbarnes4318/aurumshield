"use client";

/* ================================================================
   /buy — Buyer Journey Entry Point
   ================================================================
   Redirects to the current phase in the buyer flow.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBuyerFlow, PHASE_META } from "@/stores/buyer-flow-store";

export default function BuyEntryPage() {
  const router = useRouter();
  const { currentPhase } = useBuyerFlow();

  useEffect(() => {
    router.replace(PHASE_META[currentPhase].path);
  }, [currentPhase, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#c6a86b]" />
        <p className="text-sm text-slate-400">Loading your journey…</p>
      </div>
    </div>
  );
}
