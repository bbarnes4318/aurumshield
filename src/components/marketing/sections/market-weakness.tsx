"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck, Fingerprint } from "lucide-react";

/* ================================================================
   THE ANATOMY OF A FRAUD-PROOF TRADE — 3-Column Layout
   ================================================================
   Replaces the old "Market Weakness" 5-card grid.
   Two outer pillars (Capital Confinement / Asset Provenance) with
   a visually elevated center nexus (Atomic Settlement).
   ================================================================ */

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" as const },
  },
};

const PILLARS = [
  {
    icon: Lock,
    title: "Capital Confinement",
    subtitle: "Buyer Fraud Eliminated",
    body: "Funds are cryptographically verified and locked in secure escrow before a single ounce moves. Zero risk of non-payment, chargebacks, or phantom capital.",
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: "Atomic Settlement",
    subtitle: "The Nexus",
    body: "Ownership of the gold and release of the funds happen simultaneously—and only when all conditions are met. If either party fails, the trade aborts. If the system fails, our actuarially-backed policy fully indemnifies the loss.",
    highlight: true,
  },
  {
    icon: Fingerprint,
    title: "Asset Provenance",
    subtitle: "Seller Fraud Eliminated",
    body: "Physical bullion is authenticated at LBMA-aligned hubs and locked into our chain of custody. Zero risk of counterfeit assets or non-delivery.",
    highlight: false,
  },
] as const;

export function MarketWeaknessSection() {
  return (
    <section
      id="market-weakness"
      className="py-24 lg:py-32"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="mb-16 max-w-3xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
            Trade Architecture
          </p>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
            The Anatomy of a Fraud-Proof Trade
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
            Two structural pillars eliminate fraud on both sides of every
            transaction. At the center, atomic settlement binds them into a
            single indemnified event.
          </p>
        </motion.div>

        {/* ── 3-Column Grid ── */}
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: i * 0.12, duration: 0.6 },
                  },
                }}
                className={`relative rounded-md border p-8 transition-all duration-300 ${
                  pillar.highlight
                    ? "border-[#D0A85C]/30 bg-[#D0A85C]/[0.04]"
                    : "border-slate-800 bg-white/[0.02] hover:border-[#D0A85C]/30"
                }`}
              >
                {/* Icon */}
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-md border ${
                    pillar.highlight
                      ? "border-[#D0A85C]/30 bg-[#D0A85C]/10"
                      : "border-slate-800 bg-white/[0.03]"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      pillar.highlight ? "text-gold" : "text-gold"
                    }`}
                  />
                </div>

                {/* Subtitle tag */}
                <span
                  className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] ${
                    pillar.highlight ? "text-[#D0A85C]/70" : "text-gray-400"
                  }`}
                >
                  {pillar.subtitle}
                </span>

                {/* Title */}
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {pillar.title}
                </h3>

                {/* Body */}
                <div
                  className={
                    pillar.highlight ? "border-l-2 border-[#D0A85C] pl-4" : ""
                  }
                >
                  <p className="text-sm leading-relaxed text-gray-300">
                    {pillar.body}
                  </p>
                </div>

                {/* Highlight accent bar */}
                {pillar.highlight && (
                  <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-md bg-gradient-to-r from-transparent via-[#D0A85C]/50 to-transparent" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
