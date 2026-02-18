"use client";

/* ================================================================
   DEMO LOGIN — One-click role selection for demo accounts
   No password required in demo mode.
   ================================================================ */

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { DEMO_ACCOUNTS } from "@/lib/demo-seeder";
import { findUserByEmail } from "@/lib/auth-store";
import { ensureDemoAccounts } from "@/lib/demo-seeder";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  buyer: "Institutional acquisition desk. Views marketplace, reserves gold, places orders.",
  seller: "Supply-side custody operator. Creates listings, attaches evidence, publishes.",
  admin: "Clearing authority. Manages settlements, authorizes DvP, oversees operations.",
  compliance: "Regulatory oversight. Reviews verification cases, monitors audit trail.",
  treasury: "Capital management. Confirms funds, monitors intraday capital adequacy.",
};

const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  admin: "Clearing Authority",
  compliance: "Compliance Officer",
  treasury: "Treasury Operations",
};

export default function DemoLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  function handleSelectRole(email: string) {
    // Ensure demo accounts exist before login
    ensureDemoAccounts();

    const user = findUserByEmail(email);
    if (!user) {
      console.error("[DemoLogin] User not found:", email);
      return;
    }

    login(email);
    router.push("/dashboard?demo=true");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <Image
              src="/arum-logo-white.png"
              alt="AurumShield"
              width={200}
              height={46}
              className="h-8 w-auto"
              priority
            />
          </div>
          <h1 className="typo-h2 mb-2">Institutional Demonstration Mode</h1>
          <p className="text-sm text-text-muted">
            Select a role to enter the demonstration environment.
            <br />
            No credentials required.
          </p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelectRole(account.email)}
              id={`demo-login-${account.role}`}
              className="card-base flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-surface-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-xs font-bold text-gold uppercase tracking-wider">
                {account.role.slice(0, 2)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">
                    {ROLE_LABELS[account.role] ?? account.role}
                  </span>
                  <span className="typo-mono text-xs text-text-faint">
                    {account.email}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {ROLE_DESCRIPTIONS[account.role] ?? "Institutional access."}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-text-faint">
            Demonstration environment — Not for production use
          </p>
        </div>
      </div>
    </div>
  );
}
