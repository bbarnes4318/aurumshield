"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Shield,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Lock,
  Download,
  FileText,
  Loader2,
  Radio,
  Landmark,
  ArrowRight,
  Building2,
  Fingerprint,
  ExternalLink,
} from "lucide-react";
import { jsPDF } from "jspdf";

/* ================================================================
   UnifiedInstitutionalHub
   ================================================================
   Monolithic command center for the corporate buyer. Consolidates
   Compliance, Treasury Settlement, and Proof of Title into a single
   zero-scroll 1080p bento-box grid. Goldwire has a dedicated CTA.

   Grid: 12-col × 2-row, gap-6, p-6
   ├── Compliance Matrix       (top-left,    col-span-4)
   ├── Treasury Settlement Desk (bottom-left, col-span-4)
   └── Warrant of Title        (right,        col-span-8, row-span-2)
       └── Goldwire CTA        (top-right of Title panel)
   ================================================================ */

// ── Mock data ──────────────────────────────────────────────────────
const MOCK_ENTITY = {
  name: "Meridian Sovereign Capital Ltd.",
  lei: "549300MZUFH0KT7JLU16",
  jurisdiction: "England & Wales",
  complianceCert: "CC-2026-0309-INST-A7F2",
};

const MOCK_WARRANT = {
  bailmentId: "BLM-2026-0309-7FA2C8",
  vaultLocation: "Brink's London (Class III)",
  totalOunces: "1,244.000",
  purityStandard: "999.9 Fine (LBMA Good Delivery)",
  barSerials: ["VAL-88392A", "VAL-88393B", "VAL-88394C", "VAL-88395D"],
  sha256: "a3f7c9d1e4b82067fa5c39d2e8b14a70c6f5d3219e8a7b4c0d1f2e3a4b5c6d7",
  issuedAt: "2026-03-09T20:00:00Z",
  custodian: "Brink's Global Services",
  insuranceProvider: "Lloyd's of London — Syndicate 2623",
  lbmaRef: "LBMA-GD-2026-4481",
};

const MOCK_TREASURY = {
  wireRouting: "021000021",
  wireAccount: "8847-2391-0044",
  walletAddress: "0x7a3B...f9C2d4E8",
  totalDue: 2_847_320.0,
  currency: "USD",
};

const COMPLIANCE_STEPS = [
  { label: "Authenticating LEI...", duration: 1200 },
  { label: "Scanning Global Sanctions...", duration: 1800 },
  { label: "Verifying UBOs...", duration: 1400 },
];

