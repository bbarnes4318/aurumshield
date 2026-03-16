"use client";

/* ================================================================
   COMPONENT 7 — THE IRONCLAD GUARANTEE (v2 — Premium)
   ================================================================
   Hover-to-reveal with dramatic background icon morph,
   golden accent lines, stat badges, and richer visuals.
   ================================================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Truck,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Guarantee {
  icon: LucideIcon;
  title: string;
  badge: string;
  stat: string;
  statLabel: string;
  description: string;
}

const GUARANTEES: Guarantee[] = [
  {
    icon: ShieldCheck,
    title: "Insured Against Fraud",
    badge: "ASSAY-VERIFIED",
    stat: "100%",
    statLabel: "covered against adulteration",
    description:
      "This is our ultimate guarantee. Every asset is subjected to rigorous ultrasonic and electrical conductivity assaying. We don't just test it—we financially insure your acquisition against fraud and adulteration. If a bar isn't pure, you are completely covered.",
  },
  {
    icon: Truck,
    title: "Armored Global Transit",
    badge: "BRINK'S · LOOMIS",
    stat: "24/7",
    statLabel: "armed escort logistics",
    description:
      "We integrate exclusively with elite, heavily armed logistics providers (such as Brink's and Loomis) for all cross-border and domestic transport.",
  },
  {
    icon: FileCheck,
    title: "Lloyd's of London Protection",
    badge: "SPECIE INSURANCE",
    stat: "AAA",
    statLabel: "rated coverage policy",
    description:
      'From the moment of extraction to its resting place in a secure commercial vault, your wealth is wrapped in a comprehensive "Specie Insurance" policy.',
  },
];

export function LandingGuarantee() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(63,174,122,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
        {/* Overline */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            The Guarantee
          </p>
        </div>

        {/* Headline */}
        <h2 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight max-w-3xl leading-tight mb-4">
          100% Insured.{" "}
          <span className="text-[#C6A86B]">From the Mine to the Vault.</span>
        </h2>

        {/* Intro */}
        <p className="text-[15px] text-slate-400 leading-relaxed max-w-2xl mb-14">
          Standard freight networks and basic insurance policies are inadequate
          for true wealth preservation. AurumShield operates with zero tolerance
          for loss.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {GUARANTEES.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="group relative rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden cursor-pointer transition-all duration-300 hover:border-emerald-500/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(activeIndex === i ? null : i)}
              role="button"
              tabIndex={0}
              aria-expanded={activeIndex === i}
            >
              {/* Top accent */}
              <div className="h-[3px] w-full bg-linear-to-r from-emerald-500/60 via-emerald-400/40 to-emerald-500/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Background icon reveal */}
              <AnimatePresence>
                {activeIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 0.03, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -right-8 -bottom-8 pointer-events-none"
                  >
                    <g.icon
                      className="h-48 w-48 text-emerald-400"
                      strokeWidth={0.4}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative z-10 p-7 md:p-8">
                {/* Stat */}
                <div className="mb-5">
                  <div className="font-mono text-3xl font-bold text-white/90 tracking-tight">
                    {g.stat}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    {g.statLabel}
                  </div>
                </div>

                {/* Icon Box */}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 transition-colors duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-950/20">
                  <g.icon
                    className="h-5 w-5 text-slate-500 transition-colors duration-300 group-hover:text-emerald-400"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-400/80">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {g.badge}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-3 text-lg font-bold text-white tracking-tight">
                  {g.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-400">
                  {g.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
