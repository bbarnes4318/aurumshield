"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
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
      {/* ── Radial gold gradient anchored behind CTA area ── */}
      <div
        className="pointer-events-none absolute left-[20%] top-[60%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start w-full pt-24 pb-16 lg:pt-32 lg:pb-24 max-w-7xl mx-auto px-6">
        {/* ── Left Column ── */}
        <div className="w-full flex flex-col justify-start space-y-5 lg:space-y-6 max-w-2xl text-left lg:pt-4">
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-3xl"
          >
            Acquire Physical Gold with <span className="text-gold">Absolute Certainty.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl"
          >
            AurumShield eliminates the blind risk of global gold acquisition.
            Your capital remains secured in escrow and is never released until
            the asset is physically delivered to a partner refinery, melted, and
            verified for absolute purity.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-wrap gap-3 sm:gap-4 justify-start pt-2"
          >
            <a
              href="/institutional/get-started/welcome"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-gold/50 bg-transparent px-5 py-2.5 text-sm font-semibold text-gold tracking-wide transition-all duration-200 hover:bg-gold/10 hover:border-gold"
            >
              Apply for Institutional Access
              <ArrowRight className="h-3.5 w-3.5" />
            </a>

            <a
              href="/demo/walkthrough"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-slate-600 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 tracking-wide transition-all duration-200 hover:border-slate-400 hover:text-white"
            >
              See Our Verification Process
              <ArrowDown className="h-3.5 w-3.5" />
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
