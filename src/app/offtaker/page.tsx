"use client";

/* ================================================================
   OFFTAKER ROOT — /offtaker
   ================================================================
   Pure redirect page. Routes cleared users to the Marketplace and
   uncleared users to org selection. Does NOT redirect when the
   compliance state API is erroring — prevents false redirects.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";

/* ── Operator roles bypass KYC entirely ── */
const OPERATOR_ROLES: UserRole[] = ["admin", "compliance", "treasury", "vault_ops", "INSTITUTION_TRADER", "INSTITUTION_TREASURY"];

export default function OfftakerRootPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "offtaker";
  const isOperator = OPERATOR_ROLES.includes(role);

  const { data: onboardingState, isLoading: complianceLoading, isError, refetch } = useOnboardingState(!isOperator);
  const isCleared = onboardingState?.status === "COMPLETED";

  useEffect(() => {
    // Operators bypass compliance entirely — straight to marketplace
    if (isOperator) {
      router.replace("/offtaker/marketplace");
      return;
    }

    if (complianceLoading || isError) return; // NEVER redirect on error

    if (isCleared) {
      router.replace("/offtaker/marketplace");
    } else {
      router.replace("/offtaker/org/select");
    }
  }, [complianceLoading, isCleared, isError, isOperator, router]);

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 max-w-md text-center">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <span className="font-mono text-xs text-slate-400">
            Unable to verify compliance status. Retrying...
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-mono text-[10px] text-gold-primary border border-gold-primary/30 px-4 py-2 hover:bg-gold-primary/10 transition-colors cursor-pointer tracking-wider uppercase"
          >
            Retry Now
          </button>
        </div>
      </div>
    );
  }

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

