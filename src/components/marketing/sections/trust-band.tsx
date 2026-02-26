"use client";

import { Shield, CheckCircle2, Award, Lock } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, label: "Secured by Tier 1 Insurers" },
  { icon: CheckCircle2, label: "SOC 2 Type II Certified" },
  { icon: Award, label: "LBMA Good Delivery Compliant" },
  { icon: Lock, label: "Bank-Grade Encryption" },
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
              className="flex items-center gap-2.5 opacity-40"
            >
              <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              <span className="text-xs font-medium tracking-wide text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
