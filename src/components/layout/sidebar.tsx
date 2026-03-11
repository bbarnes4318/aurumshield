"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Send,
  ListTree,
  Shield,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  ClipboardList,
  ToggleLeft,
  ToggleRight,
  Globe,
  Activity,
  Users,
  Settings,
  BookOpen,
  Landmark,
  AlertTriangle,
  Scale,
  FlaskConical,
  Eye,
  DollarSign,
  BadgeCheck,
  Network,
  Map,
  CalendarClock,
  Package,
  Truck,
  Fingerprint,
  Upload,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that can see this item. If omitted, visible to all roles. */
  allowedRoles?: UserRole[];
  /** If set, this item's href is dynamically overridden by Pro Toggle state. */
  proToggleKey?: "dashboard";
}

/* ── Roles considered "internal operators" — can see all admin links ── */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
];

/* ── Offtaker roles — restricted to /offtaker portal ── */
const OFFTAKER_ROLES: UserRole[] = [
  "offtaker",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

/* ── Producer roles — restricted to /producer portal ── */
const PRODUCER_ROLES: UserRole[] = [
  "producer",
  "REFINERY",
  "MINE",
];

/* ── localStorage key for Pro Toggle persistence ── */
const PRO_TOGGLE_KEY = "aurumshield:pro-execution-desk";

/* ── Operator-only nav items — grouped by section ── */

/* Core Operations */
const OPERATOR_OPS: NavItem[] = [
  { label: "Command Center",      href: "/dashboard",              icon: LayoutDashboard, allowedRoles: OPERATOR_ROLES },
  { label: "Execute Goldwire",    href: "/transactions/new",       icon: Send,            allowedRoles: OPERATOR_ROLES },
  { label: "Settlement Ledger",   href: "/transactions",           icon: ListTree,        allowedRoles: OPERATOR_ROLES },
  { label: "Settlements",         href: "/settlements",            icon: Landmark,        allowedRoles: OPERATOR_ROLES },
  { label: "Reservations",        href: "/reservations",           icon: CalendarClock,   allowedRoles: OPERATOR_ROLES },
  { label: "Counterparties",      href: "/counterparties",         icon: Users,           allowedRoles: OPERATOR_ROLES },
];

/* Risk & Compliance */
const OPERATOR_RISK: NavItem[] = [
  { label: "Compliance & Audit",  href: "/audit",                  icon: FileCheck,       allowedRoles: OPERATOR_ROLES },
  { label: "Claims",              href: "/claims",                 icon: AlertTriangle,   allowedRoles: OPERATOR_ROLES },
  { label: "Supervisory",         href: "/supervisory",            icon: Eye,             allowedRoles: OPERATOR_ROLES },
  { label: "Capital Controls",    href: "/capital-controls",       icon: Scale,           allowedRoles: OPERATOR_ROLES },
  { label: "Reinsurance",         href: "/reinsurance",            icon: Shield,          allowedRoles: OPERATOR_ROLES },
];

/* Market Infrastructure */
const OPERATOR_MARKET: NavItem[] = [
  { label: "Corridors",           href: "/corridors",              icon: Network,         allowedRoles: OPERATOR_ROLES },
  { label: "Hubs",                href: "/hubs",                   icon: Map,             allowedRoles: OPERATOR_ROLES },
  { label: "Intraday",            href: "/intraday",               icon: Activity,        allowedRoles: OPERATOR_ROLES },
  { label: "Investor",            href: "/investor",               icon: DollarSign,      allowedRoles: OPERATOR_ROLES },
  { label: "Platform Overview",   href: "/platform-overview",      icon: Globe,           allowedRoles: OPERATOR_ROLES },
];

/* Platform Admin */
const OPERATOR_ADMIN: NavItem[] = [
  { label: "Pricing Engine",      href: "/admin/pricing",          icon: Settings,        allowedRoles: OPERATOR_ROLES },
  { label: "Roles & Access",      href: "/admin/roles",            icon: BadgeCheck,      allowedRoles: OPERATOR_ROLES },
  { label: "Policy Engine",       href: "/admin/policy",           icon: BookOpen,        allowedRoles: OPERATOR_ROLES },
  { label: "Labs",                href: "/labs",                   icon: FlaskConical,    allowedRoles: OPERATOR_ROLES },
];

/* ── Offtaker-visible nav items (institutional buyers) ── */
const OFFTAKER_NAV: NavItem[] = [
  { label: "Select Org",          href: "/offtaker/org/select",             icon: Building2,      allowedRoles: OFFTAKER_ROLES },
  { label: "Onboarding",          href: "/offtaker/onboarding/intake",      icon: ClipboardList,  allowedRoles: OFFTAKER_ROLES },
  { label: "KYB Console",         href: "/offtaker/onboarding/kyb",         icon: ShieldCheck,    allowedRoles: OFFTAKER_ROLES },
  { label: "Marketplace",         href: "/offtaker/marketplace",            icon: Package,        allowedRoles: OFFTAKER_ROLES },
  { label: "Orders",              href: "/offtaker/orders",                 icon: Truck,          allowedRoles: OFFTAKER_ROLES },
];

/* ── Producer-visible nav items (refineries / mines) ── */
const PRODUCER_NAV: NavItem[] = [
  { label: "Accreditation",       href: "/producer/accreditation",          icon: Shield,         allowedRoles: PRODUCER_ROLES },
  { label: "Asset Ingestion",     href: "/producer/inventory/new",          icon: Upload,         allowedRoles: PRODUCER_ROLES },
  { label: "Allocation Queue",    href: "/producer/orders",                 icon: Fingerprint,    allowedRoles: PRODUCER_ROLES },
  { label: "Escrow Releases",     href: "/producer/settlements",            icon: Banknote,       allowedRoles: PRODUCER_ROLES },
];

/* ================================================================
   Shared nav renderer — used by both Sidebar and MobileDrawer
   ================================================================ */

function NavLink({
  item,
  href,
  collapsed,
  pathname,
  onLinkClick,
}: {
  item: NavItem;
  href: string;
  collapsed: boolean;
  pathname: string;
  onLinkClick?: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <li>
      <Link
        href={href}
        onClick={onLinkClick}
        className={cn(
          "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-normal tracking-wide transition-colors duration-100",
          isActive
            ? "bg-slate-800 text-white font-medium"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
          collapsed && "justify-center px-0"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-white" : "text-slate-500"
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <li className="my-2 border-t border-slate-800" />;
  return (
    <li className="pt-4 pb-1 px-2.5">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
        {label}
      </p>
    </li>
  );
}

/* ── Impersonation mode type ── */
type ImpersonationMode = "none" | "offtaker" | "producer";

function SidebarNav({
  collapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "offtaker";
  const isOperator = OPERATOR_ROLES.includes(role);
  const isOfftaker = OFFTAKER_ROLES.includes(role);
  const isProducer = PRODUCER_ROLES.includes(role);

  /* ── Pro Toggle State (offtaker roles only) ── */
  const [proMode, setProMode] = useState(() => {
    if (!isOfftaker) return false;
    try {
      return localStorage.getItem(PRO_TOGGLE_KEY) === "true";
    } catch {
      return false; // SSR or localStorage unavailable
    }
  });

  const handleTogglePro = useCallback(() => {
    setProMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRO_TOGGLE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  /* ── Admin Portal Impersonation Toggle ── */
  const [impersonationMode, setImpersonationMode] = useState<ImpersonationMode>("none");

  /* ── Helper: render a portal nav list with optional section header ── */
  const renderPortalNav = (items: NavItem[], sectionLabel: string) => (
    <>
      {!collapsed && (
        <div className="mb-2 flex items-center gap-2 px-2.5">
          <Users className="h-3 w-3 text-gold" />
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-gold/60">
            {sectionLabel}
          </p>
        </div>
      )}
      <ul className="space-y-0.5 flex-1">
        {items.map((item) => (
          <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
        ))}
      </ul>
    </>
  );

  /* ── Return-to-Admin banner ── */
  const renderReturnBanner = () => (
    <>
      {!collapsed ? (
        <button
          type="button"
          onClick={() => setImpersonationMode("none")}
          className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300 hover:bg-blue-950/40 transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Return to Admin Command
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setImpersonationMode("none")}
          className="mb-3 flex items-center justify-center rounded-lg border border-blue-500/30 bg-blue-950/20 p-2 text-blue-300 hover:bg-blue-950/40 transition-all"
          title="Return to Admin Command"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
    </>
  );

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col" aria-label="Main navigation">
      {isOperator && impersonationMode === "offtaker" ? (
        /* ══════ ADMIN → OFFTAKER IMPERSONATION ══════ */
        <>
          {renderReturnBanner()}
          {renderPortalNav(OFFTAKER_NAV, "Offtaker Portal")}
        </>
      ) : isOperator && impersonationMode === "producer" ? (
        /* ══════ ADMIN → PRODUCER IMPERSONATION ══════ */
        <>
          {renderReturnBanner()}
          {renderPortalNav(PRODUCER_NAV, "Producer Portal")}
        </>
      ) : isOperator ? (
        /* ══════ ADMIN MODE ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            <SectionHeader label="Operations" collapsed={collapsed} />
            {OPERATOR_OPS.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}

            <SectionHeader label="Risk & Compliance" collapsed={collapsed} />
            {OPERATOR_RISK.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}

            <SectionHeader label="Market Infrastructure" collapsed={collapsed} />
            {OPERATOR_MARKET.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}

            <SectionHeader label="Platform Admin" collapsed={collapsed} />
            {OPERATOR_ADMIN.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}
          </ul>

          {/* ── Portal Impersonation Toggles ── */}
          <div className="mt-4 space-y-2">
            {!collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setImpersonationMode("offtaker")}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gold hover:bg-gold/10 transition-all"
                >
                  <Eye className="h-4 w-4 text-gold shrink-0" />
                  <span>View Offtaker Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImpersonationMode("producer")}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <Eye className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>View Producer Portal</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setImpersonationMode("offtaker")}
                  className="flex items-center justify-center rounded-lg border border-gold/30 bg-gold/5 p-2 text-gold hover:bg-gold/10 transition-all"
                  title="View Offtaker Portal"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImpersonationMode("producer")}
                  className="flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="View Producer Portal"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </>
      ) : isProducer ? (
        /* ══════ PRODUCER CLIENT MODE ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            {PRODUCER_NAV.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}
          </ul>
        </>
      ) : (
        /* ══════ OFFTAKER CLIENT MODE (default) ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            {OFFTAKER_NAV.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}
          </ul>
        </>
      )}

      {/* ══════ Pro Execution Desk Toggle (Offtaker roles only) ══════ */}
      {isOfftaker && !collapsed && (
        <div className="mt-6 mx-1">
          <button
            id="pro-execution-desk-toggle"
            type="button"
            onClick={handleTogglePro}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200",
              proMode
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                : "border-slate-700/50 bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-400"
            )}
            aria-pressed={proMode}
            title={proMode ? "Switch to Retail Dashboard" : "Switch to Pro Execution Desk"}
          >
            {proMode ? (
              <ToggleRight className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-slate-600 shrink-0" />
            )}
            <span>Pro Execution Desk</span>
          </button>
        </div>
      )}
    </nav>
  );
}

/* ================================================================
   Desktop Sidebar
   ================================================================ */

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden md:flex h-screen shrink-0 flex-col border-r border-border bg-surface-1 transition-all duration-200",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* Brand — rigid h-20 to match topbar */}
      <div className="flex h-20 shrink-0 items-center justify-center border-b border-border px-4">
        {collapsed ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gold-muted text-bg text-sm font-bold">
            Au
          </span>
        ) : (
          <AppLogo className="h-10 w-auto" variant="dark" />
        )}
      </div>

      <SidebarNav collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-(--radius-sm) py-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

/* ================================================================
   Mobile Drawer — slide-out panel for small viewports
   ================================================================ */

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-1 shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Brand + close — rigid h-20 to match topbar */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4">
          <AppLogo className="h-10 w-auto" variant="dark" />
          <button
            onClick={onClose}
            className="rounded-(--radius-sm) p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav collapsed={false} onLinkClick={handleLinkClick} />
      </aside>
    </>
  );
}
