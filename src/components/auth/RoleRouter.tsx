"use client";

/* ================================================================
   ROLE ROUTER — Post-Login Traffic Controller
   ================================================================
   Invisible client component that intercepts generic routes
   (/dashboard, /) after authentication and redirects users to
   their role-specific portal.

   Logic:
     - OPERATOR_ROLES       → allowed through to /dashboard
     - INSTITUTIONAL_ROLES  → /institutional
       (dedicated institutional buyer terminal)
     - OFFTAKER_ROLES       → /offtaker/org/select
       (standard self-serve retail offtakers)
     - PRODUCER_ROLES       → /producer
     - BROKER_ROLES         → /broker
       (invite-only — compliance trapdoor enforced at layout level)
   ================================================================ */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";

/* ── Role arrays (must match sidebar.tsx definitions) ── */

/** Internal operators — full access to /dashboard */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
];

/** White-glove institutional buyers — routed to /institutional terminal */
const INSTITUTIONAL_ROLES: UserRole[] = [
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

/** Standard self-serve offtakers — routed to /offtaker portal */
const OFFTAKER_ROLES: UserRole[] = [
  "offtaker",
  "buyer" as UserRole,
  "seller" as UserRole,
];

const PRODUCER_ROLES: UserRole[] = [
  "producer",
  "REFINERY",
  "MINE",
];

/** Invite-only — org:broker assigned manually via Clerk */
const BROKER_ROLES: UserRole[] = [
  "BROKER",
];

/** LP / venture backers — read-only telemetry portal */
const INVESTOR_ROLES: UserRole[] = [
  "INVESTOR",
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

    // ── Operators proceed to /dashboard — no redirect ──
    if (OPERATOR_ROLES.includes(role)) return;

    // ── Institutional buyers → dedicated institutional terminal ──
    if (INSTITUTIONAL_ROLES.includes(role)) {
      router.replace("/institutional");
      return;
    }

    // ── Standard offtakers → offtaker portal entry point ──
    if (OFFTAKER_ROLES.includes(role)) {
      router.replace("/offtaker/org/select");
      return;
    }

    // ── Producer roles → producer SCADA terminal ──
    if (PRODUCER_ROLES.includes(role)) {
      router.replace("/producer");
      return;
    }

    // ── Broker roles → broker portal (compliance gate at layout level) ──
    if (BROKER_ROLES.includes(role)) {
      router.replace("/broker");
      return;
    }

    // ── Investor roles → investor telemetry portal ──
    if (INVESTOR_ROLES.includes(role)) {
      router.replace("/investor");
      return;
    }

    // ── Fallback for unrecognized roles → offtaker portal ──
    router.replace("/offtaker/org/select");
  }, [pathname, role, router]);

  // Invisible — renders nothing
  return null;
}
