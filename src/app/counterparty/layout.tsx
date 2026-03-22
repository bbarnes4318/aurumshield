"use client";

/* ================================================================
   COUNTERPARTY PORTAL LAYOUT — PortalShell + AML Gate
   ================================================================
   Counterparties MUST complete AML Training. The compliance gate
   checks AML status and blocks access until training is done.
   ================================================================ */

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { useAmlStatus } from "@/hooks/use-aml-status";
import {
  Loader2,
  LayoutDashboard,
  ArrowLeftRight,
  Shield,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   COUNTERPARTY AML GATE
   ══════════════════════════════════════════════════════════════════
   Blocks ALL counterparty portal access until AML training is
   complete. Does NOT redirect — renders a blocking UI with a
   direct link to the compliance/training page.
   ══════════════════════════════════════════════════════════════════ */

function CounterpartyAmlGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: amlStatus, isLoading } = useAmlStatus();

  useEffect(() => {
    if (isLoading) return;
    if (amlStatus && !amlStatus.isComplete) {
      router.replace("/counterparty/compliance");
    }
  }, [isLoading, amlStatus, router]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
          Verifying AML Compliance Status
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

/* ── Navigation: 3-Pillar Structure ── */
const NAV_ITEMS = [
  { href: "/counterparty",              label: "Dashboard",      icon: LayoutDashboard },
  { href: "/counterparty/transactions", label: "Transactions",   icon: ArrowLeftRight },
  { href: "/counterparty/compliance",   label: "AML Compliance", icon: Shield },
] as const;

export default function CounterpartyLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Counterparty"
      portalLabel="Counterparty Portal v1.0"
      portalSubLabel="AurumShield Compliance Network"
      complianceGate={CounterpartyAmlGate}
    >
      {children}
    </PortalShell>
  );
}
