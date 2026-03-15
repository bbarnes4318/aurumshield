"use client";

import { motion } from "framer-motion";

/* ── Step Data — scannable, jargon-free ── */
const STEPS = [
  {
    label: "Listed",
    description:
      "Your gold is verified against LBMA Good Delivery standards and recorded in the immutable audit ledger.",
  },
  {
    label: "Locked",
    description:
      "Price is locked to the live XAU/USD spot rate. No double-allocations, no slippage.",
  },
  {
    label: "Payment Confirmed",
    description:
      "Funds are received and confirmed via automated bank rail. Every transaction gets a unique idempotency key.",
  },
  {
    label: "Settled",
    description:
      "Title and payment transfer simultaneously. At no point is either party exposed to counterparty risk.",
  },
  {
    label: "Title Transferred",
    description:
      "A signed clearing certificate is issued. Settlement finality is independently verifiable on the sealed ledger.",
  },
] as const;

/* ── Motion variants ── */
const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" as const },
  }),
};

export function SettlementLifecycleSection() {
  return (
    <section
      id="settlement-lifecycle"
      className="mk-section border-t border-(--mk-border)"
    >
      <div className="mk-container">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionReveal}
          className="max-w-3xl mb-16 lg:mb-20"
        >
          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-px w-10"
              style={{ backgroundColor: "var(--mk-gold)" }}
            />
            <p className="mk-overline" style={{ color: "var(--mk-gold)" }}>
              How It Works
            </p>
          </div>
          <h2 className="mk-h2 mb-5">
            Five Steps to{" "}
            <span style={{ color: "var(--mk-gold)" }}>
              Absolute Finality.
            </span>
          </h2>
          <p className="mk-body max-w-2xl">
            Every transaction follows a strict, irreversible sequence — from
            asset verification to cleared title. No ambiguity, no
            intermediate exposure, no exceptions.
          </p>
        </motion.div>

        {/* ── Lifecycle Cards ── */}
        <div className="relative">
          {/* Gold connector line (desktop only) */}
          <div
            className="absolute left-0 right-0 hidden lg:block pointer-events-none"
            style={{
              top: "36px",
              height: "2px",
              background:
                "linear-gradient(90deg, var(--mk-gold) 0%, rgba(198,168,107,0.15) 100%)",
            }}
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={cardVariants}
                className="group relative rounded-xl p-6 transition-all duration-300 ease-out cursor-default"
                style={{
                  backgroundColor: "var(--mk-surface)",
                  border: "1px solid var(--mk-border)",
                }}
                whileHover={{
                  y: -6,
                  transition: { duration: 0.25, ease: "easeOut" },
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--mk-gold)";
                  el.style.boxShadow =
                    "0 8px 30px rgba(198, 168, 107, 0.08)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--mk-border)";
                  el.style.boxShadow = "none";
                }}
              >
                {/* Step number — large gold badge */}
                <div
                  className="relative z-10 mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-lg"
                  style={{
                    border: "1px solid var(--mk-gold)",
                    backgroundColor: "rgba(198, 168, 107, 0.06)",
                  }}
                >
                  <span
                    className="font-mono text-xl font-bold tabular-nums"
                    style={{ color: "var(--mk-gold)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Step label */}
                <h3 className="text-base font-bold uppercase tracking-wide text-white mb-3">
                  {step.label}
                </h3>

                {/* Step description */}
                <p className="text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>

                {/* Gold bottom accent bar on hover */}
                <div
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ backgroundColor: "var(--mk-gold)" }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
