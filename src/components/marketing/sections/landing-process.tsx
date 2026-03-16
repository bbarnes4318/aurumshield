"use client";

/* ================================================================
   COMPONENT 8 — HOW IT WORKS (v2 — Premium Stepper)
   ================================================================
   Scroll-activated glowing accent line with richer step cards,
   numbered circle nodes, and premium visual treatment. Mobile
   uses simplified animation to avoid Safari jank.
   ================================================================ */

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { UserCheck, LayoutDashboard, Truck, Vault } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: UserCheck,
    number: "01",
    title: "Automated Compliance Gateway",
    description:
      "Bypass the red tape. Execute your corporate onboarding entirely online through our proprietary KYB/KYC and AML detection engine. Your identity and corporate structure are verified digitally in minutes, ensuring total compliance while shielding your data from the public market.",
  },
  {
    icon: LayoutDashboard,
    number: "02",
    title: "Digital Asset Allocation",
    description:
      "Log into your secure portal to allocate capital. Select your exact physical format—from direct-sourced Doré bars to LBMA-approved 400-ounce Good Delivery bars—and lock in your pricing deterministically.",
  },
  {
    icon: Truck,
    number: "03",
    title: "Extraction & Armored Transit",
    description:
      "Once capital is cleared, assets are sourced, assayed for absolute purity, and moved immediately into our secure logistics routing via elite armored carriers (Brink's, Loomis).",
  },
  {
    icon: Vault,
    number: "04",
    title: "Fully Audited Custody",
    description:
      "Track your assets in real-time through the AurumShield dashboard. Your gold is vaulted under your direct legal title (bailment), continuously insured by Lloyd's of London, and verified by independent third-party auditors.",
  },
];

/* ── Individual Step Card ── */
function StepCard({ step }: { step: Step }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="relative pl-16 md:pl-20 pb-16 last:pb-0"
    >
      {/* Node dot on timeline */}
      <div className="absolute left-0 top-0 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2 border-[#C6A86B]/40 bg-[#0A1128] z-10 shadow-[0_0_16px_rgba(198,168,107,0.12)]">
        <step.icon
          className="h-4 w-4 md:h-5 md:w-5 text-[#C6A86B]"
          strokeWidth={1.5}
        />
      </div>

      {/* Step Number */}
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C6A86B] mb-2">
        Step {step.number}
      </p>

      {/* Title */}
      <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-3">
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-sm leading-relaxed text-slate-400 max-w-lg">
        {step.description}
      </p>
    </motion.div>
  );
}

export function LandingProcess() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.8", "end 0.6"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0d1628" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-[10%] top-1/3 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(198,168,107,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6" ref={containerRef}>
        {/* Overline */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            How It Works
          </p>
        </div>

        {/* Headline */}
        <h2 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight max-w-3xl leading-tight mb-4">
          The Deterministic Path to{" "}
          <span className="text-[#C6A86B]">Absolute Ownership</span>
        </h2>

        {/* Intro */}
        <p className="text-[15px] text-slate-400 leading-relaxed max-w-2xl mb-16">
          AurumShield replaces manual brokerage with a seamless, programmatic
          clearing infrastructure. Deploy capital efficiently through our fully
          digitized ecosystem.
        </p>

        {/* Timeline */}
        <div ref={timelineRef} className="relative max-w-2xl">
          {/* Vertical track */}
          <div className="absolute left-[19px] md:left-[23px] top-0 bottom-0 w-[2px] bg-slate-800" />

          {/* Desktop: scroll-linked fill */}
          <motion.div
            className="absolute left-[19px] md:left-[23px] top-0 w-[2px] bg-linear-to-b from-[#C6A86B] to-[#d3b77d] origin-top hidden md:block"
            style={{
              height: lineHeight,
              boxShadow: "0 0 12px rgba(198,168,107,0.5)",
            }}
          />
          {/* Mobile: simple animated fill */}
          <motion.div
            className="absolute left-[19px] top-0 w-[2px] bg-linear-to-b from-[#C6A86B] to-[#d3b77d] origin-top md:hidden"
            initial={{ height: "0%" }}
            animate={isInView ? { height: "100%" } : { height: "0%" }}
            transition={{ delay: 0.3, duration: 2, ease: "easeInOut" }}
            style={{
              boxShadow: "0 0 12px rgba(198,168,107,0.5)",
            }}
          />

          {/* Steps */}
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
