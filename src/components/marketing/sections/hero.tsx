"use client";

import { motion } from "framer-motion";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

const fade = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" as const },
  }),
};

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-[80vh] py-36"
      style={{ backgroundColor: "var(--mk-bg)" }}
    >
      <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* ── Left Column: Text ── */}
        <div>
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-6 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--mk-faint)]"
          >
            Institutional Clearing Infrastructure
          </motion.span>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-6 font-serif text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white"
          >
            Physical Gold.
            <br />
            Cleared Deterministically.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="mb-10 max-w-xl text-lg leading-relaxed text-slate-300"
          >
            Atomic Delivery-versus-Payment infrastructure for institutions that
            refuse bilateral principal risk.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fade}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <a href={`${APP_URL}/signup`} className="mk-btn-primary">
              Apply for Institutional Access
            </a>
            <a href="#clearing-architecture" className="mk-btn-secondary">
              Review Settlement Architecture
            </a>
          </motion.div>
        </div>

        {/* ── Right Column: Settlement Lifecycle Diagram ── */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fade}
          className="hidden lg:block"
        >
          <div
            className="p-8 space-y-0"
            style={{
              backgroundColor: "var(--mk-surface)",
              border: "1px solid var(--mk-border)",
              borderRadius: "0.75rem",
            }}
          >
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-faint)]">
              Settlement Lifecycle
            </p>
            {[
              {
                step: "01",
                label: "Asset Verified",
                detail: "LBMA Good Delivery verified, evidence packed",
              },
              {
                step: "02",
                label: "Price Locked",
                detail: "Spot rate captured, inventory concurrency guard",
              },
              {
                step: "03",
                label: "Payment Confirmed",
                detail: "Dual-rail settlement, SHA-256 idempotency key",
              },
              {
                step: "04",
                label: "Atomic DvP",
                detail: "Title and funds transfer simultaneously",
              },
              {
                step: "05",
                label: "Finality Issued",
                detail: "Clearing certificate signed, ledger sealed",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="flex items-start gap-4 py-4"
                style={{
                  borderBottom: i < 4 ? "1px solid var(--mk-border)" : "none",
                }}
              >
                <span className="flex-shrink-0 font-mono text-xs font-bold tabular-nums text-[var(--mk-gold)]">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
