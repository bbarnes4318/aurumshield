"use client";

/* ================================================================
   INSTITUTIONAL COMMAND CENTER LAYOUT — PortalShell + StrictComplianceGate
   ================================================================ */

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import {
  Loader2,
  ShieldAlert,
  Briefcase,
  Store,
  ClipboardList,
  Shield,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   STRICT COMPLIANCE GATE
   ══════════════════════════════════════════════════════════════════ */

function StrictComplianceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    data: onboardingState,
    isLoading,
    isError,
  } = useOnboardingState();

  const isCleared = onboardingState?.status === "COMPLETED";

  useEffect(() => {
    if (isLoading || isError) return;
    if (!isCleared) {
      router.replace("/institutional/compliance");
    }
  }, [isLoading, isError, isCleared, router]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
          Verifying Institutional Compliance Perimeter
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
          Unable to verify institutional credentials. Retrying automatically...
        </span>
      </div>
    );
  }

  if (!isCleared) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-slate-400 mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Institutional Compliance Clearance Required
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
  { href: "/institutional",             label: "Portfolio Overview", icon: Briefcase },
  { href: "/institutional/marketplace", label: "Marketplace",       icon: Store },
  { href: "/institutional/orders",      label: "Orders",            icon: ClipboardList },
  { href: "/institutional/compliance",  label: "Compliance",        icon: Shield },
] as const;

export default function InstitutionalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Command Center"
      portalLabel="Institutional Terminal v1.0"
      portalSubLabel="AurumShield Goldwire Network"
      complianceGate={StrictComplianceGate}
      showGoldwire
      goldwireHref="/transactions/new"
    >
      {children}
    </PortalShell>
  );
}
