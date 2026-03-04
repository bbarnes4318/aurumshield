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
    name: "Biometric Identity Verification",
    role: "KYC / AML Perimeter",
    description:
      "Government ID verification with biometric liveness detection. Real-time sanctions screening across OFAC, EU, UN, UK HMT, and DFAT. UBO declaration enforced for all entities.",
  },
  {
    icon: Landmark,
    name: "Institutional Bank Authentication",
    role: "Source-of-Funds Validation",
    description:
      "Institutional-grade account verification and balance confirmation. Source-of-funds analysis mapped against declared counterparty profiles and jurisdictional risk tiers.",
  },
  {
    icon: CreditCard,
    name: "Dual-Rail Payment Orchestration",
    role: "Settlement Routing Engine",
    description:
      "Multi-rail payment routing with SHA-256 idempotency keys and deterministic confirmation gating. State advancement blocked until all settlement rails confirm finality.",
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
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px w-8 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">INFRASTRUCTURE READINESS</p>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Regulatory Conformity by Design
          </h2>
          <p className="text-base leading-relaxed text-gray-300">
            Every counterparty is verified, every bank account is
            authenticated, and every payment is routed through licensed,
            regulated infrastructure. Compliance is enforced architecturally
            — not applied retrospectively.
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
                className="rounded-md border border-slate-800 bg-white/[0.02] p-8 transition-all duration-300 hover:border-gold/30"
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
                <p className="text-sm leading-relaxed text-gray-300">
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
