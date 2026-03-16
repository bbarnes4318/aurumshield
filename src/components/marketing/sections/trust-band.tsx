"use client";

import { Lock, ShieldCheck, Scale, Eye } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "SOC 2 Type II", sub: "INFRASTRUCTURE" },
  { icon: ShieldCheck, label: "PCI DSS", sub: "COMPLIANT ROUTING" },
  { icon: Scale, label: "LBMA", sub: "GOOD DELIVERY FORMATS" },
  { icon: Eye, label: "FINCEN / BSA", sub: "COMPLIANT" },
] as const;

export function TrustBand() {
  return (
    <section className="w-full border-y border-slate-800/60 bg-[#060A14]">
      <div className="mx-auto max-w-7xl px-6 py-5 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-6">
          {BADGES.map((badge, i) => (
            <div key={i} className="flex items-center gap-3">
              <badge.icon
                className="h-5 w-5 text-gold shrink-0"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                {badge.label}{" "}
                <span className="text-slate-500">{badge.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
