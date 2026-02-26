"use client";

import { motion } from "framer-motion";

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" as const },
  },
};

const WEAKNESSES = [
  {
    heading: "Bilateral Principal Exposure",
    body: "Each counterparty bears the full notional value as principal risk. Default by either party exposes the other to complete loss — no systemic backstop exists.",
  },
  {
    heading: "Non-Atomic Settlement",
    body: "Payment and delivery occur as discrete events separated by time. This settlement gap creates temporal exposure where capital is committed but finality is not achieved.",
  },
  {
    heading: "Duplicated Capital Requirements",
    body: "Without centralized clearing, each bilateral relationship requires independent collateral. Capital requirements multiply across counterparties, reducing deployment efficiency.",
  },
  {
    heading: "Fragmented Execution Paths",
    body: "Trade execution flows through intermediary chains without standardized transparency. Provenance, pricing basis, and settlement timing remain opaque.",
  },
  {
    heading: "Manual Operational Surface",
    body: "Identity verification, document exchange, and settlement confirmation rely on manual processes. Each handoff introduces latency, error surface, and audit gaps.",
  },
] as const;

export function MarketWeaknessSection() {
  return (
    <section
      id="market-weakness"
      className="mk-section border-t border-[var(--mk-border)]"
    >
      <div className="mk-container">
        {/* ── Intro: 2-column grid ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="grid lg:grid-cols-2 gap-16 mb-16"
        >
          <div>
            <p className="mk-overline mb-3">Market Structure</p>
            <h2 className="mk-h2">
              The Physical Gold Market Operates Without Centralized Clearing
            </h2>
          </div>
          <div className="flex items-end">
            <p className="mk-body max-w-xl">
              Every bilateral transaction carries full principal risk. No
              institutional mechanism equivalent to what equities and derivatives
              markets have had for decades exists for physical gold settlement.
            </p>
          </div>
        </motion.div>

        {/* ── Weakness Cards: 2-column grid ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {WEAKNESSES.map((w, i) => (
            <motion.div
              key={w.heading}
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
                {w.heading}
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {w.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
