"use client";

/* ================================================================
   PLATFORM ROUTER — "Traffic Cop"
   ================================================================
   Post-login landing page. Checks the user's role from the auth
   provider and redirects them to the correct surface:

   admin / treasury / compliance / vault_ops → /dashboard
   seller                                    → /seller
   buyer (default)                           → /buyer
   unauthenticated                           → /login

   NOTE: KYC status no longer gates navigation. Buyers always
   land on /buyer. The ComplianceBanner (rendered in the AppShell)
   prompts verification, and server-side capability checks in
   authz.ts enforce action-level gating.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState } from "@/components/ui/state-views";

export default function PlatformRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // STRICT ROLE-BASED ROUTING (no KYC gatekeeping)
    switch (user.role) {
      case "admin":
      case "treasury":
      case "compliance":
      case "vault_ops":
        router.replace("/dashboard");
        break;
      case "seller":
        router.replace("/seller");
        break;
      case "buyer":
      default:
        // Always route buyers to /buyer — ComplianceBanner
        // and capability-based UI gating handle the rest.
        router.replace("/buyer");
        break;
    }
  }, [user, isLoading, isAuthenticated, router]);

  return <LoadingState message="Authenticating role and securing workspace..." />;
}
