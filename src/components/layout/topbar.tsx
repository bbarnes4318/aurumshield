"use client";

/* ================================================================
   TIER-1 INSTITUTIONAL TOPBAR
   ================================================================
   Ultra-minimal, mathematical, expensive.
   Left: AurumShield logo. Right: System status + user dropdown.
   ================================================================ */

import { cn } from "@/lib/utils";
import { LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useAuth } from "@/providers/auth-provider";

interface TopbarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ collapsed, onToggleSidebar, onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md px-6 sticky top-0 z-40">
      {/* ── LEFT: Logo + Breadcrumbs ── */}
      <div className="flex items-center gap-5">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="block md:hidden p-2 text-slate-500 hover:text-white transition-colors"
          aria-label="Open navigation menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:block p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            )}
          </svg>
        </button>

        {/* Logo */}
        <Image
          src="/arum-logo-gold.svg"
          alt="AurumShield"
          width={110}
          height={24}
          className="hidden sm:block opacity-80"
          priority
        />

        {/* Separator + Breadcrumbs */}
        <div className="hidden md:flex items-center gap-4">
          <div className="h-5 w-px bg-slate-800" />
          <Breadcrumbs />
        </div>
      </div>

      {/* ── RIGHT: System Status + Profile ── */}
      <div className="flex items-center gap-5">
        {/* System Status Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase">
            System: Secure
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-slate-800" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-900",
              dropdownOpen && "bg-slate-900"
            )}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            id="profile-trigger"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold font-mono">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="hidden lg:flex flex-col items-start">
              <span className="text-xs font-medium text-slate-200 leading-none">{user?.name ?? "—"}</span>
              <span className="text-[10px] text-slate-500 leading-none mt-0.5 font-mono uppercase tracking-wider">{user?.role ?? "—"}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-600" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border border-slate-800 bg-slate-950 shadow-2xl py-1"
              role="menu"
              aria-labelledby="profile-trigger"
            >
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-slate-800">
                <p className="text-sm font-medium text-white">{user?.name ?? "—"}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user?.email ?? "—"}</p>
              </div>

              {/* Logout */}
              <div className="pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
