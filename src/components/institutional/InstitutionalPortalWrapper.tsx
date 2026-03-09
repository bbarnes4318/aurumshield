"use client";

import {
  Shield,
  Lock,
  Wifi,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";

/* ================================================================
   InstitutionalPortalWrapper — V2
   ================================================================
   Full-bleed, zero-scroll layout shell. 100vh viewport lock.
   Uses exact same AppLogo as the rest of the application.
   ================================================================ */

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SECURITY_PILLS = [
  { icon: Lock, label: "256-bit TLS" },
  { icon: Shield, label: "LBMA Accredited" },
  { icon: Shield, label: "Lloyd's Insured" },
  { icon: Wifi, label: "Live Spot Sync" },
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
      {/* ── Top Security Nav — identical logo placement ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#060d1b] px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo className="h-7 w-auto" variant="dark" priority />
          <span className="ml-1 rounded bg-gold/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-gold">
            Institutional
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {SECURITY_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-1 rounded-full border border-slate-700/40 bg-slate-900/50 px-2.5 py-0.5"
            >
              <pill.icon className="h-2.5 w-2.5 text-emerald-400/80" />
              <span className="font-mono text-[9px] tracking-wider text-slate-500">
                {pill.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5">
            <Clock className="h-2.5 w-2.5 text-gold" />
            <span className="font-mono text-[9px] font-semibold tabular-nums tracking-wider text-gold">
              {timer}
            </span>
          </div>
        </div>
      </header>

      {/* ── Content: main area + persistent sidebar. Zero-scroll. ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {children}
        </main>
        <aside className="w-[280px] shrink-0 border-l border-slate-800/60 bg-[#060d1b] overflow-hidden flex flex-col">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
