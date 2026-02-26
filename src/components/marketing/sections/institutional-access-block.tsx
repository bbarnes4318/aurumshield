"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function InstitutionalAccessBlock() {
  return (
    <section
      id="institutional-access"
      className="mk-section border-t border-[var(--mk-border)]"
    >
      <div className="mk-container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* ── Left: Text ── */}
          <div>
            <p className="mk-overline mb-3">Documentation</p>
            <h2 className="mk-h2 mb-4">Full Platform Architecture</h2>
            <p className="mk-body max-w-xl">
              Review the complete clearing framework, capital controls,
              settlement lifecycle, and execution architecture. Both documents
              are designed for institutional due diligence.
            </p>
          </div>

          {/* ── Right: Two elevated card-buttons ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/platform-overview"
              className="mk-card flex flex-col justify-between space-y-4 no-underline"
            >
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-gold)]">
                  Overview
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">
                  Platform Overview
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Clearing model, custody architecture, and capital structure.
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--mk-gold)]">
                View Document →
              </span>
            </Link>

            <Link
              href="/technical-overview"
              className="mk-card flex flex-col justify-between space-y-4 no-underline"
            >
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-gold)]">
                  Technical
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">
                  Technical Overview
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  DvP execution, risk engine, settlement finality, and audit
                  ledger architecture.
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--mk-gold)]">
                View Document →
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
