"use client";

/* ================================================================
   BROKER COMPLIANCE — /broker/compliance
   ================================================================
   AML Training hub for broker intermediaries. Renders the mandatory
   AML training module and shows certification status.
   ================================================================ */

import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, BookOpen, Award } from "lucide-react";
import { useAmlStatus } from "@/hooks/use-aml-status";

/* ── AML Training Modules (mock) ── */
const AML_MODULES = [
  { id: "mod-1", title: "Customer Due Diligence (CDD)", duration: "15 min", required: true },
  { id: "mod-2", title: "Enhanced Due Diligence for PEPs", duration: "20 min", required: true },
  { id: "mod-3", title: "Suspicious Activity Reporting (SAR)", duration: "25 min", required: true },
  { id: "mod-4", title: "Sanctions Screening & OFAC Compliance", duration: "15 min", required: true },
  { id: "mod-5", title: "Transaction Monitoring Best Practices", duration: "20 min", required: false },
] as const;

export default function BrokerCompliancePage() {
  const { data: amlStatus, isLoading } = useAmlStatus();
  const isComplete = amlStatus?.isComplete ?? false;

  return (
    <div className="absolute inset-0 flex flex-col p-4 overflow-hidden gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Shield className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              AML Compliance
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              Mandatory Anti-Money Laundering Training
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                CERTIFIED
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="font-mono text-[10px] text-yellow-400 uppercase tracking-wider font-bold">
                TRAINING REQUIRED
              </span>
            </>
          )}
        </div>
      </div>

      {/* AML Status Banner */}
      {!isComplete && !isLoading && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 rounded border border-yellow-500/30 bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">
              AML Training Incomplete
            </p>
            <p className="text-[11px] text-yellow-400/70 mt-0.5">
              You must complete all required modules below before accessing broker deal execution.
            </p>
          </div>
        </div>
      )}

      {/* Certificate Display */}
      {isComplete && amlStatus && (
        <div className="shrink-0 flex items-center gap-4 px-5 py-4 rounded border border-emerald-500/20 bg-emerald-500/5">
          <Award className="h-8 w-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">AML Certification Active</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Certified: {amlStatus.certifiedName ?? "Broker"} ·{" "}
              {amlStatus.completedAt ? new Date(amlStatus.completedAt).toLocaleDateString() : "Active"}
            </p>
          </div>
        </div>
      )}

      {/* Training Modules */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-2">
          Training Modules
        </p>
        {AML_MODULES.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between px-4 py-3.5 rounded border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm text-white font-medium">{mod.title}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {mod.duration} · {mod.required ? "Required" : "Optional"}
                </p>
              </div>
            </div>
            <Link
              href="/compliance/training"
              className="font-mono text-[10px] text-[#C6A86B] border border-[#C6A86B]/30 px-3 py-1.5 hover:bg-[#C6A86B]/10 transition-colors uppercase tracking-wider"
            >
              {isComplete ? "Review" : "Start"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
