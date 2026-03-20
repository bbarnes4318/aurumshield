"use client";

/* ================================================================
   OFFTAKER ROOT — /offtaker
   ================================================================
   Pure redirect page. Routes cleared users to the Marketplace and
   uncleared users to org selection. The Command Center is NOT
   visible on the portal after compliance approval.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

export default function OfftakerRootPage() {
  const router = useRouter();
  const { data: onboardingState, isLoading: complianceLoading } = useOnboardingState();
  const isCleared = onboardingState?.status === "COMPLETED";

  useEffect(() => {
    if (complianceLoading) return;

    if (isCleared) {
      router.replace("/offtaker/marketplace");
    } else {
      router.replace("/offtaker/org/select");
    }
  }, [complianceLoading, isCleared, router]);

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
        <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
          Routing...
        </span>
      </div>
    </div>
  );
}
