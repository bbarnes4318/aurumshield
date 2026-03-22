"use client";

/* ================================================================
   PRODUCER PORTAL LAYOUT — PortalShell
   ================================================================
   Refinery and mining producer terminal. Inventory management,
   order tracking, and compliance accreditation.
   ================================================================ */

import { type ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { LayoutDashboard, Package, ClipboardList, Shield } from "lucide-react";

/* ── Navigation: 4-Pillar Structure ── */
const NAV_ITEMS = [
  { href: "/producer",            label: "Production Dashboard", icon: LayoutDashboard },
  { href: "/producer/inventory",  label: "Inventory",            icon: Package },
  { href: "/producer/orders",     label: "Orders",               icon: ClipboardList },
  { href: "/producer/compliance", label: "Compliance",           icon: Shield },
] as const;

export default function ProducerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      navItems={[...NAV_ITEMS]}
      sectionLabel="Producer Terminal"
      portalLabel="Producer Portal v1.0"
      portalSubLabel="AurumShield Supply Network"
    >
      {children}
    </PortalShell>
  );
}
