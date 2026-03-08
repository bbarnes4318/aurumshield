"use client";

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

    // STRICT ROLE-BASED ROUTING
    switch (user.role) {
      case "admin":
      case "treasury":
      case "compliance":
      case "vault_ops":
        router.replace("/dashboard");
        break;
      case "seller":
      case "buyer":
      default:
        // Route standard counterparties to their transaction ledger, 
        // avoiding the missing /buyer route crash.
        router.replace("/transactions");
        break;
    }
  }, [user, isLoading, isAuthenticated, router]);

  return <LoadingState message="Authenticating role and securing workspace..." />;
}