"use client";

/* ================================================================
   INSTITUTIONAL COMPLIANCE — /institutional/compliance
   ================================================================
   KYC/AML/KYB compliance dashboard for institutional buyers.
   Shows verification status and links to onboarding if incomplete.
   ================================================================ */

import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, FileText, Clock } from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

/* ── Mock compliance data ── */
const COMPLIANCE_CHECKS = [
  { id: "kyc", label: "Know Your Customer (KYC)", status: "verified" as const, verifiedAt: "2026-03-10T14:30:00Z" },
  { id: "aml", label: "Anti-Money Laundering (AML)", status: "verified" as const, verifiedAt: "2026-03-10T14:30:00Z" },
  { id: "kyb", label: "Know Your Business (KYB)", status: "verified" as const, verifiedAt: "2026-03-11T09:15:00Z" },
  { id: "accreditation", label: "Accredited Investor Status", status: "verified" as const, verifiedAt: "2026-03-12T11:00:00Z" },
  { id: "sanctions", label: "OFAC Sanctions Screening", status: "verified" as const, verifiedAt: "2026-03-10T14:30:00Z" },
] as const;

const STATUS_STYLES = {
  verified: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "VERIFIED" },
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "PENDING" },
  failed: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "FAILED" },
} as const;

export default function InstitutionalCompliancePage() {
  const { data: onboardingState, isLoading } = useOnboardingState();
  const isCleared = onboardingState?.status === "COMPLETED";

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
              Compliance Perimeter
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              KYC · AML · KYB · Sanctions Screening
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isCleared ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-yellow-400 animate-pulse"}`} />
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            {isLoading ? "VERIFYING..." : isCleared ? "ALL CHECKS PASSED" : "VERIFICATION REQUIRED"}
          </span>
        </div>
      </div>

      {/* Compliance Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {COMPLIANCE_CHECKS.map((check) => {
          const style = STATUS_STYLES[check.status];
          const Icon = style.icon;

          return (
            <div
              key={check.id}
              className={`flex items-center justify-between px-5 py-4 rounded border ${style.border} ${style.bg}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${style.color}`} />
                <div>
                  <p className="text-sm font-medium text-white">{check.label}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {check.verifiedAt
                      ? `Verified ${new Date(check.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "Awaiting verification"}
                  </p>
                </div>
              </div>
              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${style.color}`}>
                {style.label}
              </span>
            </div>
          );
        })}

        {/* Documents Section */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-3">
            Compliance Documents
          </h3>
          <div className="space-y-2">
            {[
              { name: "Certificate of Incorporation", date: "Mar 10, 2026" },
              { name: "Beneficial Ownership Declaration", date: "Mar 10, 2026" },
              { name: "AML Policy Attestation", date: "Mar 11, 2026" },
              { name: "Accredited Investor Verification", date: "Mar 12, 2026" },
            ].map((doc) => (
              <div key={doc.name} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-300">{doc.name}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-600">{doc.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Action */}
      {!isCleared && !isLoading && (
        <div className="shrink-0">
          <Link
            href="/offtaker/onboarding/kyb"
            className="flex items-center justify-center gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Complete Verification
          </Link>
        </div>
      )}
    </div>
  );
}
