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
    index: "01",
    tag: "NO BROKER RISK",
    figure: "0.00%",
    description:
      "We are pure clearing infrastructure, not a market maker. We facilitate direct execution with zero intermediary markup and zero broker risk.",
  },
  {
    index: "02",
    tag: "NO PAPER GOLD",
    figure: "100%",
    description:
      "No synthetic exposure. Every execution on our network settles in fully allocated, physically unencumbered gold that is immediately deliverable upon request.",
  },
  {
    index: "03",
    tag: "NO FRACTIONAL RESERVE",
    figure: "<$250M",
    description:
      "We mathematically enforce a strict 1:1 ratio. Zero fractional reserve practices. Zero rehypothecation. The gold you clear is cryptographically proven to exist.",
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
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px w-8 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">ACTUARIAL PROOF</p>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Engineered for Absolute Integrity.
          </h2>
          <p className="text-base leading-relaxed text-gray-200">
            Legacy clearing relies on intermediaries and synthetic IOUs.
            AurumShield&apos;s architecture enforces physical reality through code.
          </p>
        </motion.div>

        {/* ── Three Metric Cards ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((metric, i) => (
            <motion.div
              key={metric.tag}
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
              className="bg-slate-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl hover:bg-slate-900/60 transition-all"
            >
              {/* Index + Tag — subtle monospace identifier */}
              <span className="font-mono text-sm text-gold/70 mb-4 block tracking-wide">
                {metric.index} {"// "}{metric.tag}
              </span>

              {/* Figure — refined, not oversized */}
              <p className="mb-4 font-mono text-2xl font-bold tabular-nums text-white">
                {metric.figure}
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
