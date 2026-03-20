"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building,
  Building2,
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
  Fingerprint,
  Upload,
  Banknote,
  Lock,
  Coins,
  ArrowRightLeft,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

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
  /** If true, this link points to the marketing domain and uses a regular <a> tag
   *  instead of Next.js <Link> to prevent RSC prefetch CORS errors. */
  external?: boolean;
}

/* ── Roles considered "internal operators" — can see all admin links ── */
/* Includes white-glove institutional buyers who share the Enterprise Command Center */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

/* ── Offtaker roles — standard self-serve retail buyers only ── */
const OFFTAKER_ROLES: UserRole[] = [
  "offtaker",
];

/* ── Producer roles — restricted to /producer portal ── */
const PRODUCER_ROLES: UserRole[] = [
  "producer",
  "REFINERY",
  "MINE",
];

/* ── Broker roles — restricted to /broker portal ── */
const BROKER_ROLES: UserRole[] = [
  "BROKER",
];

/* ── localStorage key for Pro Toggle persistence ── */
const PRO_TOGGLE_KEY = "aurumshield:pro-execution-desk";

/* ── Operator-only nav items — grouped by section ── */

/* Core Operations */
const OPERATOR_OPS: NavItem[] = [
  { label: "Command Center",      href: "/dashboard",              icon: LayoutDashboard, allowedRoles: OPERATOR_ROLES },
  // Goldwire uses a custom logo renderer — see GoldwireNavLink below
  { label: "Marketplace",          href: "/transactions",           icon: Coins,           allowedRoles: OPERATOR_ROLES },
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
  { label: "AML Training",        href: "/compliance/training",    icon: GraduationCap,   allowedRoles: OPERATOR_ROLES },
];

/* Market Infrastructure */
const OPERATOR_MARKET: NavItem[] = [
  { label: "Corridors",           href: "/corridors",              icon: Network,         allowedRoles: OPERATOR_ROLES },
  { label: "Hubs",                href: "/hubs",                   icon: Map,             allowedRoles: OPERATOR_ROLES },
  { label: "Intraday",            href: "/intraday",               icon: Activity,        allowedRoles: OPERATOR_ROLES },
  { label: "Investor Brief",     href: "/investor-brief",         icon: DollarSign,      allowedRoles: OPERATOR_ROLES, external: true },
  { label: "Platform Overview",   href: "/platform-overview",      icon: Globe,           allowedRoles: OPERATOR_ROLES, external: true },
];

/* Platform Admin */
const OPERATOR_ADMIN: NavItem[] = [
  { label: "Pricing Engine",      href: "/admin/pricing",          icon: Settings,        allowedRoles: OPERATOR_ROLES },
  { label: "Roles & Access",      href: "/admin/roles",            icon: BadgeCheck,      allowedRoles: OPERATOR_ROLES },
  { label: "Policy Engine",       href: "/admin/policy",           icon: BookOpen,        allowedRoles: OPERATOR_ROLES },
  { label: "Labs",                href: "/labs",                   icon: FlaskConical,    allowedRoles: OPERATOR_ROLES },
];

/* ── Offtaker nav items — split by compliance state ── */

/** State A: Shown when KYB is NOT complete */
const OFFTAKER_ONBOARDING_NAV: NavItem[] = [
  { label: "Select Org",          href: "/offtaker/org/select",             icon: Building2,      allowedRoles: OFFTAKER_ROLES },
  { label: "Onboarding",          href: "/offtaker/onboarding/intake",      icon: ClipboardList,  allowedRoles: OFFTAKER_ROLES },
  { label: "KYB Console",         href: "/offtaker/onboarding/kyb",         icon: ShieldCheck,    allowedRoles: OFFTAKER_ROLES },
];

/** State B: Shown when KYB is COMPLETED */
const OFFTAKER_CLEARED_NAV: NavItem[] = [
  { label: "Marketplace",         href: "/offtaker/marketplace",            icon: Coins,           allowedRoles: OFFTAKER_ROLES },
  { label: "Trade Blotter",       href: "/offtaker/orders",                 icon: ArrowRightLeft,  allowedRoles: OFFTAKER_ROLES },
  { label: "Audit Vault",         href: "/offtaker/ledger",                 icon: ShieldCheck,     allowedRoles: OFFTAKER_ROLES },
  { label: "Entity Management",   href: "/offtaker/settings",               icon: Building,        allowedRoles: OFFTAKER_ROLES },
];

