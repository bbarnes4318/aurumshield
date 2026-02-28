"use client";

/* ================================================================
   DEV LOGIN — Admin Development Bypass
   ================================================================
   Quick-switch between demo accounts during development.
   Route: /dev/login

   This page does NOT use the tour system or demo provider.
   It directly logs in via auth-store → auth-provider and
   redirects to the appropriate dashboard.

   WARNING: This page is for development only. It must be removed
   or access-restricted before production deployment.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogIn, User, Building2, Gavel, ShieldCheck, Coins } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { ensureDemoAccounts, DEMO_ACCOUNTS } from "@/lib/demo-seeder";
import { findUserByEmail } from "@/lib/auth-store";

/* ── Role metadata ── */

const ROLE_CONFIG: Record<string, {
  icon: typeof Shield;
  label: string;
  description: string;
  color: string;
  redirectTo: string;
}> = {
  buyer: {
    icon: User,
    label: "Buyer",
    description: "Marketplace, orders, checkout, onboarding wizard",
    color: "text-blue-400",
    redirectTo: "/buyer",
  },
  seller: {
    icon: Building2,
    label: "Seller",
    description: "Listings, evidence, publish flow, seller dashboard",
    color: "text-emerald-400",
    redirectTo: "/seller",
  },
  admin: {
    icon: Gavel,
    label: "Admin / Clearing",
    description: "Settlements, DvP authorization, operations dashboard",
    color: "text-amber-400",
    redirectTo: "/dashboard",
  },
  compliance: {
    icon: ShieldCheck,
    label: "Compliance",
    description: "Verification cases, audit trail, supervisory console",
    color: "text-purple-400",
    redirectTo: "/supervisory",
  },
  treasury: {
    icon: Coins,
    label: "Treasury",
    description: "Capital adequacy, fund confirmations, intraday monitor",
    color: "text-cyan-400",
    redirectTo: "/intraday",
  },
};

/* ── Quick Nav Links (accessible after login) ── */

const DEV_QUICK_LINKS = [
  { label: "Buyer Dashboard", href: "/buyer" },
  { label: "Onboarding Wizard", href: "/onboarding" },
  { label: "Compliance Onboarding", href: "/onboarding/compliance" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Seller Dashboard", href: "/seller" },
  { label: "Admin Dashboard", href: "/dashboard" },
  { label: "Verification", href: "/verification" },
  { label: "Supervisory", href: "/supervisory" },
];

/* ── Page Component ── */

export default function DevLoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, logout } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<string | null>(null);

  function handleLogin(email: string, role: string) {
    setLoginError(null);
    setLoginLoading(role);

    try {
      // Ensure demo accounts exist
      ensureDemoAccounts();

      const found = findUserByEmail(email);
      if (!found) {
        setLoginError(`User not found: ${email}`);
        setLoginLoading(null);
        return;
      }

      const result = login(email);
      if (!result.success) {
        setLoginError(result.error ?? "Login failed");
        setLoginLoading(null);
        return;
      }

      // Redirect after a brief delay for state propagation
      const config = ROLE_CONFIG[role];
      setTimeout(() => {
        router.push(config?.redirectTo ?? "/buyer");
      }, 300);
    } catch (err) {
      setLoginError(String(err));
      setLoginLoading(null);
    }
  }

  function handleLogout() {
    logout();
    setLoginError(null);
    setLoginLoading(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="h-7 w-7 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              AurumShield — Dev Login
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Development bypass · Select a role to log in instantly
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-900/30 border border-red-700/30 px-3 py-1 text-[10px] font-medium text-red-400 uppercase tracking-wider">
            ⚠ Development Only — Not for Production
          </div>
        </div>

        {/* Current Session */}
        {isAuthenticated && user && (
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">
                  Logged in as: {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-[10px] font-medium text-gray-400 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="font-mono">{user.email}</span>
              <span>·</span>
              <span className="uppercase text-amber-400/70 font-semibold">{user.role}</span>
            </div>

            {/* Quick nav links */}
            <div className="pt-2 border-t border-gray-700/30">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Quick Navigate
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEV_QUICK_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => router.push(link.href)}
                    className="
                      rounded px-2.5 py-1 text-[10px] font-medium
                      bg-gray-800/50 text-gray-300 border border-gray-700/40
                      hover:bg-gray-700/50 hover:text-white
                      transition-colors
                    "
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {loginError && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-xs text-red-300">
            {loginError}
          </div>
        )}

        {/* Role Cards */}
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((account) => {
            const config = ROLE_CONFIG[account.role];
            if (!config) return null;
            const Icon = config.icon;
            const isActive = user?.email === account.email;
            const isLoading = loginLoading === account.role;

            return (
              <button
                key={account.id}
                onClick={() => handleLogin(account.email, account.role)}
                disabled={isLoading}
                className={`
                  flex w-full items-center gap-3 rounded-lg border p-3.5
                  text-left transition-all duration-150
                  ${
                    isActive
                      ? "border-amber-600/50 bg-amber-950/30"
                      : "border-gray-700/40 bg-gray-900/50 hover:border-gray-600/50 hover:bg-gray-800/50"
                  }
                  ${isLoading ? "opacity-60 pointer-events-none" : ""}
                `}
              >
                <div
                  className={`
                    flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                    ${isActive ? "bg-amber-900/40" : "bg-gray-800/60"}
                  `}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-200">
                      {config.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold text-amber-400 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {config.description}
                  </p>
                  <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                    {account.email}
                  </p>
                </div>
                <LogIn className={`h-4 w-4 shrink-0 ${isLoading ? "animate-spin text-amber-400" : "text-gray-600"}`} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800/50 pt-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.15em] text-gray-600">
            AurumShield Clearing · Dev Environment · v{process.env.npm_package_version ?? "0.1.0"}
          </p>
        </div>
      </div>
    </div>
  );
}
