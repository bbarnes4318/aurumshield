"use client";

import { motion } from "framer-motion";
import { ArrowRight, Fingerprint, Landmark, CreditCard } from "lucide-react";

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const INTEGRATIONS = [
  {
    icon: Fingerprint,
    name: "Vault Network Confinement",
    role: "Sovereign Custody",
    description:
      "Certified bullion is locked in secure, insured facilities. Never enters dangerous or volatile territories.",
  },
  {
    icon: Landmark,
    name: "Asset Provenance Layer",
    role: "Counterfeit Elimination",
    description:
      "Independent partners conduct physical assays before tokenization. Eliminates counterfeit gold risk.",
  },
  {
    icon: CreditCard,
    name: "Loss Indemnification",
    role: "Full Coverage",
    description:
      "Every ounce on AurumShield is fully insured and indemnified against theft, loss, and catastrophic fraud.",
  },
] as const;

export function ComplianceGate() {
  return (
    <section
      className="border-t border-white/[0.04] py-24 lg:py-32"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Physical Risk Elimination
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            The Sovereign Custody Layer: Physical Risk Elimination.
          </h2>
          <p className="text-base leading-relaxed text-slate-400">
            Managing physical gold logistics exposes entities to extortion,
            kidnapping, and fake gold. AurumShield confines certified bullion
            within sovereign-grade vaults, settling the ownership layer
            atomically to eliminate logistical danger.
          </p>
        </motion.div>

        {/* ── Integration Cards with Connectors ── */}
        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Connector arrows — visible on lg only */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            {/* Arrow 1→2 */}
            <div className="absolute left-[33.33%] top-1/2 -translate-x-1/2 -translate-y-1/2">
              <ArrowRight className="h-5 w-5 text-white/[0.12]" />
            </div>
            {/* Arrow 2→3 */}
            <div className="absolute left-[66.66%] top-1/2 -translate-x-1/2 -translate-y-1/2">
              <ArrowRight className="h-5 w-5 text-white/[0.12]" />
            </div>
          </div>

          {INTEGRATIONS.map((integration, i) => {
            const Icon = integration.icon;
            return (
              <motion.div
                key={integration.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: i * 0.12,
                      duration: 0.5,
                      ease: "easeOut",
                    },
                  },
                }}
                className="rounded-md border border-slate-800 bg-[#0B0E14] p-8 transition-all duration-300 hover:border-gold/30"
              >
                {/* Icon */}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-gold/20 bg-gold/10">
                  <Icon className="h-5 w-5 text-gold" />
                </div>

                {/* Name + Role */}
                <h3 className="mb-1 text-lg font-semibold text-white">
                  {integration.name}
                </h3>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gold">
                  {integration.role}
                </p>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-400">
                  {integration.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