/* ── Producer-visible nav items (refineries / mines) ── */
const PRODUCER_NAV: NavItem[] = [
  { label: "Accreditation",       href: "/producer/accreditation",          icon: Shield,         allowedRoles: PRODUCER_ROLES },
  { label: "Asset Ingestion",     href: "/producer/inventory/new",          icon: Upload,         allowedRoles: PRODUCER_ROLES },
  { label: "Allocation Queue",    href: "/producer/orders",                 icon: Fingerprint,    allowedRoles: PRODUCER_ROLES },
  { label: "Escrow Releases",     href: "/producer/settlements",            icon: Banknote,       allowedRoles: PRODUCER_ROLES },
];

/* ── Broker-visible nav items ── */
const BROKER_NAV: NavItem[] = [
  { label: "Command Center",      href: "/broker",                          icon: LayoutDashboard, allowedRoles: BROKER_ROLES },
  // Goldwire uses a custom logo renderer — see GoldwireNavLink below
  { label: "Deal Pipeline",       href: "/broker/pipeline",                 icon: ArrowRightLeft,  allowedRoles: BROKER_ROLES },
  { label: "LBMA Assets",         href: "/broker/assets",                   icon: Shield,          allowedRoles: BROKER_ROLES },
  { label: "Client Roster",       href: "/broker/clients",                  icon: Users,           allowedRoles: BROKER_ROLES },
];

/* ================================================================
   Shared nav renderer — used by both Sidebar and MobileDrawer
   ================================================================ */

