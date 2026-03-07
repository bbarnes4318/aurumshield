"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full pt-28 pb-16 lg:pt-36 lg:pb-28 max-w-7xl mx-auto px-6">
        {/* ── Left Column ── */}
        <div className="w-full flex flex-col justify-center items-start max-w-2xl text-left">
          {/* ── Product Identity Block ── */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-8 lg:mb-10"
          >
            <GoldwireBrandLogo />
          </motion.div>

          {/* ── Headline ── */}
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="font-heading text-[44px] md:text-[52px] lg:text-[64px] xl:text-[72px] font-extrabold tracking-[-0.02em] max-w-3xl"
            style={{ lineHeight: 0.98 }}
          >
            <span className="text-white">
              Settle Millions Instantly
            </span>
            <br />
            <span style={{ color: "#C9A84C" }}>
              via Vaulted Gold.
            </span>
          </motion.h1>

          {/* ── Supporting Paragraph ── */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mt-7 lg:mt-8 text-lg md:text-xl lg:text-[22px] text-slate-400 leading-relaxed max-w-xl"
          >
            AurumShield is a Principal Market Maker for global treasuries.
            We convert high-notional fiat and digital assets into allocated
            physical bullion, executing cross-border title transfers instantly
            through a trustless, automated settlement engine.
          </motion.p>

          {/* ── CTAs ── */}
          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mt-10 lg:mt-12 flex flex-col gap-4 sm:flex-row items-start"
          >
            <a
              href="#pipeline"
              className="inline-flex items-center justify-center gap-2.5 font-bold px-10 py-4 rounded-lg text-slate-950 transition-all duration-200 hover:brightness-110"
              style={{ backgroundColor: "#C9A84C" }}
            >
              Explore the Protocol
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="#card"
              className="inline-flex items-center justify-center gap-2 bg-transparent font-semibold px-8 py-4 rounded-lg transition-all duration-200 hover:border-[#C9A84C]"
              style={{
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#C9A84C",
              }}
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
