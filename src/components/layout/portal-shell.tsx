"use client";

/* ================================================================
   PORTAL SHELL — Unified Side-by-Side Layout for All Portals
   ================================================================
   Shared layout component used by all 5 portal types:
   Institutional, Producer, Broker, Counterparty, Investor.

   Accepts role-specific nav items, optional compliance gate wrapper,
   and optional Goldwire navigation link.

   CRITICAL: The Topbar wrapper CSS and prop signature MUST be
   identical to AppShell. Any deviation causes visual mismatches.

   Structure:
     ┌──────┬─────────────────────────────────────┐
     │ LOGO │  TOPBAR h-16  (shared component)     │
     │ h-16 │                                      │
     ├──────┼─────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 scrollable)  │
     │  BAR │                                      │
     │ w-64 │                                      │
     └──────┴─────────────────────────────────────┘
   ================================================================ */

import { type ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Topbar } from "@/components/layout/topbar";
import type { LucideIcon } from "lucide-react";

/* ── Types ── */

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon | string;
}

export interface PortalShellProps {
  children: ReactNode;
  /** Portal-specific navigation items */
  navItems: PortalNavItem[];
  /** Sidebar section label (e.g. "Command Center") */
  sectionLabel?: string;
  /** Sidebar footer label (e.g. "Broker Portal v1.0") */
  portalLabel: string;
  /** Optional footer subtitle */
  portalSubLabel?: string;
  /** Optional compliance gate wrapper component */
  complianceGate?: React.ComponentType<{ children: ReactNode }>;
  /** Show Goldwire link after first nav item */
  showGoldwire?: boolean;
  /** Goldwire href target */
  goldwireHref?: string;
}

/* ── Goldwire Link Sub-Component ── */

function GoldwireNavLink({ href, pathname }: { href: string; pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors mt-1",
        isActive ? "bg-slate-800" : "hover:bg-slate-800/50",
      ].join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/goldwire-logo.svg"
        alt="Goldwire"
        className="h-4 w-auto shrink-0"
        style={{ filter: isActive ? "brightness(1.3)" : "brightness(0.85)" }}
      />
    </Link>
  );
}

/* ── Mobile Sidebar Drawer ── */

function MobileSidebarDrawer({
  isOpen,
  onClose,
  navItems,
  sectionLabel,
  portalLabel,
  showGoldwire,
  goldwireHref,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: PortalNavItem[];
  sectionLabel?: string;
  portalLabel: string;
  showGoldwire: boolean;
  goldwireHref: string;
  pathname: string;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-slate-800 bg-slate-950 flex flex-col shadow-2xl">
        {/* Logo */}
        <div className="h-16 shrink-0 flex items-center justify-between border-b border-slate-800 px-5">
          <AppLogo className="h-8 w-auto" variant="dark" />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section label */}
        {sectionLabel && (
          <div className="px-4 pt-4 pb-2">
            <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
              {sectionLabel}
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item, idx) => {
            const isRootItem = idx === 0;
            const isActive = isRootItem ? pathname === item.href : pathname.startsWith(item.href);
            const iconEl = typeof item.icon === "string"
              ? <span className="text-base leading-none">{item.icon}</span>
              : <item.icon className="h-4 w-4" />;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                  ].join(" ")}
                >
                  {iconEl}
                  <span>{item.label}</span>
                </Link>
                {idx === 0 && showGoldwire && (
                  <GoldwireNavLink href={goldwireHref} pathname={pathname} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            {portalLabel}
          </p>
        </div>
      </aside>
    </>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function PortalShell({
  children,
  navItems,
  sectionLabel,
  portalLabel,
  portalSubLabel,
  complianceGate: ComplianceGate,
  showGoldwire = false,
  goldwireHref = "/transactions/new",
}: PortalShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Hydration guard: prevent React #418 ── */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line -- Hydration guard
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return <div className="absolute inset-0 bg-slate-950" />;
  }

  const shell = (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300" suppressHydrationWarning>

      {/* ── LEFT SIDEBAR (desktop only) ── */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex-col">
        {/* Logo box — h-16 to match Topbar */}
        <div className="h-16 shrink-0 flex items-center justify-center border-b border-slate-800 px-5">
          <AppLogo className="h-8 w-auto" variant="dark" />
        </div>

        {/* Section label */}
        {sectionLabel && (
          <div className="px-4 pt-4 pb-2">
            <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
              {sectionLabel}
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item, idx) => {
            /* Determine if this is the "root" link for exact match */
            const isRootItem = idx === 0;
            const isActive = isRootItem
              ? pathname === item.href
              : pathname.startsWith(item.href);

            /* Render icon: supports both LucideIcon components and string glyphs */
            const iconEl =
              typeof item.icon === "string" ? (
                <span className="text-base leading-none">{item.icon}</span>
              ) : (
                <item.icon className="h-4 w-4" />
              );

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                  ].join(" ")}
                >
                  {iconEl}
                  <span>{item.label}</span>
                </Link>
                {/* Goldwire logo link — inserted after first nav item */}
                {idx === 0 && showGoldwire && (
                  <GoldwireNavLink href={goldwireHref} pathname={pathname} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            {portalLabel}
          </p>
          {portalSubLabel && (
            <p className="text-[9px] font-mono text-slate-700 mt-0.5">
              {portalSubLabel}
            </p>
          )}
        </div>
      </aside>

      {/* ── RIGHT SIDE: Topbar + Main ── */}
      {/* MATCHED TO AppShell: flex flex-1 flex-col overflow-hidden */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Shared Topbar — CSS wrapper + props identical to AppShell */}
        <div data-tour-topbar>
          <Topbar
            collapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* Main Scrollable Content */}
        <main className="flex-1 min-h-0 overflow-y-auto relative">
          {children}
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      <MobileSidebarDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={navItems}
        sectionLabel={sectionLabel}
        portalLabel={portalLabel}
        showGoldwire={showGoldwire}
        goldwireHref={goldwireHref}
        pathname={pathname}
      />

    </div>
  );

  /* Wrap in compliance gate if provided */
  if (ComplianceGate) {
    return <ComplianceGate>{shell}</ComplianceGate>;
  }

  return shell;
}