/** Marketing domain base URL — external nav links point here instead of using Next.js <Link> */
const ROOT_URL = process.env.NEXT_PUBLIC_ROOT_URL || "https://aurumshield.vip";

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
    href === "/dashboard" || href === "/offtaker"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const classes = cn(
    "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-normal tracking-wide transition-colors duration-100",
    isActive
      ? "bg-slate-800 text-white font-medium"
      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
    collapsed && "justify-center px-0"
  );

  const content = (
    <>
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-white" : "text-slate-500"
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  // External links (marketing routes) use <a> to avoid Next.js RSC prefetch CORS errors
  if (item.external) {
    return (
      <li>
        <a
          href={`${ROOT_URL}${href}`}
          onClick={onLinkClick}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        onClick={onLinkClick}
        className={classes}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </Link>
    </li>
  );
}

/* ── Goldwire Logo Nav Link — renders icon + gold gradient text instead of a standard nav item ── */
function GoldwireNavLink({
  collapsed,
  pathname,
  onLinkClick,
}: {
  collapsed: boolean;
  pathname: string;
  onLinkClick?: () => void;
}) {
  const href = "/transactions/new";
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <li>
      <Link
        href={href}
        onClick={onLinkClick}
        className={cn(
          "flex items-center rounded px-2.5 py-1.5 transition-colors duration-100",
          isActive
            ? "bg-slate-800"
            : "hover:bg-slate-800/50",
          collapsed ? "justify-center px-0" : "gap-2"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Icon mark — always visible */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/goldwire-icon.svg"
          alt=""
          className="h-4 w-auto shrink-0"
          aria-hidden="true"
          style={{ filter: isActive ? "brightness(1.3)" : "brightness(0.85)" }}
        />
        {/* Text — only when expanded */}
        {!collapsed && (
          <span
            className={cn(
              "text-[13px] font-bold tracking-[0.15em] uppercase bg-linear-to-r from-[#F5EACF] via-[#D4AF37] to-[#BFA052] bg-clip-text text-transparent select-none",
              isActive ? "opacity-100" : "opacity-70"
            )}
          >
            GOLDWIRE
          </span>
        )}
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
type ImpersonationMode = "none" | "offtaker" | "producer" | "broker";

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
  const isBroker = BROKER_ROLES.includes(role);

  /* ── Compliance state for offtaker sidebar gating ── */
  const { data: onboardingState, isLoading: complianceLoading } = useOnboardingState(isOfftaker);
  const isCleared = !complianceLoading && onboardingState?.status === "COMPLETED";
  const offtakerNav = isCleared ? OFFTAKER_CLEARED_NAV : OFFTAKER_ONBOARDING_NAV;

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
  const router = useRouter();

  const handleImpersonate = useCallback((mode: ImpersonationMode) => {
    setImpersonationMode(mode);
    // Navigate to the portal's entry point
    if (mode === "offtaker") {
      router.push("/offtaker/org/select");
    } else if (mode === "producer") {
      router.push("/producer/accreditation");
    } else if (mode === "broker") {
      router.push("/broker");
    }
  }, [router]);

  /* ── Helper: render a portal nav list with optional section header ── */
  const renderPortalNav = (items: NavItem[], sectionLabel: string, includeGoldwire = false) => (
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
        {includeGoldwire ? (
          <>
            {/* Command Center first, then Goldwire logo, then rest */}
            <NavLink key={items[0].label} item={items[0]} href={items[0].href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            <GoldwireNavLink collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            {items.slice(1).map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}
          </>
        ) : (
          items.map((item) => (
            <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
          ))
        )}
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
          {renderPortalNav(OFFTAKER_CLEARED_NAV, "Offtaker Portal")}
        </>
      ) : isOperator && impersonationMode === "producer" ? (
        /* ══════ ADMIN → PRODUCER IMPERSONATION ══════ */
        <>
          {renderReturnBanner()}
          {renderPortalNav(PRODUCER_NAV, "Producer Portal")}
        </>
      ) : isOperator && impersonationMode === "broker" ? (
        /* ══════ ADMIN → BROKER IMPERSONATION ══════ */
        <>
          {renderReturnBanner()}
          {renderPortalNav(BROKER_NAV, "Broker Portal", true)}
        </>
      ) : isOperator ? (
        /* ══════ ADMIN MODE ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            <SectionHeader label="Operations" collapsed={collapsed} />
            {/* Goldwire logo link — inserted after Command Center */}
            <NavLink key="Command Center" item={OPERATOR_OPS[0]} href={OPERATOR_OPS[0].href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            <GoldwireNavLink collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            {OPERATOR_OPS.slice(1).map((item) => (
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
                  onClick={() => handleImpersonate("offtaker")}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gold hover:bg-gold/10 transition-all"
                >
                  <Eye className="h-4 w-4 text-gold shrink-0" />
                  <span>View Offtaker Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleImpersonate("producer")}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <Eye className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>View Producer Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleImpersonate("broker")}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 hover:bg-amber-500/10 transition-all"
                >
                  <Eye className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>View Broker Portal</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleImpersonate("offtaker")}
                  className="flex items-center justify-center rounded-lg border border-gold/30 bg-gold/5 p-2 text-gold hover:bg-gold/10 transition-all"
                  title="View Offtaker Portal"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleImpersonate("producer")}
                  className="flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="View Producer Portal"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleImpersonate("broker")}
                  className="flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-amber-400 hover:bg-amber-500/10 transition-all"
                  title="View Broker Portal"
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
      ) : isBroker ? (
        /* ══════ BROKER CLIENT MODE ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            {/* Goldwire logo link — inserted after Command Center */}
            <NavLink key="Command Center" item={BROKER_NAV[0]} href={BROKER_NAV[0].href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            <GoldwireNavLink collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            {BROKER_NAV.slice(1).map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}
          </ul>
        </>
      ) : (
        /* ══════ OFFTAKER CLIENT MODE (default) ══════ */
        <>
          <ul className="space-y-0.5 flex-1">
            {offtakerNav.map((item) => (
              <NavLink key={item.label} item={item} href={item.href} collapsed={collapsed} pathname={pathname} onLinkClick={onLinkClick} />
            ))}

            {/* ── Locked Marketplace indicator (State A only) ── */}
            {!isCleared && (
              <li>
                <button
                  type="button"
                  onClick={() => router.push("/offtaker/onboarding/kyb")}
                  className={cn(
                    "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-normal tracking-wide w-full text-left",
                    "text-slate-600 cursor-not-allowed opacity-50",
                    collapsed && "justify-center px-0"
                  )}
                  title="Complete KYB verification to unlock the Marketplace"
                >
                  <Lock className="h-4 w-4 shrink-0 text-slate-600" />
                  {!collapsed && <span className="truncate">Marketplace</span>}
                </button>
              </li>
            )}
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
        "hidden md:flex h-screen shrink-0 flex-col border-r border-border bg-slate-950 transition-all duration-200",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* Brand — rigid h-20 to match topbar */}
      <div className="flex h-20 shrink-0 items-center justify-center border-b border-slate-800 px-4 bg-slate-950">
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Brand + close — rigid h-20 to match topbar */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-4 bg-slate-950">
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
