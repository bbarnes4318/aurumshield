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
      className="relative w-full min-h-screen flex items-center"
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

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center py-12 lg:py-24 max-w-7xl mx-auto px-6">
        {/* ── Left Column ── */}
        <div className="flex flex-col justify-center space-y-6 lg:space-y-8 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-6 lg:mb-8 flex justify-center lg:justify-start"
          >
            <GoldwireBrandLogo />
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="font-heading text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight text-white leading-[1.1] drop-shadow-sm"
          >
            Bypass SWIFT. <br />
            <span className="text-gold">Settle Millions in Seconds.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-base md:text-lg text-gray-300 leading-relaxed"
          >
            The <strong>Goldwire protocol</strong> uses allocated physical gold
            as a high-velocity transport layer. Settle cross-border corporate
            transactions instantly, bypassing legacy banking friction and
            capturing wholesale liquidity.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-col gap-4 sm:flex-row justify-center lg:justify-start"
          >
            <a
              href="#pipeline"
              className="inline-flex items-center justify-center gap-2 bg-action-gold hover:bg-action-gold/90 text-slate-950 font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              Explore the Protocol
              <ArrowDown className="h-4 w-4" />
            </a>

            <a
              href="#card"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-gold/40 hover:border-gold text-gold font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              View Corporate Card
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
