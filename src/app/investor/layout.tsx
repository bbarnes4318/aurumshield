"use client";

/* ================================================================
   INVESTOR PORTAL LAYOUT — PortalShell
   ================================================================
   LP Telemetry Terminal for Limited Partners and venture backers.
   Read-only, high-level platform performance data room.
   ================================================================ */

import { type ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { BarChart3, Landmark, FileText } from "lucide-react";

/* ── Navigation: 3-Pillar Structure ── */
const NAV_ITEMS = [
  { href: "/investor",           label: "Platform Overview",  icon: BarChart3 },
  { href: "/investor/cap-table", label: "Capital Cap Table",  icon: Landmark },
  { href: "/investor/reports",   label: "Reports",            icon: FileText },
] as const;

export default function InvestorLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Data Room"
      portalLabel="Investor Portal v1.0"
      portalSubLabel="Read-Only Access — No Trade Execution"
      showGoldwire
      goldwireHref="/investor/goldwire"
    >
      {children}
    </PortalShell>
  );
}
