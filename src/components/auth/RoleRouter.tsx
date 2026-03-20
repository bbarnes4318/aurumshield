"use client";

/* ================================================================
   ROLE ROUTER — Post-Login Traffic Controller
   ================================================================
   Invisible client component that intercepts generic routes
   (/dashboard, /) after authentication and redirects users to
   their role-specific portal.

   Logic:
     - OFFTAKER_ROLES → /offtaker/org/select
     - PRODUCER_ROLES → /producer/accreditation
     - BROKER_ROLES   → /broker
     - OPERATOR_ROLES → allowed through to /dashboard (no redirect)
   ================================================================ */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";

/* ── Role arrays (must match sidebar.tsx definitions) ── */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
];

const OFFTAKER_ROLES: UserRole[] = [
  "offtaker",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

const PRODUCER_ROLES: UserRole[] = [
  "producer",
  "REFINERY",
  "MINE",
];

const BROKER_ROLES: UserRole[] = [
  "BROKER",
];

/** Routes that trigger the role-based redirect */
const INTERCEPT_ROUTES = ["/dashboard"];

export function RoleRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "offtaker";

  useEffect(() => {
    // Only intercept specific generic routes
    if (!INTERCEPT_ROUTES.includes(pathname)) return;

    // Operators proceed to /dashboard — no redirect
    if (OPERATOR_ROLES.includes(role)) return;

    // Offtaker roles → offtaker portal entry point
    if (OFFTAKER_ROLES.includes(role)) {
      router.replace("/offtaker/org/select");
      return;
    }

    // Producer roles → producer portal entry point
    if (PRODUCER_ROLES.includes(role)) {
      router.replace("/producer/accreditation");
      return;
    }

    // Broker roles → broker portal entry point
    if (BROKER_ROLES.includes(role)) {
      router.replace("/broker");
      return;
    }

    // Fallback for legacy roles (buyer/seller) → offtaker portal
    router.replace("/offtaker/org/select");
  }, [pathname, role, router]);

  // Invisible — renders nothing
  return null;
}
