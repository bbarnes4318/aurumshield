"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ── */
interface StageControls {
  label: string;
  controls: string[];
}

type RiskLane = {
  name: string;
  stages: { stage: string; level: number }[];
};

/* ── Data ── */
const LIFECYCLE_STAGES = [
  "Listed",
  "Locked",
  "Payment Confirmed",
  "Settled",
  "Title Transferred",
] as const;

const RISK_LANES: RiskLane[] = [
  {
    name: "Principal Risk",
    stages: [
      { stage: "Listed", level: 85 },
      { stage: "Locked", level: 65 },
      { stage: "Payment Confirmed", level: 40 },
      { stage: "Settled", level: 10 },
      { stage: "Title Transferred", level: 0 },
    ],
  },
  {
    name: "Operational Risk",
    stages: [
      { stage: "Listed", level: 70 },
      { stage: "Locked", level: 55 },
      { stage: "Payment Confirmed", level: 35 },
      { stage: "Settled", level: 15 },
      { stage: "Title Transferred", level: 5 },
    ],
  },
  {
    name: "Compliance Risk",
    stages: [
      { stage: "Listed", level: 60 },
      { stage: "Locked", level: 40 },
      { stage: "Payment Confirmed", level: 25 },
      { stage: "Settled", level: 10 },
      { stage: "Title Transferred", level: 3 },
    ],
  },
];

const STAGE_CONTROLS: Record<string, StageControls> = {
  Listed: {
    label: "Listing Controls",
    controls: [
      "LBMA Good Delivery refiner verification against accredited list",
      "Three evidence types required: Assay, Chain of Custody, Attestation",
      "KYC/KYB trade gating — seller verification enforced before listing",
      "Immutable audit log entry generated on listing creation",
    ],
  },
  Locked: {
    label: "Lock Controls",
    controls: [
      "Inventory lock with concurrency guard prevents double-allocation",
      "Capital adequacy pre-validation against Exposure Coverage Ratio",
      "Transaction Risk Index scoring applied per trade",
      "Policy engine evaluation with frozen snapshot at lock time",
    ],
  },
  "Payment Confirmed": {
    label: "Payment Controls",
    controls: [
      "Dual-rail settlement routing via Moov or Modern Treasury",
      "SHA-256 deterministic idempotency key generated per transaction",
      "Multi-rail confirmation gating before state advancement",
      "Double-entry balanced clearing journal maintained",
    ],
  },
  Settled: {
    label: "Settlement Controls",
    controls: [
      "Atomic DvP execution — no partial settlement state permitted",
      "Idempotent settlement execution with retry safety",
      "Finality persistence with rail identity recorded",
      "Exception handling with defined failure states and recovery paths",
    ],
  },
  "Title Transferred": {
    label: "Transfer Controls",
    controls: [
      "SHA-256 signed clearing certificate issuance",
      "Canonical payload serialization for independent verification",
      "Append-only ledger sealed with tamper-evident hashing",
      "Independent verification pathway enabled for counterparties",
    ],
  },
};

