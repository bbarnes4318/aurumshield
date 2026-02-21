"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Globe,
  Server,
  FlaskConical,
  ShieldAlert,
  Umbrella,
  ScrollText,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Store,
  Clock,
  ShoppingCart,
  Fingerprint,
  UserCircle,
  Shield,
  Landmark,
  ShieldCheck,
  Gavel,
  Activity,
  ShieldOff,
  DollarSign,
  Presentation,
  Briefcase,
  Package,
  X,
} from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useDemo } from "@/providers/demo-provider";
import type { UserRole } from "@/lib/mock-data";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  sellerOnly?: boolean;
  /** Fine-grained role gating — item visible only to these roles */
  roles?: UserRole[];
  /** Stable tour target attribute */
  dataTour?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Command",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, dataTour: "sidebar-dashboard" },
      { label: "Buyer Home", href: "/buyer", icon: Briefcase, roles: ["buyer", "admin"], dataTour: "sidebar-buyer-home" },
      { label: "Seller Home", href: "/seller", icon: Package, roles: ["seller", "admin"], dataTour: "sidebar-seller-home" },
    ],
  },
  {
    title: "Identity",
    items: [
      { label: "Verification", href: "/verification", icon: Fingerprint, dataTour: "sidebar-verification" },
      { label: "Account", href: "/account", icon: UserCircle, dataTour: "sidebar-account" },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: Store, dataTour: "sidebar-marketplace" },
      { label: "Reservations", href: "/reservations", icon: Clock, roles: ["admin", "compliance", "vault_ops"], dataTour: "sidebar-reservations" },
      { label: "Orders", href: "/orders", icon: ShoppingCart, roles: ["admin", "compliance", "vault_ops"], dataTour: "sidebar-orders" },
    ],
  },
  {
    title: "Clearing",
    items: [
      { label: "Settlements", href: "/settlements", icon: Landmark, dataTour: "sidebar-settlements" },
    ],
  },
  {
    title: "Capital",
    items: [
      { label: "Intraday", href: "/intraday", icon: Activity, roles: ["admin", "compliance", "treasury", "vault_ops"], dataTour: "sidebar-intraday" },
      { label: "Controls", href: "/capital-controls", icon: ShieldOff, roles: ["admin", "treasury", "compliance"], dataTour: "sidebar-controls" },
    ],
  },
  {
    title: "Supply",
    items: [
      { label: "Create Listing", href: "/sell", icon: ClipboardList, sellerOnly: true, dataTour: "sidebar-create-listing" },
      { label: "My Listings", href: "/sell/listings", icon: ScrollText, sellerOnly: true, dataTour: "sidebar-my-listings" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { label: "Counterparties", href: "/counterparties", icon: Building2 },
      { label: "Corridors", href: "/corridors", icon: Globe },
      { label: "Hubs", href: "/hubs", icon: Server },
      { label: "Labs", href: "/labs", icon: FlaskConical },
    ],
  },
  {
    title: "Risk & Compliance",
    items: [
      { label: "Claims", href: "/claims", icon: ShieldAlert },
      { label: "Reinsurance", href: "/reinsurance", icon: Umbrella },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit Console", href: "/audit", icon: ShieldCheck, roles: ["admin", "compliance", "treasury", "vault_ops"], dataTour: "sidebar-audit" },
      { label: "Supervisory Mode", href: "/supervisory", icon: Gavel, roles: ["admin", "compliance"], dataTour: "sidebar-supervisory" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText, adminOnly: true, dataTour: "sidebar-admin-audit" },
      { label: "Pricing", href: "/admin/pricing", icon: DollarSign, adminOnly: true, dataTour: "sidebar-admin-pricing" },
      { label: "Roles", href: "/admin/roles", icon: Users, adminOnly: true, dataTour: "sidebar-admin-roles" },
      { label: "Policies", href: "/admin/policies", icon: Shield, adminOnly: true, dataTour: "sidebar-admin-policies" },
    ],
  },
];

/* ================================================================
   Shared nav renderer — used by both Sidebar and MobileDrawer
   ================================================================ */

function SidebarNav({
  collapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const userRole = user?.role ?? "buyer";

  const demoGroup: NavGroup[] = isDemo
    ? [{ title: "Demo", items: [{ label: "Guided Walkthrough", href: "/demo", icon: Presentation }] }]
    : [];
  const allGroups = [...demoGroup, ...NAV_GROUPS];

  return (
    <nav className="flex-1 overflow-y-auto py-2 px-1.5" aria-label="Main navigation">
      {allGroups.map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (isDemo && item.dataTour) return true;
          if (item.roles && !item.roles.includes(userRole as UserRole)) return false;
          if (item.adminOnly && userRole !== "admin") return false;
          if (item.sellerOnly && userRole !== "seller" && userRole !== "admin") return false;
          return true;
        });
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.title} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-text-faint font-semibold select-none">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const linkHref = isDemo ? `${item.href}?demo=true` : item.href;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={linkHref}
                      data-tour={item.dataTour}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors duration-[120ms]",
                        isActive
                          ? "bg-active-bg text-active-text font-medium"
                          : "text-text-muted hover:bg-surface-2/60 hover:text-text",
                        collapsed && "justify-center px-0"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "opacity-90" : "opacity-70")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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
          className="flex w-full items-center justify-center rounded-[var(--radius-sm)] py-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
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
            className="rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
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
