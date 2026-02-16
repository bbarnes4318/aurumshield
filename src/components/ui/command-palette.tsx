"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Building2,
  Globe,
  Server,
  FlaskConical,
  ShieldAlert,
  Umbrella,
  ScrollText,
  Users,
  ClipboardList,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string[];
}

const commandItems: CommandItem[] = [
  // Overview
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview", keywords: ["home", "overview", "metrics"] },

  // Operations
  { id: "transactions", label: "Transactions", href: "/transactions", icon: ArrowLeftRight, group: "Operations", keywords: ["payments", "wire", "swift", "settlement"] },
  { id: "transactions-new", label: "New Transaction", href: "/transactions/new", icon: Plus, group: "Operations", keywords: ["create", "wire", "payment"] },
  { id: "corridors", label: "Corridors", href: "/corridors", icon: Globe, group: "Operations", keywords: ["routes", "cross-border", "fx"] },
  { id: "hubs", label: "Hubs", href: "/hubs", icon: Server, group: "Operations", keywords: ["clearing", "custody", "settlement", "trading"] },

  // Risk & Compliance
  { id: "counterparties", label: "Counterparties", href: "/counterparties", icon: Building2, group: "Risk & Compliance", keywords: ["entities", "clients", "funds"] },
  { id: "claims", label: "Claims", href: "/claims", icon: ShieldAlert, group: "Risk & Compliance", keywords: ["disputes", "incidents", "events"] },
  { id: "reinsurance", label: "Reinsurance", href: "/reinsurance", icon: Umbrella, group: "Risk & Compliance", keywords: ["treaties", "cession", "retrocession"] },

  // Innovation
  { id: "labs", label: "Labs", href: "/labs", icon: FlaskConical, group: "Innovation", keywords: ["models", "research", "experiments", "simulations"] },

  // Administration
  { id: "admin-policy", label: "Policy Management", href: "/admin/policy", icon: ScrollText, group: "Administration", keywords: ["rules", "governance", "compliance"] },
  { id: "admin-roles", label: "Roles & Permissions", href: "/admin/roles", icon: Users, group: "Administration", keywords: ["rbac", "access", "users"] },
  { id: "admin-audit", label: "Audit Log", href: "/admin/audit", icon: ClipboardList, group: "Administration", keywords: ["history", "events", "trail"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command dialog */}
      <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-border bg-surface-1 shadow-md overflow-hidden">
        <Command
          className="flex flex-col"
          filter={(value, search, keywords) => {
            const combined = `${value} ${(keywords ?? []).join(" ")}`.toLowerCase();
            if (combined.includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-text-faint" />
            <Command.Input
              placeholder="Search pages, actions…"
              className="h-12 w-full bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
              autoFocus
            />
            <kbd className="hidden shrink-0 rounded-[6px] border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-faint sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-text-faint">
              No results found.
            </Command.Empty>

            {["Overview", "Operations", "Risk & Compliance", "Innovation", "Administration"].map(
              (group) => {
                const items = commandItems.filter((i) => i.group === group);
                if (items.length === 0) return null;
                return (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:typo-label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
                  >
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id}
                          value={item.label}
                          keywords={item.keywords}
                          onSelect={() => handleSelect(item.href)}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-text-muted",
                            "transition-colors data-[selected=true]:bg-surface-2 data-[selected=true]:text-text"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                );
              }
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
