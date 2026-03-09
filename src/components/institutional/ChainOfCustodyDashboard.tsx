"use client";

import {
  Shield,
  CheckCircle2,
  Package,
  Building2,
  FileText,
  Award,
  Lock,
  Scan,
} from "lucide-react";
import { motion } from "framer-motion";

/* ================================================================
   ChainOfCustodyDashboard — Step 5
   ================================================================
   Post-trade dashboard showing:
   - "Unbroken Chain of Custody" vertical timeline
   - Ultrasonic assay verification results (mock)
   - Bar serial numbers table (mock LBMA serial numbers)
   - Clearing certificate placeholder
   ================================================================ */

interface ChainOfCustodyDashboardProps {
  barCount: number;
}

const CUSTODY_EVENTS = [
  {
    time: "2026-03-09T15:32:00Z",
    title: "Trade Executed — Price Locked",
    description: "Institutional spot price locked at $5,171.92/oz. 48 × 400-oz LBMA Good Delivery bars allocated.",
    icon: Lock,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T15:33:00Z",
    title: "KYC/AML Compliance Gate — Passed",
    description: "Entity verification, UBO screening, and OpenSanctions watchlist check completed. Zero matches.",
    icon: Shield,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T15:34:00Z",
    title: "Settlement Confirmed — Goldwire T+0",
    description: "Atomic settlement via Goldwire network. Funds received and cleared instantly.",
    icon: CheckCircle2,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T15:35:00Z",
    title: "Title Transfer — Legal Ownership Assigned",
    description: "Full legal title transferred to buyer entity. Bailment agreement executed under allocated storage.",
    icon: FileText,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T15:40:00Z",
    title: "Ultrasonic Assay Verification — Passed",
    description: "All 48 bars verified via ultrasonic testing. 995+ fine gold purity confirmed. LBMA serialization matched.",
    icon: Scan,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T16:00:00Z",
    title: "Vault Deposit — Malca-Amit London",
    description: "48 bars deposited into allocated cage. CCTV recording archived. Dual-agent seal verification complete.",
    icon: Building2,
    status: "completed" as const,
  },
  {
    time: "2026-03-09T16:15:00Z",
    title: "Cryptographic Clearing Certificate Issued",
    description: "SHA-256 signed clearing certificate generated. Immutable proof of settlement recorded.",
    icon: Award,
    status: "completed" as const,
  },
];

/* ── Mock bar serial numbers ── */
function generateMockSerials(count: number) {
  const refiners = ["Metalor", "PAMP SA", "Argor-Heraeus", "Valcambi", "Johnson Matthey", "Rand Refinery"];
  return Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    serial: `GD${String(2024000 + i + 1).padStart(7, "0")}`,
    refiner: refiners[i % refiners.length],
    weight: `${(398 + Math.random() * 5).toFixed(2)} oz`,
    purity: `${(999.0 + Math.random() * 0.9).toFixed(1)}`,
    assayResult: "PASS" as const,
  }));
}

