"use client";

/* ================================================================
   COMPONENT 1 — HERO SECTION (v2 — Premium Overhaul)
   ================================================================
   Full-viewport hero with:
   - Left: Staggered headline, sub-headline, badge strip, CTAs
   - Right: Dramatic ClearingSeal visual instrument
   - Background: Animated cryptographic grid + floating gold gradients
   ================================================================ */

import { motion } from "framer-motion";
import { ArrowRight, ArrowDown, Shield } from "lucide-react";
import { useKycModal } from "../KycModal";
import { ClearingSeal } from "../ClearingSeal";

/* ── Stagger animation ── */
const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2 + i * 0.15,
      duration: 0.7,
      ease: "easeOut" as const,
    },
  }),
};

/* ── Assay Status Badges ── */
const BADGES = [
  { label: "ASSAY STATUS", value: "VERIFIED" },
  { label: "PURITY", value: "99.98%" },
  { label: "ESCROW", value: "LOCKED" },
] as const;

export function LandingHero() {
  const { open } = useKycModal();

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex items-center overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* ── Animated Background Layers ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Cryptographic grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(198,168,107,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(198,168,107,0.6) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial gold glow behind left content */}
        <div
          className="absolute left-[10%] top-[40%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-hero-float-1"
          style={{
            background:
              "radial-gradient(circle, rgba(198,168,107,0.07) 0%, transparent 60%)",
          }}
        />
        {/* Smaller accent glow behind right ClearingSeal */}
        <div
          className="absolute right-[5%] top-[30%] h-[700px] w-[700px] rounded-full animate-hero-float-2"
          style={{
            background:
              "radial-gradient(circle, rgba(198,168,107,0.05) 0%, transparent 55%)",
          }}
        />
        {/* Bottom edge fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#0A1128] to-transparent" />
      </div>

      {/* ── Two-Column Content ── */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-6 pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* ── Left Column — Copy ── */}
          <div className="flex flex-col justify-center space-y-6">
            {/* Assay Status Badge Strip */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fade}
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm px-4 py-2 shadow-lg">
                <Shield
                  className="h-3.5 w-3.5 text-[#C6A86B]"
                  strokeWidth={2}
                />
                {BADGES.map((b, i) => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-slate-600 mx-0.5">|</span>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      {b.label}:
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-bold text-[#C6A86B]">
                      {b.value}
                    </span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fade}
              className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-white tracking-tight leading-[1.08]"
            >
              Don&apos;t Trust the Seller.
              <br />
              <span className="text-[#C6A86B]">Trust the Assay.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fade}
              className="max-w-lg text-[15px] sm:text-base text-slate-400 leading-relaxed"
            >
              AurumShield eliminates the blind risk of global gold acquisition.
              Your capital remains secured in escrow and is never released until
              the asset is physically delivered to a partner refinery, melted,
              and verified for absolute purity.
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fade}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <button
                onClick={open}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C6A86B] hover:bg-[#d9b96e] text-[#0A1128] font-bold px-7 py-3.5 text-sm transition-all duration-200 shadow-[0_8px_30px_rgba(198,168,107,0.25)] hover:shadow-[0_12px_40px_rgba(198,168,107,0.35)]"
              >
                Apply for Institutional Access
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 hover:border-[#C6A86B]/60 text-slate-300 hover:text-white font-semibold px-7 py-3.5 text-sm transition-all duration-200"
              >
                See Our Verification Process
                <ArrowDown className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Trust signal micro-strip */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fade}
              className="flex items-center gap-5 pt-4"
            >
              {[
                "Lloyd's Insured",
                "LBMA Standard",
                "Zero Counterparty Risk",
              ].map((label) => (
                <span
                  key={label}
                  className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600"
                >
                  {label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── Right Column — ClearingSeal Visual ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block"
          >
            <ClearingSeal />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
