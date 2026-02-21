"use client";

import { cn } from "@/lib/utils";
import {
  Search,
  Bell,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCircle,
  Fingerprint,
  ChevronDown,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useAuth } from "@/providers/auth-provider";
// TODO: Uncomment when @clerk/nextjs is installed
// import { UserButton } from "@clerk/nextjs";

/** Check if Clerk is configured with real (non-placeholder) keys */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/* ---------- Status badge colors ---------- */
const VS_COLORS: Record<string, string> = {
  VERIFIED: "bg-success/10 text-success border-success/30",
  IN_PROGRESS: "bg-info/10 text-info border-info/30",
  NEEDS_REVIEW: "bg-warning/10 text-warning border-warning/30",
  NOT_STARTED: "bg-surface-3 text-text-faint border-border",
  REJECTED: "bg-danger/10 text-danger border-danger/30",
};

interface TopbarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ collapsed, onToggleSidebar, onOpenMobileMenu }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TODO: Restore when @clerk/nextjs is installed
  const isClerkUser = false; // CLERK_ENABLED && user?.id?.startsWith("user_");

  useEffect(() => { setMounted(true); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — visible below md */}
        <button
          onClick={onOpenMobileMenu}
          className="block md:hidden rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar collapse toggle — hidden below md */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:block rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* Profile — custom dropdown (Clerk UserButton disabled until @clerk/nextjs is installed) */}
        {/* TODO: Restore Clerk UserButton when installed
        {isClerkUser ? (
          <UserButton
            afterSignOutUrl="/login"
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
                userButtonPopoverCard: "bg-surface-1 border border-border shadow-md",
              },
            }}
          />
        ) : ( */}
        {(
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-surface-2",
              dropdownOpen && "bg-surface-2"
            )}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            id="profile-trigger"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 text-gold text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-medium text-text leading-none">{user?.name ?? "—"}</span>
              <span className="text-[10px] text-text-faint leading-none mt-0.5 uppercase tracking-wide">{user?.role ?? "—"}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-text-faint" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-64 rounded-[var(--radius)] border border-border bg-surface-1 shadow-md py-1"
              role="menu"
              aria-labelledby="profile-trigger"
            >
              {/* User info header */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-text">{user?.name ?? "—"}</p>
                <p className="text-xs text-text-faint font-mono mt-0.5">{user?.email ?? "—"}</p>
                <span className={cn(
                  "mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  VS_COLORS[user?.verificationStatus ?? "NOT_STARTED"]
                )}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {user?.verificationStatus?.replace(/_/g, " ") ?? "—"}
                </span>
              </div>

              {/* Menu items */}
              <button
                onClick={() => { setDropdownOpen(false); router.push("/account"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
                role="menuitem"
              >
                <UserCircle className="h-4 w-4" />
                Account
              </button>
              <button
                onClick={() => { setDropdownOpen(false); router.push("/verification"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
                role="menuitem"
              >
                <Fingerprint className="h-4 w-4" />
                Verification
              </button>
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  );
}
