"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    label: "Listed",
    description:
      "Asset verified against LBMA Good Delivery standards. Three evidence types packed and immutably recorded in the audit ledger.",
  },
  {
    label: "Locked",
    description:
      "Price locked via live XAU/USD spot rate. Inventory concurrency guard prevents double-allocation. Capital adequacy validated.",
  },
  {
    label: "Payment Confirmed",
    description:
      "Dual-rail settlement initiated. Moov or Modern Treasury selected deterministically. SHA-256 idempotency key generated per transaction.",
  },
  {
    label: "Settled",
    description:
      "Atomic DvP execution completes. Title and funds transfer simultaneously. No intermediate state where value is exposed.",
  },
  {
    label: "Title Transferred",
    description:
      "SHA-256 signed clearing certificate issued. Settlement finality independently verifiable. Append-only ledger sealed.",
  },
] as const;

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function SettlementLifecycleSection() {
  return (
    <section
      id="settlement-lifecycle"
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
            <p className="mk-overline mb-3">Settlement</p>
            <h2 className="mk-h2 mb-4">
              Deterministic Settlement Lifecycle
            </h2>
            <p className="mk-body max-w-xl">
              Every transaction traverses a strict, irreversible state machine.
              Each transition is role-gated, audited, and deterministic.
              Execution order cannot be circumvented.
            </p>
          </div>
          <div className="flex items-center">
            <div
              className="w-full p-6"
              style={{
                backgroundColor: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: "0.75rem",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-faint)] mb-4">
                State Machine Flow
              </p>
              <div className="flex items-center justify-between gap-1">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-1">
                    <div
                      className="flex h-8 items-center justify-center px-2 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        border: "1px solid var(--mk-border)",
                        borderRadius: "0.375rem",
                        color: i === 3 ? "var(--mk-gold)" : "var(--mk-muted)",
                        backgroundColor:
                          i === 3 ? "rgba(198, 168, 90, 0.08)" : "transparent",
                      }}
                    >
                      {s.label.length > 8 ? s.label.slice(0, 7) + "…" : s.label}
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="text-[var(--mk-faint)] text-xs">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Lifecycle Steps: 5-column ── */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="absolute left-0 right-0 top-[18px] hidden h-px bg-[var(--mk-border)] lg:block" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: i * 0.1, duration: 0.5 },
                  },
                }}
                className="relative"
              >
                <div className="relative z-10 mb-5 flex items-center gap-3 lg:flex-col lg:items-start lg:gap-0">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
                    style={{
                      border: "1px solid var(--mk-border)",
                      borderRadius: "0.375rem",
                      backgroundColor: "var(--mk-surface)",
                    }}
                  >
                    <span className="font-mono text-xs font-bold text-[var(--mk-gold)] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-0 text-sm font-bold uppercase tracking-wide text-white lg:mt-4">
                    {s.label}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
