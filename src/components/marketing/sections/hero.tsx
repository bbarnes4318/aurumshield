"use client";

import { motion } from "framer-motion";

/* ── Institutional easing — stable, high-end bezier ── */
const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.18, duration: 0.6, ease: EASE },
  }),
};

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative w-full flex flex-col items-center justify-center text-center min-h-[85vh]"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* ── Subtle radial ambient glow ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.04) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 max-w-5xl mx-auto pt-32 pb-20">
        {/* ── Pre-header ── */}
        <motion.span
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-8"
        >
          INSTITUTIONAL PRECIOUS METALS ARCHITECTURE
        </motion.span>

        {/* ── Main Header ── */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.05] max-w-4xl"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Absolute Sovereign Wealth Preservation.{" "}
          <span className="text-slate-400">Zero Counterparty Risk.</span>
        </motion.h1>

        {/* ── Subheader ── */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl"
          style={{ lineHeight: 1.6 }}
        >
          Deterministic settlement of LBMA-accredited 400-oz Good Delivery bars
          through bankruptcy-remote, allocated custody vaults. No rehypothecation.
          No fractional exposure. Absolute finality.
        </motion.p>

        {/* ── CTA ── */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-12 flex flex-col sm:flex-row gap-4 items-center"
        >
          <a
            href="#pipeline"
            className="inline-flex items-center justify-center gap-2.5 font-bold px-10 py-4 rounded-lg text-[#0A0A0A] transition-colors duration-200"
            style={{ backgroundColor: "#D4AF37" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#ca8a04")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#D4AF37")
            }
          >
            Explore the Protocol
          </a>
          <a
            href="#custody"
            className="inline-flex items-center justify-center gap-2 bg-transparent font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white"
          >
            View Custody Infrastructure
          </a>
        </motion.div>
      </div>
    </section>
  );
}
