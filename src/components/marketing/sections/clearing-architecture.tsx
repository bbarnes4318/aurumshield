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

const PILLARS = [
  {
    label: "Provenance",
    heading: "Cryptographic Asset Provenance",
    body: "Direct integration with LBMA-certified hubs ensures every ounce is cryptographically authenticated before entering the clearing ledger.",
  },
  {
    label: "Escrow",
    heading: "Atomic Escrow Engine",
    body: "Capital is mathematically confined and locked. Funds cannot be released until asset delivery is irrevocably confirmed.",
  },
  {
    label: "Audit",
    heading: "Real-Time Audit Telemetry",
    body: "Provide your compliance and treasury teams with instantaneous, immutable cryptographic receipts for every cleared transaction.",
  },
] as const;

export function ClearingArchitectureSection() {
  return (
    <section
      id="clearing-architecture"
      className="mk-section border-t border-[var(--mk-border)]"
    >
      <div className="mk-container">
        {/* ── Intro: visual left / text right (alternating) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="grid lg:grid-cols-2 gap-16 mb-16"
        >
          <div className="order-2 lg:order-1">
            <div
              className="p-6 space-y-3"
              style={{
                backgroundColor: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: "0.75rem",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-faint)]">
                Central Counterparty Model
              </p>
              <div className="space-y-2 pt-2">
                {["Buyer", "AurumShield CCP", "Seller"].map((node, i) => (
                  <div key={node}>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold font-mono tabular-nums"
                        style={{
                          border: "1px solid var(--mk-border)",
                          borderRadius: "0.375rem",
                          color:
                            i === 1
                              ? "var(--mk-gold)"
                              : "var(--mk-muted)",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            i === 1 ? "var(--mk-gold)" : "var(--mk-text)",
                        }}
                      >
                        {node}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className="ml-4 my-1 h-4 border-l border-dashed border-[var(--mk-border)]" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Bilateral trust replaced with engineered infrastructure
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 flex flex-col justify-center">
            <p className="mk-overline mb-3">Architecture</p>
            <h2 className="mk-h2 mb-4">Military-Grade Settlement Infrastructure.</h2>
            <p className="mk-body max-w-xl">
              AurumShield interposes as the central counterparty between buyers
              and sellers. Bilateral trust relationships are replaced with
              deterministic, capital-monitored infrastructure.
            </p>
          </div>
        </motion.div>

        {/* ── Pillar Cards: 3-column grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: i * 0.1, duration: 0.55 },
                },
              }}
              className="rounded-md border border-slate-800 bg-[#0B0E14] p-6 sm:p-8 transition-colors hover:border-[#D0A85C]/30 space-y-4"
            >
              <span className="block text-[10px] font-bold font-mono uppercase tracking-[0.14em] text-[#D0A85C]">
                {p.label}
              </span>
              <h3 className="text-[0.9375rem] font-semibold leading-snug text-white">
                {p.heading}
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Actuarial Trust Band ── */}
        <div className="mt-16 w-full bg-[#D0A85C]/5 border-y border-[#D0A85C]/20 py-4 flex items-center justify-center px-4">
          <p className="text-center font-mono text-xs sm:text-sm text-[#D0A85C] tracking-[0.2em] uppercase">
            [ VERIFIED ]: ALL ARCHITECTURAL STATE TRANSITIONS ARE BOUND BY COMPREHENSIVE UNDERWRITTEN INDEMNIFICATION.
          </p>
        </div>
      </div>
    </section>
  );
}
