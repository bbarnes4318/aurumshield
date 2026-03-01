"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClearingSeal } from "../ClearingSeal";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

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
      className="relative w-full min-h-screen flex items-center bg-[url('/hero-bullion-bg.png')] bg-cover bg-center bg-no-repeat"
    >
      <div className="absolute inset-0 bg-slate-950/[0.94] z-0"></div>

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
            className="flex items-center gap-4 mb-6"
          >
            <div className="h-px w-8 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              INSTITUTIONAL CLEARING INFRASTRUCTURE
            </p>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight leading-[1.15]"
          >
            The <span className="text-gold">Zero-Risk Exchange</span> for
            Physical Gold.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="text-base md:text-lg text-gray-300 leading-relaxed"
          >
            Access vetted mine originators and institutional sellers. Execute
            physical bullion trades with 100% capital and asset
            coverage—guaranteeing your investment is secure from execution to
            sovereign vaulting.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-col gap-4 sm:flex-row justify-center lg:justify-start"
          >
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center gap-2 bg-action-gold hover:bg-action-gold/90 text-slate-950 font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              Request Institutional Access
              <ArrowRight className="h-4 w-4" />
            </a>

            <Link
              href="/technical-overview"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-gold/40 hover:border-gold text-gold font-bold px-8 py-4 rounded-lg transition-all duration-200"
            >
              Review Actuarial Model
            </Link>
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
