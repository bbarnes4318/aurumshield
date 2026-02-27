"use client";

import { motion } from "framer-motion";

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const METRICS = [
  {
    figure: "0.00%",
    label: "Bilateral Principal Risk",
    description:
      "Atomic DvP settlement eliminates bilateral principal exposure. No counterparty holds unrecovered notional value at any lifecycle stage.",
  },
  {
    figure: "100%",
    label: "Capital Indemnification",
    description:
      "Full collateral is locked in deterministic escrow before execution. Settlement proceeds only after capital adequacy is computationally verified.",
  },
  {
    figure: "<$250M",
    label: "Transaction Capacity",
    description:
      "Per-settlement capacity governed by deterministic Exposure Coverage Ratio limits, tier-1 indemnification, and continuous capital monitoring.",
  },
] as const;

export function RiskModelSection() {
  return (
    <section
      id="risk-model"
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
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold mb-4">{"// "}ACTUARIAL PROOF</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Principal Exposure: Structurally Neutralized
          </h2>
          <p className="text-base leading-relaxed text-gray-300">
            Counterparty exposure is structurally removed from the settlement
            lifecycle. Each metric is derived from the deterministic constraints
            enforced by the clearing engine — not estimated from historical
            performance data.
          </p>
        </motion.div>

        {/* ── Three Metric Cards ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
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
              className="group rounded-md border border-slate-800 bg-white/[0.02] p-8 transition-all duration-300 hover:border-gold/30"
            >
              {/* Figure — monospace for precision */}
              <p
                className="mb-2 text-4xl font-bold tabular-nums text-white lg:text-5xl"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), ui-monospace, monospace",
                }}
              >
                {metric.figure}
              </p>

              {/* Label */}
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">
                {metric.label}
              </p>

              {/* Divider */}
              <div className="mb-4 h-px w-12 bg-white/[0.08] transition-all duration-300 group-hover:w-full group-hover:bg-gold/30" />

              {/* Description */}
              <p className="text-sm leading-relaxed text-gray-300">
                {metric.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