const UNDERWRITING_SIGNALS = [
  "Deterministic state machine — every transition role-gated and audited",
  "Idempotent external event handling — safe retry semantics across all rails",
  "Traceable settlement timeline — full forensic reconstruction capability",
  "Defined failure states — every error path produces structured recovery",
  "Audit-ready trade logs — append-only, SHA-256 hashed event stream",
  "Capital monitoring checkpoints — continuous ECR and hardstop evaluation",
] as const;

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function RiskModelSection() {
  const [activeStage, setActiveStage] = useState<string | null>(null);

  return (
    <section
      id="risk-model"
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
                Exposure Compression
              </p>
              <div className="flex items-end gap-2 h-24">
                {[85, 55, 33, 12, 3].map((pct, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${pct}%`,
                        backgroundColor:
                          pct > 50
                            ? "rgba(209, 106, 93, 0.5)"
                            : pct > 20
                              ? "rgba(208, 168, 92, 0.4)"
                              : "rgba(63, 174, 122, 0.4)",
                      }}
                    />
                    <span className="text-[9px] text-[var(--mk-faint)] tabular-nums font-mono">
                      {LIFECYCLE_STAGES[i].length > 6
                        ? LIFECYCLE_STAGES[i].slice(0, 5) + "…"
                        : LIFECYCLE_STAGES[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="mk-overline mb-3">Risk Architecture</p>
            <h2 className="mk-h2 mb-4">
              Exposure Compression by Design
            </h2>
            <p className="mk-body max-w-xl">
              Risk decreases deterministically at each lifecycle stage. Controls
              are computationally enforced before any state transition is
              permitted — not applied retroactively.
            </p>
          </div>
        </motion.div>

        {/* ── A) Three Risk Lanes ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={reveal}
          className="mk-card mb-8 !p-6 sm:!p-8"
        >
          {/* Stage headers */}
          <div className="mb-2 grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr]">
            <div />
            <div className="grid grid-cols-5 text-center">
              {LIFECYCLE_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setActiveStage(activeStage === s ? null : s)
                  }
                  className={`cursor-pointer border-b-2 pb-3 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                    activeStage === s
                      ? "border-[var(--mk-gold)] text-[var(--mk-gold)]"
                      : "border-transparent text-[var(--mk-faint)] hover:text-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Risk lanes */}
          <div className="space-y-4 pt-4">
            {RISK_LANES.map((lane) => (
              <div
                key={lane.name}
                className="grid grid-cols-[140px_1fr] items-center sm:grid-cols-[160px_1fr]"
              >
                <span className="text-xs font-semibold text-white">
                  {lane.name}
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {lane.stages.map((st, i) => {
                    const isActive = activeStage === st.stage;
                    return (
                      <div
                        key={st.stage}
                        className="flex flex-col items-center"
                      >
                        <div
                          className="relative w-full overflow-hidden transition-all duration-500"
                          style={{
                            borderRadius: 4,
                            height: `${Math.max(st.level * 0.6 + 8, 8)}px`,
                            background: isActive
                              ? "var(--mk-gold)"
                              : `rgba(${170 - i * 25}, ${180 - i * 15}, ${200 - i * 10}, ${0.12 + st.level * 0.003})`,
                            opacity:
                              isActive ? 1 : 0.7 + (st.level / 100) * 0.3,
                          }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300"
                            style={{
                              background: "var(--mk-gold)",
                              opacity: isActive ? 0.8 : 0.15,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-6 border-t border-[var(--mk-border)] pt-4 text-[10px] text-[var(--mk-faint)]">
            <span>← Higher Exposure</span>
            <span className="flex-1 h-px bg-[var(--mk-border)]" />
            <span>Lower Exposure →</span>
          </div>
        </motion.div>

        {/* ── B) Controls Overlay ── */}
        <AnimatePresence mode="wait">
          {activeStage && STAGE_CONTROLS[activeStage] && (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mk-card mb-8 !p-6 sm:!p-8"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: "var(--mk-gold)",
              }}
            >
              <p className="mk-overline mb-4 !text-[var(--mk-gold)]">
                {STAGE_CONTROLS[activeStage].label} — {activeStage}
              </p>
              <ul className="space-y-2.5">
                {STAGE_CONTROLS[activeStage].controls.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-3 text-sm leading-relaxed text-slate-300"
                  >
                    <span className="mt-[7px] block h-px w-3 flex-shrink-0 bg-[var(--mk-gold)] opacity-60" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── C) Underwriting Signals Panel ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={reveal}
          className="mk-card !p-6 sm:!p-8"
        >
          <p className="mk-overline mb-5">Underwriting Signals</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {UNDERWRITING_SIGNALS.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 text-sm leading-relaxed text-slate-300"
              >
                <span className="mt-[7px] block h-px w-3 flex-shrink-0 bg-[var(--mk-gold)] opacity-40" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
