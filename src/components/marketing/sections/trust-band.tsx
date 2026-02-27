"use client";

import { Shield, CheckCircle2, Award, Lock } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, label: "Tier-1 Actuarial Indemnification" },
  { icon: CheckCircle2, label: "SOC 2 Type II / ISO 27001" },
  { icon: Award, label: "LBMA Good Delivery Enforced" },
  { icon: Lock, label: "Cryptographic Escrow Confinement" },
] as const;

export function TrustBand() {
  return (
    <section
      className="w-full border-y border-slate-800 bg-[#0B0E14] py-4"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 px-6 border-r border-slate-800/50 last:border-r-0"
            >
              <Icon className="h-4 w-4 text-gold/70" strokeWidth={1.5} />
              <span className="font-mono text-[10px] lg:text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
