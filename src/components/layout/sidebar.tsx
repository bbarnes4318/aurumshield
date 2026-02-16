"use client";

import { cn } from "@/lib/utils";
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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { label: "Corridors", href: "/corridors", icon: Globe },
      { label: "Hubs", href: "/hubs", icon: Server },
    ],
  },
  {
    title: "Risk & Compliance",
    items: [
      { label: "Counterparties", href: "/counterparties", icon: Building2 },
      { label: "Claims", href: "/claims", icon: ShieldAlert },
      { label: "Reinsurance", href: "/reinsurance", icon: Umbrella },
    ],
  },
  {
    title: "Innovation",
    items: [
      { label: "Labs", href: "/labs", icon: FlaskConical },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Policy", href: "/admin/policy", icon: ScrollText },
      { label: "Roles", href: "/admin/roles", icon: Users },
      { label: "Audit Log", href: "/admin/audit", icon: ClipboardList },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  /** An item is "active" if the current path starts with its href (handles nested routes). */
  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      data-print-hide="true"
      aria-label="Main navigation"
      className={cn(
        "relative flex flex-col border-r border-border bg-surface-1 transition-[width] duration-200 ease-in-out print:hidden",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gold/10">
            <span className="text-sm font-bold text-gold" aria-hidden="true">G</span>
          </div>
          {!collapsed && (
            <span className="typo-label whitespace-nowrap text-gold">
              Gold Platform
            </span>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Primary">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="typo-label mb-2 px-4 text-text-faint" aria-hidden="true">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5 px-2" role="list">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-gold/10 text-gold font-medium"
                          : "text-text-muted hover:bg-surface-2 hover:text-text"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ⌘K hint */}
      {!collapsed && (
        <div className="border-t border-border px-4 py-2">
          <div className="flex items-center justify-between text-xs text-text-faint">
            <span>Command</span>
            <kbd className="rounded-[6px] border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-[var(--radius-sm)] p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}
