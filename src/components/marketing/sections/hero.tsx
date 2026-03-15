"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { ClearingSeal } from "../ClearingSeal";
import { GoldwireBrandLogo } from "@/components/ui/goldwire-logo";

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

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start lg:items-center w-full pt-24 pb-16 lg:pt-32 lg:pb-24 max-w-7xl mx-auto px-6">
        {/* ── Left Column ── */}
        <div className="w-full flex flex-col justify-center space-y-5 lg:space-y-6 max-w-2xl text-left">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-1 flex justify-start"
          >
            <GoldwireBrandLogo className="scale-110 lg:scale-125 origin-left" />
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-3xl"
          >
            Institutional Gold Clearing,{" "}
            <span className="text-gold">Modernized.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl"
          >
            Execute instant, high-volume cross-border settlements backed by
            fully allocated, vaulted physical gold. We bypass legacy banking
            delays to deliver zero counterparty risk and absolute finality.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-col gap-4 sm:flex-row justify-start"
          >
            <a
              href="#pipeline"
              className="inline-flex items-center justify-center gap-2 bg-action-gold hover:bg-action-gold/90 text-slate-950 font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              See How It Works
              <ArrowDown className="h-4 w-4" />
            </a>

            <a
              href="/perimeter/register"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-gold/40 hover:border-gold text-gold font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              Request Institutional Access
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
