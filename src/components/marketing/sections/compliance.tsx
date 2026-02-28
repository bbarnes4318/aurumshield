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

const STANDARDS = [
  {
    framework: "LBMA",
    scope: "Good Delivery Standards",
    status: "Verified",
    implementation:
      "Refiner verification against 34+ accredited LBMA Good Delivery refiners with fuzzy name matching. Three mandatory evidence types required per listing.",
  },
  {
    framework: "OECD",
    scope: "Responsible Sourcing",
    status: "Compliant",
    implementation:
      "Chain of custody documentation required per listing. Source-of-funds analysis during KYB onboarding. Provenance verified via structured document extraction.",
  },
  {
    framework: "KYC / KYB",
    scope: "Identity Perimeter",
    status: "Verified",
    implementation:
      "Persona-powered government ID verification with biometric liveness detection. OpenSanctions screening across OFAC, EU, UN, UK HMT, and DFAT lists. UBO declaration for entities.",
  },
  {
    framework: "Audit",
    scope: "Immutable Record",
    status: "Compliant",
    implementation:
      "Append-only event stream with SHA-256 deterministic event IDs. Tamper-evident verification enabled. Structured JSON for SIEM ingestion. Policy snapshots frozen at execution.",
  },
] as const;

export function ComplianceSection() {
  return (
    <section
      id="compliance"
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
          <div className="order-2 lg:order-1 flex items-center">
            <div
              className="w-full p-6"
              style={{
                backgroundColor: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: "0.75rem",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mk-faint)] mb-4">
                Compliance Coverage
              </p>
              <div className="grid grid-cols-2 gap-3">
                {STANDARDS.map((s) => (
                  <div
                    key={s.framework}
                    className="flex items-center gap-2 py-2 px-3"
                    style={{
                      border: "1px solid var(--mk-border)",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-white">
                      {s.framework}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="mk-overline mb-3">Compliance</p>
            <h2 className="mk-h2 mb-4">
              Engineered for Institutional Compliance.
            </h2>
            <p className="mk-body max-w-xl">
              AurumShield maps to the most stringent regulatory and security
              frameworks in global finance, ensuring your treasury operations
              remain fully compliant.
            </p>
          </div>
        </motion.div>

        {/* ── Compliance Table — Card layout on mobile, grid on desktop ── */}
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid var(--mk-border)",
            borderRadius: "0.75rem",
          }}
        >
          {/* Desktop Grid Header — hidden on mobile */}
          <div
            className="hidden md:grid grid-cols-[120px_160px_90px_1fr] gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mk-faint)]"
            style={{
              backgroundColor: "#0F1623",
              borderBottom: "1px solid var(--mk-border)",
            }}
          >
            <span>Framework</span>
            <span>Scope</span>
            <span>Status</span>
            <span>Implementation</span>
          </div>

          {/* Desktop Grid Rows — hidden on mobile */}
          {STANDARDS.map((s, i) => (
            <motion.div
              key={s.framework}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-20px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { delay: i * 0.06, duration: 0.4 },
                },
              }}
              className="hidden md:grid grid-cols-[120px_160px_90px_1fr] gap-4 px-6 py-4"
              style={{
                backgroundColor: i % 2 === 0 ? "#0F1623" : "var(--mk-surface)",
                borderBottom:
                  i < STANDARDS.length - 1
                    ? "1px solid var(--mk-border)"
                    : "none",
              }}
            >
              <span className="text-sm font-semibold text-[var(--mk-gold)]">
                {s.framework}
              </span>
              <span className="text-sm font-medium text-white">
                {s.scope}
              </span>
              <span>
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                  {s.status}
                </span>
              </span>
              <span className="text-sm leading-relaxed text-slate-300">
                {s.implementation}
              </span>
            </motion.div>
          ))}

          {/* Mobile Card Layout — hidden on desktop */}
          <div className="md:hidden divide-y" style={{ borderColor: "var(--mk-border)" }}>
            {STANDARDS.map((s, i) => (
              <motion.div
                key={s.framework}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20px" }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { delay: i * 0.06, duration: 0.4 },
                  },
                }}
                className="px-5 py-5"
                style={{
                  backgroundColor: i % 2 === 0 ? "#0F1623" : "var(--mk-surface)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--mk-gold)]">{s.framework}</span>
                  <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                    {s.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-white mb-2">{s.scope}</p>
                <p className="text-sm leading-relaxed text-slate-300">{s.implementation}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
