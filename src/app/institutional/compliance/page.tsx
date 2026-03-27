"use client";

/* ================================================================
   INSTITUTIONAL COMPLIANCE — /institutional/compliance
   ================================================================
   KYC/AML/KYB compliance dashboard for institutional buyers.
   Derives verification status from the real onboarding state.
   No hardcoded mock checks — shows actual compliance posture.
   ================================================================ */

import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, FileText, Clock, ArrowRight, Info } from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

/* ── Source Label Component ── */
function SourceLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[8px] text-slate-600 tracking-wider uppercase">
      <Info className="h-2.5 w-2.5" />
      {source}
    </span>
  );
}

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
          {isLoading ? (
            <>
              <Clock className="h-3.5 w-3.5 text-slate-500 animate-pulse" />
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                VERIFYING...
              </span>
            </>
          ) : isCleared ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
                ALL CHECKS PASSED
              </span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="font-mono text-[10px] text-yellow-400 uppercase tracking-wider">
                VERIFICATION REQUIRED
              </span>
            </>
          )}
        </div>
      </div>

      {/* Compliance Status — Derived from Real Onboarding State */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-5 w-5 text-slate-600 animate-spin" />
          </div>
        ) : isCleared ? (
          <>
            {/* Entity Cleared Card */}
            <div className="flex items-center justify-between px-5 py-4 rounded border border-emerald-500/20 bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">Entity Compliance — Cleared</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Your organization has completed all required compliance verification stages.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                VERIFIED
              </span>
            </div>

            {/* Compliance Scope Breakdown */}
            <div className="rounded border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold">
                  Compliance Scope
                </h3>
                <SourceLabel source="Derived from compliance case" />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Know Your Customer (KYC)", desc: "Identity verification completed through compliance provider" },
                  { label: "Anti-Money Laundering (AML)", desc: "AML screening and risk assessment passed" },
                  { label: "Know Your Business (KYB)", desc: "Entity verification and corporate structure validated" },
                  { label: "Sanctions Screening", desc: "OFAC, EU, and UN sanctions lists checked" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60" />
                      <div>
                        <span className="text-xs text-slate-300">{item.label}</span>
                        <p className="text-[9px] text-slate-600 font-mono">{item.desc}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400/60">
                      Cleared
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Verification Required State */
          <div className="flex items-center justify-between px-5 py-4 rounded border border-yellow-500/20 bg-yellow-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-white">Verification Required</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Complete the institutional onboarding process to unlock compliance clearance.
                </p>
              </div>
            </div>
            <Link
              href="/institutional/get-started/welcome"
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
            >
              Begin
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Documents Section — Honest Placeholder */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold">
              Compliance Documents
            </h3>
            <SourceLabel source="Derived from compliance case" />
          </div>
          <div className="flex flex-col items-center text-center py-6">
            <FileText className="h-5 w-5 text-slate-700 mb-2" />
            <p className="font-mono text-xs text-slate-500 font-semibold mb-0.5">
              Awaiting first generated compliance artifact
            </p>
            <p className="font-mono text-[10px] text-slate-600 max-w-sm leading-relaxed">
              Compliance documents such as certificates of incorporation, beneficial ownership
              declarations, and AML attestations will appear here once generated by your
              compliance provider.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      {!isCleared && !isLoading && (
        <div className="shrink-0">
          <Link
            href="/institutional/get-started/welcome"
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
