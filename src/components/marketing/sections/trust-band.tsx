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
      className="w-full border-y border-white/[0.04] py-5"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2.5"
            >
              <Icon className="h-4 w-4 text-gold/70" strokeWidth={1.5} />
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
