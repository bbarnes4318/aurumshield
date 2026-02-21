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
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState } from "@/components/ui/state-views";

export default function PlatformRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth has finished loading
    if (isLoading) return;

    // If they aren't logged in, kick them back to login
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // STRICT ROLE-BASED ROUTING
    switch (user.role) {
      case "admin":
      case "treasury":
      case "compliance":
      case "vault_ops":
        router.replace("/dashboard"); // Admins go to Risk Dashboard
        break;
      case "seller":
        router.replace("/seller"); // Sellers go to Seller Home
        break;
      case "buyer":
      default:
        router.replace("/buyer"); // Buyers (and any fallback) go to Buyer Home
        break;
    }
  }, [user, isLoading, isAuthenticated, router]);

  return <LoadingState message="Authenticating role and securing workspace..." />;
}
