"use client";

/* ================================================================
   BROKER PORTAL LAYOUT — PortalShell + BrokerComplianceGate
   ================================================================ */

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";
import { INSTITUTIONAL_ROUTES } from "@/lib/routing/institutional-routes";
import {
  Loader2,
  ShieldAlert,
  LayoutDashboard,
  Handshake,
  Users,
  Shield,
} from "lucide-react";

/* ── Operator roles that bypass the compliance gate (admin impersonation) ── */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

/* ══════════════════════════════════════════════════════════════════
   BROKER COMPLIANCE GATE — The Trapdoor
   ══════════════════════════════════════════════════════════════════ */

function BrokerComplianceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "offtaker";
  const isOperator = OPERATOR_ROLES.includes(role);

  const {
    data: onboardingState,
    isLoading,
    isError,
  } = useOnboardingState(!isOperator);

  const isCleared = isOperator || onboardingState?.status === "COMPLETED";

  useEffect(() => {
    if (isOperator) return;
    if (isLoading || isError) return;
    if (!isCleared) {
      router.replace(INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION);
    }
  }, [isOperator, isLoading, isError, isCleared, router]);

  if (isOperator) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
          Verifying Broker Compliance Perimeter
        </span>
        <span className="font-mono text-[9px] text-slate-700 tracking-wider mt-1">
          AML / KYB / IDENTITY — DO NOT CLOSE THIS WINDOW
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-red-400 mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Compliance Verification Failed
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Unable to verify broker credentials. Retrying automatically...
        </span>
      </div>
    );
  }

  if (!isCleared) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-slate-400 mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Compliance Clearance Required
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Redirecting to AML/KYB verification...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

/* ── Navigation: 4-Pillar Structure ── */
const NAV_ITEMS = [
  { href: "/broker",            label: "Command Center",  icon: LayoutDashboard },
  { href: "/broker/deals",      label: "Deal Pipeline",   icon: Handshake },
  { href: "/broker/clients",    label: "Client Network",  icon: Users },
  { href: "/broker/compliance", label: "AML Compliance",  icon: Shield },
] as const;

export default function BrokerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Command Center"
      portalLabel="Broker Portal v1.0"
      complianceGate={BrokerComplianceGate}
      showGoldwire
      goldwireHref="/transactions/new"
    >
      {children}
    </PortalShell>
  );
}
