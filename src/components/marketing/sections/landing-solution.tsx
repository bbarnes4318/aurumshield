"use client";

/* ================================================================
   COMPONENT 3 — THE SOLUTION (v2 — Premium Overhaul)
   ================================================================
   Center-aligned with glassmorphic closed-loop graphic.
   Scroll-triggered glowing line from Mine → Vault.
   Richer card treatment with gradient accents.
   ================================================================ */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { EyeOff, Pickaxe, Scale, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SolutionPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

const POINTS: SolutionPoint[] = [
  {
    icon: EyeOff,
    title: "Market Discretion",
    description:
      "Your trade privacy is a non-negotiable asset. While we maintain strict, bank-grade AML compliance, our platform is structured to ensure your identity, allocations, and trade volumes remain strictly confidential and completely shielded from public registries and OTC desks.",
  },
  {
    icon: Pickaxe,
    title: "Direct Miner Sourcing",
    description:
      "We bypass retail dealers and OTC brokers entirely, sourcing directly from verified, heavily vetted mining operations.",
  },
  {
    icon: Scale,
    title: "Absolute Legal Title",
    description:
      'Your gold is physically segregated. Through strict legal bailment, your assets are "bankruptcy remote"—meaning they can never be seized by a bank or vaulting provider.',
  },
];

/* ── Closed-Loop Nodes ── */
const NODES = [
  { label: "Mine", sub: "Extraction" },
  { label: "Assay", sub: "Verification" },
  { label: "Escrow", sub: "Settlement" },
  { label: "Vault", sub: "Custody" },
] as const;

export function LandingSolution() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0d1628" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(198,168,107,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 text-center">
        {/* Overline */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            The Solution
          </p>
          <div className="h-px w-10 bg-[#C6A86B]/50" />
        </div>

        {/* Headline */}
        <h2 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight mx-auto max-w-3xl leading-tight mb-4">
          Bypassing the Middlemen.{" "}
          <span className="text-[#C6A86B]">Eliminating the Risk.</span>
        </h2>

        {/* Intro */}
        <p className="text-[15px] text-slate-400 leading-relaxed mx-auto max-w-2xl mb-16">
          AurumShield replaces trust with deterministic proof and unshakeable
          financial guarantees. We orchestrate a closed-loop ecosystem that
          connects you directly to the source.
        </p>

        {/* ── Closed-Loop Graphic ── */}
        <div className="relative mx-auto mb-20 max-w-3xl">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm px-6 py-10 md:px-12 md:py-12 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            {/* Node Row */}
            <div className="relative flex items-center justify-between">
              {NODES.map((node, i) => (
                <motion.div
                  key={node.label}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={
                    isInView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.7 }
                  }
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full border-2 border-[#C6A86B]/40 bg-[#0A1128] shadow-[0_0_20px_rgba(198,168,107,0.1)]">
                    <span className="font-mono text-xs md:text-sm font-bold text-[#C6A86B] uppercase">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] md:text-xs font-bold uppercase tracking-[0.15em] text-white">
                    {node.label}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    {node.sub}
                  </span>
                </motion.div>
              ))}

              {/* Connecting Line */}
              <div className="absolute top-7 md:top-8 left-7 md:left-8 right-7 md:right-8 h-[2px] bg-slate-800">
                <motion.div
                  className="h-full bg-linear-to-r from-[#C6A86B] to-[#d3b77d] origin-left"
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
                  style={{
                    boxShadow: "0 0 16px rgba(198,168,107,0.5)",
                  }}
                />
              </div>
            </div>

            {/* Check badges under graphic */}
            <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
              {["No middlemen", "Full traceability", "Bankruptcy remote"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {badge}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Solution Points ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {POINTS.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative rounded-xl border border-slate-800 bg-slate-900/40 p-7 md:p-8 overflow-hidden transition-all duration-300 hover:border-[#C6A86B]/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-6 right-6 h-[2px] bg-linear-to-r from-transparent via-[#C6A86B]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 transition-colors group-hover:border-[#C6A86B]/30 group-hover:bg-[#C6A86B]/5">
                <point.icon
                  className="h-5 w-5 text-slate-500 transition-colors group-hover:text-[#C6A86B]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="mb-3 text-lg font-bold text-white tracking-tight">
                {point.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