export function ChainOfCustodyDashboard({ barCount }: ChainOfCustodyDashboardProps) {
  const serials = generateMockSerials(barCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 p-6"
    >
      {/* ── Step Header ── */}
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
          — Step 5 of 5
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white mt-1">
          Chain of Custody & Audit Receipt
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Unbroken chain of custody documentation with ultrasonic assay
          verification and cryptographic certificate.
        </p>
      </div>

      {/* ── Confirmation Banner ── */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 px-6 py-5 flex items-center gap-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <p className="font-heading text-lg font-bold text-emerald-300">
            Transaction Complete — Settlement Confirmed
          </p>
          <p className="text-sm text-emerald-500/60 mt-0.5">
            {barCount} × LBMA Good Delivery 400-oz bars · Fully Allocated · Insured
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-500/50">
            Settlement ID
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
            GW-2026-0309-INS-48A
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-5 gap-5">
        {/* ── Chain of Custody Timeline (3 cols) ── */}
        <div className="col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-gold" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Unbroken Chain of Custody
            </p>
          </div>

          <div className="relative pl-6">
            {/* Vertical connector line */}
            <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-linear-to-b from-emerald-500/30 via-gold/20 to-slate-800" />

            <div className="space-y-4">
              {CUSTODY_EVENTS.map((event, idx) => {
                const Icon = event.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx + 0.3 }}
                    className="relative flex gap-3"
                  >
                    {/* Node dot */}
                    <div className="absolute -left-6 mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <Icon className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white">
                          {event.title}
                        </p>
                        <span className="font-mono text-[8px] text-emerald-500/50 tabular-nums">
                          {new Date(event.time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            timeZone: "UTC",
                          })}{" "}
                          UTC
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Assay & Certificate (2 cols) ── */}
        <div className="col-span-2 space-y-5">
          {/* Ultrasonic Assay Verification */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Scan className="h-4 w-4 text-gold" />
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Ultrasonic Assay Verification
              </p>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Bars Tested</span>
                <span className="font-mono text-xs font-semibold text-white">
                  {barCount} / {barCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pass Rate</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  100%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Avg Purity</span>
                <span className="font-mono text-xs font-semibold text-white">
                  999.4 / 1000
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Method</span>
                <span className="font-mono text-[10px] text-slate-400">
                  GE USM Go+ Ultrasonic
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-800/30 bg-emerald-950/15 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                All Bars Verified — No Anomalies
              </span>
            </div>
          </div>

          {/* Clearing Certificate */}
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-gold" />
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-gold/60">
                Clearing Certificate
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Certificate Hash</span>
                <span className="font-mono text-[9px] text-gold tabular-nums">
                  sha256:7f8a...e3b1
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Signed By</span>
                <span className="font-mono text-[10px] text-slate-400">
                  AurumShield HSM
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Format</span>
                <span className="font-mono text-[10px] text-slate-400">
                  PKCS#7 / CAdES
                </span>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold transition-all hover:bg-gold/20"
            >
              <FileText className="h-4 w-4" />
              Download Cryptographic Title (.json)
            </button>
          </div>

          {/* Vault Confirmation */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-gold/60" />
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Vault Confirmation
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Facility</span>
                <span className="font-mono text-[10px] text-white">
                  Malca-Amit London
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Cage #</span>
                <span className="font-mono text-[10px] text-slate-400">
                  MA-LDN-V12-C047
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status</span>
                <span className="font-mono text-[10px] font-semibold text-emerald-400">
                  DEPOSITED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bar Serial Numbers Table ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gold" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              LBMA Good Delivery Bar Register
            </p>
          </div>
          <span className="font-mono text-[9px] text-slate-600">
            Showing {serials.length} of {barCount} bars
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="pb-2 pr-4 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Serial No.
                </th>
                <th className="pb-2 pr-4 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Refiner
                </th>
                <th className="pb-2 pr-4 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 text-right">
                  Weight
                </th>
                <th className="pb-2 pr-4 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 text-right">
                  Purity
                </th>
                <th className="pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 text-right">
                  Assay
                </th>
              </tr>
            </thead>
            <tbody>
              {serials.map((bar, idx) => (
                <motion.tr
                  key={bar.serial}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * idx + 0.5 }}
                  className="border-b border-slate-800/50 last:border-b-0"
                >
                  <td className="py-2 pr-4 font-mono text-[11px] font-semibold text-gold tabular-nums">
                    {bar.serial}
                  </td>
                  <td className="py-2 pr-4 text-xs text-slate-300">
                    {bar.refiner}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-[11px] tabular-nums text-slate-300">
                    {bar.weight}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-[11px] tabular-nums text-slate-300">
                    {bar.purity}
                  </td>
                  <td className="py-2 text-right">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
                      {bar.assayResult}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
