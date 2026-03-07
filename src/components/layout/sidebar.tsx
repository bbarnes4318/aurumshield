"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo } from "react";
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
  Settings,
  ShieldCheck,
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
}

/* ── Roles considered "internal operators" — can see all admin links ── */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
];

/* ── Roles considered "external clients" — restricted to buyer-visible links ── */
const CLIENT_ROLES: UserRole[] = [
  "buyer",
  "seller",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
  "BROKER_DEALER_API",
];


const NAV_ITEMS: NavItem[] = [
  /* ── Operator-only links ── */
  { label: "Command Center",      href: "/dashboard",              icon: LayoutDashboard, allowedRoles: OPERATOR_ROLES },
  { label: "Treasury Ops",        href: "/treasury",               icon: Building2,       allowedRoles: OPERATOR_ROLES },
  { label: "Execute Goldwire",    href: "/transactions/new",       icon: Send,            allowedRoles: OPERATOR_ROLES },
  { label: "Settlement Ledger",   href: "/transactions",           icon: ListTree,        allowedRoles: OPERATOR_ROLES },
  { label: "Sovereign Vault",     href: "/vault",                  icon: Shield,          allowedRoles: OPERATOR_ROLES },
  { label: "Compliance & Audit",  href: "/audit",                  icon: FileCheck,       allowedRoles: OPERATOR_ROLES },

  /* ── Client-visible links (buyer / seller / institution) ── */
  { label: "Treasury Desk",       href: "/transactions",           icon: Building2,       allowedRoles: CLIENT_ROLES },
  { label: "Compliance / KYB",    href: "/onboarding/compliance",  icon: ShieldCheck,     allowedRoles: CLIENT_ROLES },
  { label: "Settings",            href: "/account",                icon: Settings,        allowedRoles: CLIENT_ROLES },
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
  const role: UserRole = user?.role ?? "buyer";

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (!item.allowedRoles) return true;
        return item.allowedRoles.includes(role);
      }),
    [role],
  );

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main navigation">
      <ul className="space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <li key={item.href}>
              <Link
                href={item.href}
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
        })}
      </ul>
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
