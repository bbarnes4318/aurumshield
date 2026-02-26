"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

export function InstitutionalCloseSection() {
  return (
    <section
      id="institutional-close"
      className="mk-section border-t border-[var(--mk-border)]"
    >
      <div className="mk-container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="mx-auto max-w-[680px] text-center"
        >
          <h2 className="mb-6 font-serif text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em] text-white">
            Structural markets require
            <br />
            structural infrastructure.
          </h2>
          <p className="mx-auto mb-12 max-w-[520px] text-base leading-relaxed text-slate-300">
            AurumShield is purpose-built clearing infrastructure for
            institutional physical gold. If your organization requires
            deterministic settlement, capital transparency, and forensic
            auditability — apply for access.
          </p>
          <a href={`${APP_URL}/signup`} className="mk-btn-primary">
            Apply for Institutional Access
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */
export function SiteFooter() {
  return (
    <footer
      className="px-6 py-8 sm:px-12"
      style={{
        backgroundColor: "var(--mk-bg)",
        borderTop: "1px solid var(--mk-border)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3 text-sm text-[var(--mk-faint)]">
          <span className="font-serif text-sm font-bold text-white">
            AurumShield
          </span>
          <span className="h-3 w-px bg-[var(--mk-border)]" />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6 text-sm text-[var(--mk-faint)]">
          <Link
            href="/platform-overview"
            className="transition-colors hover:text-slate-300"
          >
            Platform Overview
          </Link>
          <Link
            href="/technical-overview"
            className="transition-colors hover:text-slate-300"
          >
            Technical Overview
          </Link>
        </div>
      </div>
    </footer>
  );
}
