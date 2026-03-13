"use client";

/* ================================================================
   HERO — Tier-1 Institutional Landing
   ================================================================ */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ClearingSeal } from "../ClearingSeal";

const fade = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" as const },
  }),
};

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative w-full flex items-center"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Radial gold gradient */}
      <div
        className="pointer-events-none absolute left-[20%] top-[60%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start lg:items-center w-full pt-28 pb-16 lg:pt-36 lg:pb-28 max-w-7xl mx-auto px-6">
        {/* ── Left Column ── */}
        <div className="w-full flex flex-col justify-center space-y-5 lg:space-y-6 max-w-2xl text-left">
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight leading-[1.1]"
          >
            Secure High-Value Gold{" "}
            <span className="text-gold">Transactions.</span>
          </motion.h1>

          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl"
          >
            AurumShield helps qualified counterparties reduce fraud risk, protect
            physical bullion in transit, and execute eight-figure transactions
            with mathematical certainty.
          </motion.p>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-sm text-gray-500 leading-relaxed max-w-xl"
          >
            Deterministic settlement infrastructure for serious participants in
            the global gold market.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-col gap-4 sm:flex-row justify-start pt-2"
          >
            <a
              href="/buy/register"
              className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-hover text-slate-950 font-bold px-8 py-4 rounded-md transition-all duration-200"
            >
              Request Access
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="/perimeter/verify?demo=active"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-gold/40 hover:border-gold text-gold font-bold px-8 py-4 rounded-md transition-all duration-200"
            >
              Initiate Institutional Demo
            </a>
          </motion.div>
        </div>

        {/* ── Right Column — Clearing Seal ── */}
        <div className="hidden lg:block">
          <ClearingSeal />
        </div>
      </div>
    </section>
  );
}
