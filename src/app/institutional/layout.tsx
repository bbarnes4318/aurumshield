"use client";

/* ================================================================
   INSTITUTIONAL LAYOUT — Smart Entry Router
   ================================================================
   Serves two experiences:

   1. GUIDED FLOW (incomplete users):
      /institutional/get-started/* routes render through their own
      GuidedShellLayout — no PortalShell, no sidebar.
      The compliance gate allows these routes through to prevent
      redirect loops.

   2. ADVANCED WORKSPACE (completed users):
      /institutional, /marketplace, /orders, /compliance render
      inside the full PortalShell with sidebar + compliance gate.

   Routing truth:
     incomplete + NOT on /get-started → redirect to /get-started/welcome
     incomplete + ON /get-started     → allow through (GuidedShellLayout)
     completed  + any route           → allow through (PortalShell)
   ================================================================ */

import { type ReactNode, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { MissionLayout } from "@/components/institutional-flow/MissionLayout";
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
   ══════════════════════════════════════════════════════════════════
   Controls access to the ADVANCED institutional workspace.
   Incomplete users on non-guided routes are redirected to the
   guided entry flow at /institutional/get-started/welcome.
   ══════════════════════════════════════════════════════════════════ */

function StrictComplianceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
  const {
    data: onboardingState,
    isLoading,
    isError,
  } = useOnboardingState();

  const isCleared = onboardingState?.status === "COMPLETED";

  /* ── Guided path passthrough ──
     If the user is already on /institutional/get-started/*, the
     GuidedShellLayout handles rendering. The compliance gate must
     NOT redirect these routes or a loop will occur. */
  const isOnGuidedPath =
    pathname.startsWith("/institutional/get-started") ||
    pathname.startsWith("/institutional/first-trade");

  useEffect(() => {
    if (isLoading || isError) return;
    if (isOnGuidedPath) return; // Never redirect guided routes
    if (isDemoMode) return; // Demo mode bypasses compliance gate
    if (!isCleared) {
      router.replace("/institutional/get-started/welcome");
    }
  }, [isLoading, isError, isCleared, isOnGuidedPath, isDemoMode, router]);

  /* ── Guided path or demo mode: skip all gate UI ── */
  if (isOnGuidedPath || isDemoMode) {
    return <>{children}</>;
  }

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
        <Loader2 className="h-6 w-6 text-slate-500 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Preparing Your Guided Setup
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Redirecting...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

/* ── Navigation: 4-Pillar Structure (advanced workspace only) ── */
const NAV_ITEMS = [
  { href: "/institutional",             label: "Portfolio Overview", icon: Briefcase },
  { href: "/institutional/marketplace", label: "Marketplace",       icon: Store },
  { href: "/institutional/orders",      label: "Orders",            icon: ClipboardList },
  { href: "/institutional/compliance",  label: "Compliance",        icon: Shield },
] as const;

export default function InstitutionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  /* ── Guided flow: bypass PortalShell entirely ──
     The GuidedShellLayout provides its own full-screen calm layout.
     Wrapping it in PortalShell would inject the sidebar + nav chrome. */
  if (
    pathname.startsWith("/institutional/get-started") ||
    pathname.startsWith("/institutional/first-trade")
  ) {
    return (
      <StrictComplianceGate>
        {children}
      </StrictComplianceGate>
    );
  }

  /* ── Demo mode for non-guided routes (marketplace): 
     Use MissionLayout instead of PortalShell so spotlight/subtitles/overlay work ── */
  if (isDemoMode) {
    return (
      <StrictComplianceGate>
        <MissionLayout currentStage="FIRST_TRADE_ASSET" showProgress>
          {children}
        </MissionLayout>
      </StrictComplianceGate>
    );
  }

  /* ── Advanced workspace: full PortalShell + compliance gate ── */
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Command Center"
      portalLabel="Institutional Terminal v1.0"
      portalSubLabel="AurumShield Goldwire Network"
      complianceGate={StrictComplianceGate}
      showGoldwire
      goldwireHref="/institutional/marketplace"
    >
      {children}
    </PortalShell>
  );
}