// ── Helpers ────────────────────────────────────────────────────────
function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────
export function UnifiedInstitutionalHub() {
  // ── State ──
  const [complianceStatus, setComplianceStatus] = useState<
    "idle" | "running" | "cleared"
  >("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [treasuryStatus, setTreasuryStatus] = useState<
    "idle" | "pending"
  >("idle");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // ── Compliance Run ──
  const initiateComplianceRun = useCallback(() => {
    if (complianceStatus !== "idle") return;
    setComplianceStatus("running");
    setCurrentStep(0);
    setCompletedSteps([]);

    let cumulative = 0;
    COMPLIANCE_STEPS.forEach((step, idx) => {
      cumulative += step.duration;
      const t1 = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, idx]);
        if (idx < COMPLIANCE_STEPS.length - 1) {
          setCurrentStep(idx + 1);
        }
      }, cumulative);
      timersRef.current.push(t1);
    });

    const finalT = setTimeout(() => {
      setComplianceStatus("cleared");
    }, cumulative + 600);
    timersRef.current.push(finalT);
  }, [complianceStatus]);

  // ── Copy handler ──
  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    const t = setTimeout(() => setCopiedField(null), 2000);
    timersRef.current.push(t);
  }, []);

  // ── Transfer handler ──
  const handleTransferInitiated = useCallback(() => {
    if (treasuryStatus !== "idle" || complianceStatus !== "cleared") return;
    setTreasuryStatus("pending");
  }, [treasuryStatus, complianceStatus]);

  // ── PDF generation ──
  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const w = MOCK_WARRANT;
    const margin = 20;
    let y = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CRYPTOGRAPHIC WARRANT OF TITLE", margin, y);
    y += 10;

    doc.setDrawColor(180);
    doc.line(margin, y, 190, y);
    y += 12;

    doc.setFont("courier", "normal");
    doc.setFontSize(10);

    const fields: [string, string][] = [
      ["Bailment ID", w.bailmentId],
      ["Vault Location", w.vaultLocation],
      ["Total Fine Troy Oz", w.totalOunces],
      ["Purity Standard", w.purityStandard],
      ["LBMA Reference", w.lbmaRef],
      ["Custodian", w.custodian],
      ["Insurance", w.insuranceProvider],
      ["Issued", formatDate(w.issuedAt)],
      ["SHA-256 Hash", w.sha256],
    ];

    fields.forEach(([key, val]) => {
      doc.setFont("courier", "bold");
      doc.text(`${key}:`, margin, y);
      doc.setFont("courier", "normal");
      doc.text(val, margin + 50, y);
      y += 7;
    });

    y += 5;
    doc.setFont("courier", "bold");
    doc.text("LBMA Bar Serial Numbers:", margin, y);
    y += 7;
    doc.setFont("courier", "normal");
    w.barSerials.forEach((s) => {
      doc.text(`  • ${s}`, margin, y);
      y += 6;
    });

    y += 10;
    doc.setDrawColor(180);
    doc.line(margin, y, 190, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "This document is cryptographically sealed and verifiable on-chain.",
      margin,
      y
    );
    doc.text(
      `Entity: ${MOCK_ENTITY.name} — LEI: ${MOCK_ENTITY.lei}`,
      margin,
      y + 5
    );

    doc.save(`Warrant-of-Title-${w.bailmentId}.pdf`);
  }, []);

  const isComplianceCleared = complianceStatus === "cleared";

  return (
    <div className="h-screen w-full bg-[#0A0E17] overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex h-[56px] items-center justify-between border-b border-slate-800/60 px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/arum-logo-white-bold.svg"
            alt="AurumShield"
            width={28}
            height={28}
          />
          <span className="font-heading text-sm font-semibold tracking-tight text-white">
            Institutional Command Center
          </span>
          <span className="ml-2 rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest text-slate-400">
            Buyer Portal
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          <Fingerprint className="h-3.5 w-3.5" />
          <span>{MOCK_ENTITY.name}</span>
          <span className="text-slate-700">|</span>
          <span>LEI: {MOCK_ENTITY.lei}</span>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid h-[calc(100vh-56px)] grid-cols-12 grid-rows-2 gap-5 p-5">
        {/* ============================================================
            WIDGET 1 — Compliance & Identity Matrix (Top Left)
            ============================================================ */}
        <div className="col-span-4 row-span-1 flex flex-col rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-800/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <Terminal className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Module 01
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Compliance & Identity Matrix
                </h3>
              </div>
            </div>
            {isComplianceCleared && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  Cleared
                </span>
              </motion.div>
            )}
          </div>

          {/* Card body */}
          <div className="flex flex-1 flex-col justify-between p-5">
            {complianceStatus === "idle" && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/40">
                  <Shield className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mb-1 text-sm font-medium text-slate-300">
                  Entity Verification Required
                </p>
                <p className="mb-5 max-w-[260px] text-center font-mono text-[10px] leading-relaxed text-slate-500">
                  Run institutional KYC/AML checks against OFAC, EU, and GLEIF
                  registries before proceeding.
                </p>
                <button
                  onClick={initiateComplianceRun}
                  className="group flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-all hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                >
                  <Terminal className="h-3.5 w-3.5 transition-colors group-hover:text-[#D4AF37]" />
                  Initiate Compliance Run
                </button>
              </div>
            )}

            {complianceStatus === "running" && (
              <div className="flex flex-1 flex-col justify-center">
                <div className="rounded-lg border border-slate-800/60 bg-[#060B14] p-4 font-mono text-[11px]">
                  {/* Terminal dots */}
                  <div className="mb-3 flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
                    <span className="h-2 w-2 rounded-full bg-red-500/50" />
                    <span className="h-2 w-2 rounded-full bg-amber-500/50" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500/50" />
                    <span className="ml-2 text-[8px] text-slate-600 tracking-wider">
                      compliance-gateway
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {COMPLIANCE_STEPS.map((step, idx) => {
                      const done = completedSteps.includes(idx);
                      const active = currentStep === idx && !done;
                      if (idx > currentStep) return null;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2.5"
                        >
                          {done ? (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex h-4 w-4 items-center justify-center"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            </motion.span>
                          ) : active ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
                          ) : null}
                          <span
                            className={
                              done
                                ? "text-slate-400"
                                : "text-[#D4AF37]"
                            }
                          >
                            {step.label}
                          </span>
                          {done && (
                            <span className="ml-auto text-[8px] font-bold text-emerald-500/60">
                              PASS
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {complianceStatus === "cleared" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-1 flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20"
                >
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                </motion.div>
                <p className="text-sm font-semibold text-emerald-300">
                  Entity Cleared — Tier-1 Allocation
                </p>
                <p className="mt-1 font-mono text-[10px] text-emerald-500/50">
                  Certificate: {MOCK_ENTITY.complianceCert}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[10px]">
                  <span className="text-slate-500">Entity</span>
                  <span className="text-slate-300">{MOCK_ENTITY.name}</span>
                  <span className="text-slate-500">LEI</span>
                  <span className="text-slate-300">{MOCK_ENTITY.lei}</span>
                  <span className="text-slate-500">Jurisdiction</span>
                  <span className="text-slate-300">{MOCK_ENTITY.jurisdiction}</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ============================================================
            WIDGET 2 — Treasury Settlement Desk (Bottom Left)
            ============================================================ */}
        <div
          className={`col-span-4 row-span-1 flex flex-col rounded-xl border bg-[#111827] overflow-hidden transition-all duration-500 ${
            isComplianceCleared
              ? "border-slate-800/80"
              : "border-slate-800/40 opacity-50 pointer-events-none"
          }`}
        >
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-800/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <Landmark className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Module 02
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Treasury Settlement Desk
                </h3>
              </div>
            </div>
            {!isComplianceCleared && (
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-600" />
                <span className="font-mono text-[9px] text-slate-600">
                  Pending Compliance
                </span>
              </div>
            )}
            {treasuryStatus === "pending" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1"
              >
                <Radio className="h-3 w-3 animate-pulse text-amber-400" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Pending
                </span>
              </motion.div>
            )}
          </div>

          {/* Card body — split layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: QR + Addresses */}
            <div className="flex w-1/2 flex-col items-center justify-center border-r border-slate-800/40 p-4">
              {/* Stylized QR wrapper */}
              <div className="relative mb-3 flex h-[100px] w-[100px] items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80"
                   style={{ boxShadow: "0 0 24px rgba(198,168,107,0.12)" }}>
                {/* SVG QR pattern (stylized) */}
                <svg viewBox="0 0 80 80" className="h-16 w-16" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="2" stroke="#D4AF37" strokeWidth="2.5" />
                  <rect x="52" y="4" width="24" height="24" rx="2" stroke="#D4AF37" strokeWidth="2.5" />
                  <rect x="4" y="52" width="24" height="24" rx="2" stroke="#D4AF37" strokeWidth="2.5" />
                  <rect x="10" y="10" width="12" height="12" rx="1" fill="#D4AF37" />
                  <rect x="58" y="10" width="12" height="12" rx="1" fill="#D4AF37" />
                  <rect x="10" y="58" width="12" height="12" rx="1" fill="#D4AF37" />
                  <rect x="34" y="4" width="4" height="4" fill="#D4AF37" opacity="0.6" />
                  <rect x="34" y="12" width="4" height="4" fill="#D4AF37" opacity="0.4" />
                  <rect x="42" y="4" width="4" height="4" fill="#D4AF37" opacity="0.5" />
                  <rect x="34" y="34" width="12" height="12" rx="1" fill="#D4AF37" opacity="0.8" />
                  <rect x="4" y="34" width="4" height="4" fill="#D4AF37" opacity="0.4" />
                  <rect x="12" y="34" width="4" height="4" fill="#D4AF37" opacity="0.6" />
                  <rect x="52" y="34" width="4" height="4" fill="#D4AF37" opacity="0.5" />
                  <rect x="60" y="34" width="4" height="4" fill="#D4AF37" opacity="0.3" />
                  <rect x="34" y="52" width="4" height="4" fill="#D4AF37" opacity="0.4" />
                  <rect x="42" y="52" width="4" height="4" fill="#D4AF37" opacity="0.6" />
                  <rect x="52" y="52" width="12" height="12" rx="1" stroke="#D4AF37" strokeWidth="1.5" opacity="0.7" />
                  <rect x="68" y="52" width="4" height="4" fill="#D4AF37" opacity="0.5" />
                  <rect x="52" y="68" width="4" height="4" fill="#D4AF37" opacity="0.3" />
                  <rect x="68" y="68" width="8" height="8" rx="1" fill="#D4AF37" opacity="0.6" />
                </svg>
              </div>

              {/* Wire routing */}
              <div className="w-full space-y-2">
                <div>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">
                    Wire Routing
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-300">
                      {MOCK_TREASURY.wireRouting}
                    </span>
                    <button
                      onClick={() => handleCopy(MOCK_TREASURY.wireRouting, "routing")}
                      className="text-slate-600 transition-colors hover:text-slate-300"
                    >
                      {copiedField === "routing" ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">
                    Account
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-300">
                      {MOCK_TREASURY.wireAccount}
                    </span>
                    <button
                      onClick={() => handleCopy(MOCK_TREASURY.wireAccount, "account")}
                      className="text-slate-600 transition-colors hover:text-slate-300"
                    >
                      {copiedField === "account" ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">
                    On-Chain
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-300">
                      {MOCK_TREASURY.walletAddress}
                    </span>
                    <button
                      onClick={() => handleCopy(MOCK_TREASURY.walletAddress, "wallet")}
                      className="text-slate-600 transition-colors hover:text-slate-300"
                    >
                      {copiedField === "wallet" ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Action Terminal */}
            <div className="flex w-1/2 flex-col justify-center p-4">
              <AnimatePresence mode="wait">
                {treasuryStatus === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                      Settlement Amount
                    </p>
                    <p className="mb-1 font-mono text-2xl font-bold tracking-tight text-white">
                      {fmtUSD(MOCK_TREASURY.totalDue)}
                    </p>
                    <p className="mb-4 font-mono text-[9px] text-slate-500">
                      {MOCK_TREASURY.currency} • Wire or Stablecoin
                    </p>
                    <button
                      onClick={handleTransferInitiated}
                      disabled={!isComplianceCleared}
                      className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Transfer Initiated
                      </span>
                    </button>
                  </motion.div>
                )}

                {treasuryStatus === "pending" && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    {/* Pulsing radar */}
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                      <motion.div
                        className="absolute inset-0 rounded-full border border-amber-500/30"
                        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border border-amber-500/20"
                        animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      />
                      <Radio className="h-6 w-6 text-amber-400" />
                    </div>
                    <p className="mb-1 text-center text-xs font-semibold text-amber-300">
                      Pending Settlement
                    </p>
                    <p className="text-center font-mono text-[9px] leading-relaxed text-slate-500">
                      Awaiting Wire Receipt /<br />
                      On-Chain Finality
                    </p>
                    <p className="mt-3 font-mono text-lg font-bold text-white">
                      {fmtUSD(MOCK_TREASURY.totalDue)}
                    </p>
                    <button
                      disabled
                      className="mt-3 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      <Lock className="mr-1.5 inline h-3 w-3" />
                      Transfer Locked
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ============================================================
            WIDGET 3 — Cryptographic Warrant of Title (Right Panel)
            ============================================================ */}
        <div className="col-span-8 row-span-2 flex flex-col rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
                <FileText className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Module 03
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Cryptographic Warrant of Title
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Goldwire CTA */}
              <a
                href="/dashboard/retail"
                className="group flex items-center gap-2.5 rounded-lg px-4 py-2 font-mono text-[11px] font-semibold tracking-wide text-[#D4AF37] transition-all"
                style={{
                  border: "1px solid rgba(212,175,55,0.4)",
                  boxShadow: "0 0 16px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.1)",
                  background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)",
                }}
              >
                <Image
                  src="/goldwire-logo.svg"
                  alt="Goldwire"
                  width={16}
                  height={16}
                  className="opacity-90 transition-opacity group-hover:opacity-100"
                />
                <span>Launch Goldwire Liquidity Network</span>
                <ExternalLink className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
              </a>

              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 font-mono text-[11px] font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-700/80 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF Warrant
              </button>
            </div>
          </div>

          {/* Card body — Document with SEAL watermark */}
          <div className="relative flex-1 overflow-y-auto p-6">
            {/* SEAL watermark */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
              <Shield className="h-[320px] w-[320px] text-white" />
            </div>

            {/* Inner document card */}
            <div className="relative rounded-xl border border-slate-700 bg-slate-900/50 p-6">
              {/* Document title */}
              <div className="mb-6 border-b border-slate-700/60 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60">
                    <Shield className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-heading text-base font-bold tracking-tight text-white">
                      Bailment Certificate & Chain of Custody Record
                    </h4>
                    <p className="font-mono text-[10px] text-slate-500">
                      Blockchain-Verified • Immutable Ledger • Smart Contract
                      Sealed
                    </p>
                  </div>
                </div>
              </div>

              {/* Key-value ledger */}
              <div className="grid grid-cols-[180px_1fr] gap-y-3.5 font-mono text-[12px]">
                <LedgerRow label="Bailment ID" value={MOCK_WARRANT.bailmentId} />
                <LedgerRow
                  label="Vault Location"
                  value={MOCK_WARRANT.vaultLocation}
                  highlight
                />
                <LedgerRow
                  label="Total Fine Troy Oz"
                  value={MOCK_WARRANT.totalOunces}
                />
                <LedgerRow
                  label="Purity Standard"
                  value={MOCK_WARRANT.purityStandard}
                />
                <LedgerRow
                  label="LBMA Reference"
                  value={MOCK_WARRANT.lbmaRef}
                />
                <LedgerRow
                  label="Custodian"
                  value={MOCK_WARRANT.custodian}
                />
                <LedgerRow
                  label="Insurance"
                  value={MOCK_WARRANT.insuranceProvider}
                />
                <LedgerRow
                  label="Issued"
                  value={formatDate(MOCK_WARRANT.issuedAt)}
                />

                {/* Separator */}
                <div className="col-span-2 border-t border-slate-700/40 my-1" />

                {/* Bar Serials */}
                <span className="text-slate-500 uppercase text-[10px] tracking-wider self-start pt-1">
                  LBMA Bar Serials
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOCK_WARRANT.barSerials.map((serial) => (
                    <span
                      key={serial}
                      className="inline-flex rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-[11px] text-slate-300"
                    >
                      {serial}
                    </span>
                  ))}
                </div>

                {/* Separator */}
                <div className="col-span-2 border-t border-slate-700/40 my-1" />

                {/* Hash */}
                <span className="text-slate-500 uppercase text-[10px] tracking-wider self-start pt-1">
                  SHA-256 Hash
                </span>
                <div className="flex items-center gap-2">
                  <code className="rounded border border-slate-700 bg-slate-800/60 px-3 py-1.5 font-mono text-[11px] tracking-wide text-emerald-400/80 break-all">
                    {MOCK_WARRANT.sha256}
                  </code>
                  <button
                    onClick={() => handleCopy(MOCK_WARRANT.sha256, "hash")}
                    className="shrink-0 text-slate-600 transition-colors hover:text-slate-300"
                  >
                    {copiedField === "hash" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Footer seal */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-700/40 pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/5">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-400">
                      Cryptographically Sealed
                    </p>
                    <p className="font-mono text-[9px] text-slate-500">
                      On-chain verification available via contract ABI
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-slate-500">
                    Entity: {MOCK_ENTITY.name}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">
                    LEI: {MOCK_ENTITY.lei}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function LedgerRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <>
      <span className="text-slate-500 uppercase text-[10px] tracking-wider self-center">
        {label}
      </span>
      <span
        className={`text-[12px] ${
          highlight ? "text-white font-semibold" : "text-slate-300"
        }`}
      >
        {value}
      </span>
    </>
  );
}
