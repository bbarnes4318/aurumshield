"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Terminal } from "lucide-react";
import { useWizardStore } from "./wizard-store";

/* ================================================================
   KycAmlGateway — Step 1
   ================================================================
   Terminal-style compliance verification sequence. Rapidly cycles
   through checks, each auto-resolving with a green checkmark.
   Final: "Entity Cleared for Tier-1 Allocation" → auto-advance.
   Zero scroll — fits in viewport.
   ================================================================ */

const CHECKS = [
  { label: "Initializing Secure Compliance Gateway...", delay: 400 },
  { label: "Authenticating Entity Credentials (LEI: 549300MZUFH0KT7JLU16)", delay: 700 },
  { label: "Scanning OFAC SDN Master Sanctions List...", delay: 900 },
  { label: "Cross-referencing EU Consolidated Sanctions...", delay: 600 },
  { label: "Querying FinCEN Beneficial Ownership Registry...", delay: 800 },
  { label: "Verifying Corporate UBO Chain (4 principals)...", delay: 700 },
  { label: "Screening PEP / Adverse Media Databases...", delay: 500 },
  { label: "Validating Legal Entity Identifier (GLEIF)...", delay: 600 },
  { label: "Confirming Tier-1 Institutional Allocation Eligibility...", delay: 800 },
  { label: "Generating Cryptographic Compliance Certificate...", delay: 600 },
];

export function KycAmlGateway() {
  const { goNext, setKycCleared } = useWizardStore();
  const [completedIdx, setCompletedIdx] = useState(-1);
  const [allDone, setAllDone] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    let cumulative = 800; // initial boot delay
    const ts: NodeJS.Timeout[] = [];

    CHECKS.forEach((check, idx) => {
      cumulative += check.delay;
      const t = setTimeout(() => {
        setCompletedIdx(idx);
        if (idx === CHECKS.length - 1) {
          setTimeout(() => {
            setAllDone(true);
            setKycCleared(true);
            // Auto-advance after green flash
            setTimeout(() => goNext(), 1800);
          }, 500);
        }
      }, cumulative);
      ts.push(t);
    });

    timeoutsRef.current = ts;
    return () => ts.forEach(clearTimeout);
  }, [goNext, setKycCleared]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-[680px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
            <Terminal className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
              Step 1 of 6
            </p>
            <h2 className="font-heading text-xl font-bold tracking-tight text-white">
              Institutional KYC / AML Verification
            </h2>
          </div>
        </div>

        {/* Terminal Console */}
        <div className="rounded-xl border border-slate-800 bg-[#050a14] p-4 font-mono text-[11px]">
          {/* Terminal header bar */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60">
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500/60" />
              <span className="h-2 w-2 rounded-full bg-amber-500/60" />
              <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-[9px] text-slate-600 tracking-wider">
              aurumshield://compliance-gateway — Powered by Alloy + Sumsub
            </span>
          </div>

          {/* Check Lines */}
          <div className="space-y-1.5">
            {CHECKS.map((check, idx) => {
              const done = idx <= completedIdx;
              const active = idx === completedIdx + 1;

              if (idx > completedIdx + 1) return null;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {done ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="text-gold"
                    >
                      ›
                    </motion.span>
                  )}
                  <span
                    className={
                      done
                        ? "text-slate-400"
                        : active
                          ? "text-gold"
                          : "text-slate-600"
                    }
                  >
                    {check.label}
                  </span>
                  {done && (
                    <span className="ml-auto text-[9px] text-emerald-500/50">
                      PASS
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Cleared State ── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 20 }}
              className="mt-5 flex flex-col items-center rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mb-3"
              >
                <ShieldCheck className="h-9 w-9 text-emerald-400" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-heading text-lg font-bold text-emerald-300 tracking-tight"
              >
                Entity Cleared for Tier-1 Allocation
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-mono text-[10px] text-emerald-500/50 mt-1"
              >
                Compliance Certificate: CC-2026-0309-INST-A7F2
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
