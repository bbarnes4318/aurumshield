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
              Capital Efficiency &amp; Underwriteability
            </h2>
            <p className="mk-body max-w-xl">
              Structural clearing delivers measurable capital efficiencies.
              These are architectural consequences of deterministic settlement
              design, not projections.
            </p>
          </div>
          <div className="flex items-end">
            <div
              className="w-full p-6"
              style={{
                backgroundColor: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: "0.75rem",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-faint)] mb-4">
                Capital Allocation Impact
              </p>
              <div className="space-y-3">
                {[
                  { label: "Bilateral Model", pct: 100, color: "rgba(209, 106, 93, 0.5)" },
                  { label: "Centrally Cleared", pct: 35, color: "rgba(63, 174, 122, 0.5)" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{bar.label}</span>
                      <span className="text-xs font-mono tabular-nums text-[var(--mk-faint)]">
                        {bar.pct}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-sm"
                      style={{
                        width: `${bar.pct}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>
                ))}
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
