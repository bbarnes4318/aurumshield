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

const IMPLICATIONS = [
  {
    heading: "Compressed Counterparty Exposure",
    body: "Central clearing replaces bilateral trust relationships. Each participant faces AurumShield as the central counterparty — compressing credit exposure to a single, capital-monitored entity.",
  },
  {
    heading: "Computed Capital Predictability",
    body: "Continuous Exposure Coverage Ratio monitoring and deterministic breach thresholds allow capital allocation to be modeled with precision. Exposure is computed, not estimated.",
  },
  {
    heading: "Eliminated Settlement Uncertainty",
    body: "Atomic Delivery-versus-Payment eliminates the temporal gap between payment and delivery. Settlement either completes fully or does not execute — no partial states exist.",
  },
  {
    heading: "Underwriteable Execution Flow",
    body: "Every lifecycle stage has defined entry conditions, exit conditions, and failure states. The deterministic state machine produces auditable, reproducible execution paths suitable for actuarial modeling.",
  },
] as const;

export function CapitalEfficiencySection() {
  return (
    <section
      id="capital-efficiency"
      className="mk-section border-t border-[var(--mk-border)]"
    >
      <div className="mk-container">
        {/* ── Intro: text left / visual right ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="grid lg:grid-cols-2 gap-16 mb-16"
        >
          <div>
            <p className="mk-overline mb-3">Capital Structure</p>
            <h2 className="mk-h2 mb-4">
              Engineered for Absolute Finality.
            </h2>
            <p className="mk-body max-w-xl">
              Structural clearing delivers measurable capital efficiencies.
              These are architectural consequences of deterministic settlement
              design, not projections.
            </p>
          </div>
          <div className="flex items-end">
            <div className="w-full space-y-5">
              {/* 0.00% Stat Block */}
              <div className="border-l-2 border-amber-500 pl-5 py-2">
                <p className="text-3xl font-bold tabular-nums text-slate-100 sm:text-4xl">
                  0.00%
                </p>
                <p className="mt-1 text-base font-bold text-slate-100">
                  Fraud &amp; Default Exposure
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  Platform logic strictly prohibits non-delivery and
                  non-payment. If a counterparty fails to fulfill their exact
                  obligations, the atomic trade aborts before a single cent or
                  ounce moves.
                </p>
              </div>

              {/* 100% Stat Block */}
              <div className="border-l-2 border-amber-500 pl-5 py-2">
                <p className="text-3xl font-bold tabular-nums text-slate-100 sm:text-4xl">
                  100%
                </p>
                <p className="mt-1 text-base font-bold text-slate-100">
                  Capital Indemnification
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  Every active settlement is backed by our sovereign-grade
                  actuarial policy. Transit loss, vault theft, and platform
                  failure are fully underwritten.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Implication Cards: 2-column grid ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {IMPLICATIONS.map((item, i) => (
            <motion.div
              key={item.heading}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: i * 0.08, duration: 0.5 },
                },
              }}
              className="mk-card space-y-4"
            >
              <span className="block font-mono text-xs font-bold text-[var(--mk-gold)] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[0.9375rem] font-semibold text-white">
                {item.heading}
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
