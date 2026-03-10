"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Gem } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GoldwireBrandLogo } from "@/components/ui/goldwire-logo";

/* ================================================================
   "OWN THE ASSET, NOT THE PROMISE"
   ================================================================
   Premium glassmorphism value-proposition section.
   3 aggressively-designed pillar cards with animated hover states.
   Goldwire logo + "100% Physical Gold" branding at top.
   ================================================================ */

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" as const },
  }),
};

/* ── Pillar data ── */
interface Pillar {
  icon: LucideIcon;
  index: string;
  title: string;
  emphasis: string;
  description: string;
  stat: string;
  statLabel: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    index: "01",
    title: "Bankruptcy-Remote Custody",
    emphasis: "Your Name. Your Bars. Your Vault.",
    description:
      "Every ounce is held under strict bailment law (UCC Article 7) in LBMA-accredited sovereign vaults. Your gold is legally segregated — invisible to creditors, insolvency proceedings, and counterparty balance sheets.",
    stat: "100%",
    statLabel: "Allocated & Segregated",
  },
  {
    icon: Shield,
    index: "02",
    title: "Unbroken Chain of Custody",
    emphasis: "From Refiner Pour to Your Vault Cell.",
    description:
      "Every custody transfer is witnessed by Brink's or Loomis armored carriers, photographed at tarmac, and cryptographically sealed into our append-only audit ledger. Zero gaps. Zero assumptions.",
    stat: "SHA-256",
    statLabel: "Tamper-Evident Audit",
  },
  {
    icon: Gem,
    index: "03",
    title: "Non-Destructive Assaying",
    emphasis: "Bureau Veritas Certified. Zero Doubt.",
    description:
      "Every bar undergoes ultrasonic thickness gauging and four-point conductivity scanning before allocation. Counterfeit risk is structurally eliminated at the physical layer.",
    stat: "999.9",
    statLabel: "Verified Fineness",
  },
];

export function InstitutionalInfrastructureGrid() {
  return (
    <section
      id="procurement"
      className="py-28 lg:py-40 relative overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        {/* ── Goldwire Logo + "100% Physical Gold" ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          variants={reveal}
          className="flex flex-col items-center text-center mb-6"
        >
          <GoldwireBrandLogo />
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px w-6 bg-gold/40" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-gold/70">
              100% Physical Gold
            </span>
            <div className="h-px w-6 bg-gold/40" />
          </div>
        </motion.div>

        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={1}
          variants={reveal}
          className="mb-16 lg:mb-20 text-center max-w-3xl mx-auto"
        >
          <h2
            className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-tight leading-[1.1]"
            style={{ fontFamily: "var(--font-inter), sans-serif", color: "#f1f5f9" }}
          >
            Own the Asset,{" "}
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#F5EACF] bg-clip-text text-transparent">
              Not the Promise.
            </span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl mx-auto"
            style={{ lineHeight: 1.75, color: "#94a3b8" }}
          >
            Paper gold gives you a claim. We give you the keys to a vault cell
            with your name on the door. Direct, allocated, serial-number-specific
            ownership of sovereign-grade bullion.
          </p>
        </motion.div>

        {/* ── 3 Premium Glassmorphism Pillar Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i + 2}
                variants={reveal}
                className="group relative rounded-2xl border border-white/[0.08] p-8 lg:p-10 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_60px_-15px_rgba(212,175,55,0.12)] cursor-default overflow-hidden"
                style={{
                  backgroundColor: "rgba(15,20,35,0.60)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                {/* Top accent line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Icon with glow ring */}
                  <div className="mb-8 relative inline-flex">
                    <div className="h-14 w-14 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center transition-all duration-500 group-hover:border-gold/30 group-hover:bg-gold/[0.06] group-hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.15)]">
                      <Icon
                        className="h-6 w-6 text-slate-500 transition-colors duration-500 group-hover:text-gold"
                        strokeWidth={1.5}
                      />
                    </div>
                    {/* Animated glow ring on hover */}
                    <div className="absolute inset-0 rounded-xl border-2 border-gold/0 transition-all duration-700 group-hover:border-gold/20 group-hover:scale-110 pointer-events-none" />
                  </div>

                  {/* Index */}
                  <span className="block font-mono text-[10px] font-bold text-gold/50 tracking-[0.2em] uppercase mb-3">
                    {pillar.index}
                  </span>

                  {/* Title */}
                  <h3
                    className="text-xl font-bold text-white mb-2 tracking-tight"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    {pillar.title}
                  </h3>

                  {/* Emphasis */}
                  <p className="text-sm font-semibold text-gold/80 mb-5">
                    {pillar.emphasis}
                  </p>

                  {/* Description */}
                  <p className="text-sm leading-relaxed text-slate-400 mb-8">
                    {pillar.description}
                  </p>

                  {/* Stat badge */}
                  <div className="pt-6 border-t border-white/[0.06]">
                    <span className="font-mono text-2xl font-bold text-white tracking-tight">
                      {pillar.stat}
                    </span>
                    <span className="block font-mono text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase mt-1">
                      {pillar.statLabel}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
