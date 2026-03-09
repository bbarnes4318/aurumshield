"use client";

import { Scale, ShieldCheck, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ================================================================
   INSTITUTIONAL INFRASTRUCTURE GRID
   ================================================================
   Brutalist 3-column value grid outlining legal and operational
   architecture for institutional compliance teams.
   ================================================================ */

interface Pillar {
  icon: LucideIcon;
  title: string;
  emphasis: string[];
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Scale,
    title: "Bailment Jurisprudence",
    emphasis: ["UCC Article 7", "Absolute bankruptcy remoteness"],
    description:
      "All allocated metal is held under strict bailment law — not as a balance-sheet asset of the custodian. Your gold is legally segregated and cannot be claimed by any creditor, counterparty, or liquidator. Title remains yours unconditionally.",
  },
  {
    icon: ShieldCheck,
    title: "Unbroken Chain of Custody",
    emphasis: ["LBMA-accredited ecosystem", "Tarmac supervision"],
    description:
      "From refiner pour to vault allocation, every custody transfer is witnessed, documented, and cryptographically sealed. Armored logistics are provided exclusively by Brink's and Loomis with continuous tarmac supervision at every transit point.",
  },
  {
    icon: Activity,
    title: "Non-Destructive Assaying",
    emphasis: ["Ultrasonic testing", "Electrical conductivity scanning"],
    description:
      "Every bar undergoes non-destructive verification using industrial ultrasonic thickness gauging and four-point electrical conductivity measurement. No drilling. No acid. Full integrity preservation with Bureau Veritas certification.",
  },
] as const;

export function InstitutionalInfrastructureGrid() {
  return (
    <section id="procurement" className="py-24 lg:py-32" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <div className="mb-16 max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px w-8" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#D4AF37" }}>
              SOVEREIGN ARCHITECTURE
            </p>
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-white leading-tight"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            The Paradigm Shift from Paper{" "}
            <span className="text-slate-400">to Physical Allocation.</span>
          </h2>
        </div>

        {/* ── 3-Column Grid with dividing borders ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-800 rounded-md overflow-hidden">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group p-8 lg:p-10 transition-colors duration-300 hover:bg-[#111827]"
                style={{ backgroundColor: "#0A1128" }}
              >
                {/* Icon */}
                <div className="mb-8">
                  <Icon
                    className="h-7 w-7 text-slate-500 transition-colors duration-300 group-hover:text-[#D4AF37]"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Title */}
                <h3
                  className="text-lg font-bold text-white mb-4 tracking-tight"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {pillar.title}
                </h3>

                {/* Emphasis tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {pillar.emphasis.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded border border-slate-700 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-400" style={{ lineHeight: 1.6 }}>
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
