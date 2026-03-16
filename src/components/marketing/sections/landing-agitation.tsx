"use client";

/* ================================================================
   COMPONENT 2 — THE AGITATION (v2 — Visual Overhaul)
   ================================================================
   3-column grid with dramatic icon boxes, animated counters,
   and visual richness. Each card has a subtle gradient accent.
   ================================================================ */

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FileX2, ScanSearch, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RiskColumn {
  icon: LucideIcon;
  title: string;
  stat: string;
  statLabel: string;
  description: string;
}

const RISKS: RiskColumn[] = [
  {
    icon: FileX2,
    title: "The Paper Illusion",
    stat: "85%",
    statLabel: "of ETF gold is unallocated",
    description:
      'Unallocated "gold accounts" and ETFs are just unsecured loans to a bank. If the bank fails, you lose your capital.',
  },
  {
    icon: ScanSearch,
    title: "The Threat of Fraud",
    stat: "$50B+",
    statLabel: "in counterfeit exposure annually",
    description:
      "The physical market is plagued by sophisticated counterfeiting and deep-bar adulteration (tungsten-filled bars).",
  },
  {
    icon: Network,
    title: "Opaque Supply Chains",
    stat: "4–7x",
    statLabel: "hidden markup layers",
    description:
      "Buying through retail dealers adds massive, hidden markups and exposes your identity to unnecessary third parties.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2 + i * 0.15,
      duration: 0.6,
      ease: "easeOut" as const,
    },
  }),
};

export function LandingAgitation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Background accent */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(209,106,93,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        {/* Overline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-5"
        >
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            The Problem
          </p>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight max-w-3xl leading-tight mb-4"
        >
          The Traditional Gold Market is Broken.{" "}
          <span className="text-[#C6A86B]">We Fixed It.</span>
        </motion.h2>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[15px] text-slate-400 leading-relaxed max-w-2xl mb-14"
        >
          Institutional buyers face three massive risks in the modern precious
          metals market:
        </motion.p>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {RISKS.map((risk, i) => (
            <motion.div
              key={risk.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="group relative rounded-xl border border-slate-800 bg-slate-900/50 p-7 md:p-8 transition-all duration-300 hover:border-[#C6A86B]/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              {/* Top accent gradient line */}
              <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full bg-linear-to-r from-transparent via-red-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Stat */}
              <div className="mb-6">
                <div className="font-mono text-3xl md:text-4xl font-bold text-white/90 tracking-tight">
                  {risk.stat}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  {risk.statLabel}
                </div>
              </div>

              {/* Icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 transition-colors duration-300 group-hover:border-red-500/30 group-hover:bg-red-950/20">
                <risk.icon
                  className="h-5 w-5 text-slate-500 transition-colors duration-300 group-hover:text-red-400"
                  strokeWidth={1.5}
                />
              </div>

              {/* Title */}
              <h3 className="mb-3 text-lg font-bold text-white tracking-tight">
                {risk.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-slate-400">
                {risk.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
