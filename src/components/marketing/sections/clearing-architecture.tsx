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
    label: "DvP",
    heading: "Atomic Delivery-versus-Payment",
    bullets: [
      "Title and payment transfer in a single deterministic operation",
      "No intermediate state where value is exposed",
      "Settlement finality is computational, not procedural",
    ],
  },
  {
    label: "Capital",
    heading: "Continuous Capital Monitoring",
    bullets: [
      "Real-time Exposure Coverage Ratio tracking",
      "Deterministic breach detection with escalating control modes",
      "Hardstop limits enforced before execution, not after",
    ],
  },
  {
    label: "Finality",
    heading: "Cryptographic Settlement Finality",
    bullets: [
      "SHA-256 signed clearing certificates per settlement",
      "Canonical payload serialization for independent verification",
      "Immutable append-only audit ledger",
    ],
  },
  {
    label: "Provenance",
    heading: "Vault & Asset Provenance Integrity",
    bullets: [
      "LBMA Good Delivery refiner verification",
      "Three mandatory evidence types per listing",
      "AWS Textract OCR with structured field extraction",
    ],
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
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold tabular-nums"
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
            <h2 className="mk-h2 mb-4">The Clearing Architecture</h2>
            <p className="mk-body max-w-xl">
              AurumShield interposes as the central counterparty between buyers
              and sellers. Bilateral trust relationships are replaced with
              deterministic, capital-monitored infrastructure.
            </p>
          </div>
        </motion.div>

        {/* ── Pillar Cards: 4-column grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className="mk-card space-y-4"
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-gold)]">
                {p.label}
              </span>
              <h3 className="text-[0.9375rem] font-semibold leading-snug text-white">
                {p.heading}
              </h3>
              <ul className="space-y-2.5">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-300"
                  >
                    <span className="mt-[7px] block h-px w-3 flex-shrink-0 bg-[var(--mk-gold)] opacity-50" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
