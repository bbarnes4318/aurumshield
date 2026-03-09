"use client";

import {
  Shield,
  Lock,
  Wifi,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

/* ================================================================
   InstitutionalPortalWrapper
   ================================================================
   Full-bleed layout shell for the Institutional Gold Procurement
   Wizard. Deep navy #0a1128 background, top security nav bar,
   and flex container for main content + persistent sidebar.
   Desktop-optimised (1080p / 1440p).
   ================================================================ */

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SECURITY_PILLS = [
  { icon: Lock, label: "256-bit TLS Encrypted" },
  { icon: Shield, label: "LBMA Accredited" },
  { icon: Shield, label: "Lloyd's Specie Insured" },
  { icon: Wifi, label: "Live Spot Price Sync" },
] as const;

interface InstitutionalPortalWrapperProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function InstitutionalPortalWrapper({
  children,
  sidebar,
}: InstitutionalPortalWrapperProps) {
  const timer = useSessionTimer();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-navy-base">
      {/* ── Top Security Nav Bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#060d1b] px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-gold/10">
            <Shield className="h-4.5 w-4.5 text-gold" />
          </div>
          <div>
            <span className="font-heading text-sm font-bold tracking-tight text-white">
              AurumShield
            </span>
            <span className="ml-1.5 rounded bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-gold">
              Institutional
            </span>
          </div>
        </Link>

        {/* Security Pills */}
        <div className="flex items-center gap-3">
          {SECURITY_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-900/50 px-3 py-1"
            >
              <pill.icon className="h-3 w-3 text-emerald-400/80" />
              <span className="font-mono text-[10px] font-medium tracking-wider text-slate-400">
                {pill.label}
              </span>
            </div>
          ))}

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 px-3 py-1">
            <Clock className="h-3 w-3 text-gold" />
            <span className="font-mono text-[10px] font-semibold tabular-nums tracking-wider text-gold">
              {timer}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Primary content (stepper + active panel) */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>

        {/* Persistent security sidebar */}
        <aside className="w-[300px] shrink-0 border-l border-slate-800/60 bg-[#060d1b] overflow-y-auto">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
