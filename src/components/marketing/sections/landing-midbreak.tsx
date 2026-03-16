"use client";

/* ================================================================
   COMPONENT 6 — MID-PAGE BREAK BANNER (v2 — Visual Overhaul)
   ================================================================
   Full-width, edge-to-edge banner with dramatic visual treatment.
   Gold-to-dark gradient with animated particle dots, guilloche
   pattern overlay, and massive typography.
   ================================================================ */

import { motion, useInView } from "framer-motion";
import { ArrowRight, ArrowDown, Shield, Fingerprint } from "lucide-react";
import { useRef } from "react";
import { useKycModal } from "../KycModal";

/* ── Animated stat badges ── */
const STATS = [
  { value: "100%", label: "Insured" },
  { value: "$0", label: "Counterparty Risk" },
  { value: "LBMA", label: "Approved" },
] as const;

export function LandingMidBreak() {
  const { open } = useKycModal();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-24 md:py-32 lg:py-40"
      style={{
        background:
          "linear-gradient(135deg, #1a1505 0%, #2b1f08 25%, #c6a86b 50%, #2b1f08 75%, #1a1505 100%)",
      }}
    >
      {/* ── Background Layers ── */}
      {/* Guilloche pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="mk-guilloche"
              x="0"
              y="0"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 40 Q 20 0 40 40 T 80 40"
                fill="none"
                stroke="#000"
                strokeWidth="0.6"
              />
              <path
                d="M 0 40 Q 20 80 40 40 T 80 40"
                fill="none"
                stroke="#000"
                strokeWidth="0.6"
              />
              <circle
                cx="40"
                cy="40"
                r="15"
                fill="none"
                stroke="#000"
                strokeWidth="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mk-guilloche)" />
        </svg>
      </div>

      {/* Radial light center */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[1200px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Floating dot particles */}
      <div className="pointer-events-none absolute inset-0">
        {[
          { top: "15%", left: "8%", delay: 0, size: 3 },
          { top: "25%", left: "85%", delay: 0.5, size: 2 },
          { top: "70%", left: "12%", delay: 1, size: 2.5 },
          { top: "80%", left: "90%", delay: 1.5, size: 2 },
          { top: "45%", left: "5%", delay: 0.8, size: 3 },
          { top: "50%", left: "95%", delay: 1.2, size: 2.5 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 3,
              delay: dot.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Shield icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-sm"
        >
          <Fingerprint className="h-7 w-7 text-white/80" strokeWidth={1.5} />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white leading-[1.12] drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
        >
          Total Ownership. Market Anonymity.
          <br className="hidden sm:block" />
          <span className="text-[#0A1128]">
            Eliminates Traditional Counterparty Risk.
          </span>
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mx-auto mt-6 max-w-3xl text-base md:text-lg text-white/60 leading-relaxed"
        >
          AurumShield provides institutional buyers and corporate treasuries
          with direct, anonymous access to physical gold. From raw extraction to
          fully refined 400-ounce bars, your assets are legally yours, completely
          private, and 100% insured against fraud and transit loss.
        </motion.p>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 flex items-center justify-center gap-8 md:gap-14"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight drop-shadow-md">
                {stat.value}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={open}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A1128] px-8 py-4 text-base font-bold text-[#C6A86B] transition-all duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:bg-[#0d1833]"
          >
            <Shield className="h-4 w-4" />
            Access the Institutional Portal
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 bg-transparent px-8 py-4 text-base font-bold text-white transition-all hover:border-white/40 hover:bg-white/5"
          >
            Explore Our Supply Chain
            <ArrowDown className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
