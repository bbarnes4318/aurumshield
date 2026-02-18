"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/state-views";
import { CaseSummaryCard } from "@/components/verification/case-summary-card";
import { StepLadder } from "@/components/verification/step-ladder";
import { DecisionPanel } from "@/components/verification/decision-panel";
import { AuditLog } from "@/components/verification/audit-log";
import {
  useVerificationCase,
  useInitVerification,
} from "@/hooks/use-mock-queries";
import { Fingerprint, Printer, ShieldAlert } from "lucide-react";
import type { VerificationTrack } from "@/lib/mock-data";

export default function VerificationPage() {
  return (
    <RequireAuth>
      <VerificationContent />
    </RequireAuth>
  );
}

function VerificationContent() {
  const { user, org } = useAuth();
  const caseQ = useVerificationCase(user?.id ?? null);
  const initMut = useInitVerification();

  const vc = caseQ.data;

  const handleInitCase = (track: VerificationTrack) => {
    if (!user || !org) return;
    initMut.mutate({ track, userId: user.id, orgId: org.id });
  };

  if (caseQ.isLoading) return <LoadingState message="Loading identity perimeter…" />;

  // No case exists — show track selection
  if (!vc) {
    return (
      <>
        <PageHeader
          title="Identity Perimeter"
          description="Initiate identity verification to access trading and settlement functions"
        />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {/* KYC Card */}
          <div className="rounded-lg border border-border bg-surface-1 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
                <Fingerprint className="h-5 w-5 text-info" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">Individual KYC</h3>
                <p className="text-xs text-text-faint">Know Your Customer — personal identity</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4">
              4-step verification: email & phone, government ID, liveness check, and sanctions screening.
              Required for individual accounts.
            </p>
            <ul className="text-xs text-text-faint space-y-1 mb-4">
              <li className="flex items-center gap-1.5">• Email & Phone Confirmation</li>
              <li className="flex items-center gap-1.5">• Government ID Capture</li>
              <li className="flex items-center gap-1.5">• Liveness Verification</li>
              <li className="flex items-center gap-1.5">• Sanctions / PEP Screening</li>
            </ul>
            <button
              onClick={() => handleInitCase("INDIVIDUAL_KYC")}
              disabled={initMut.isPending}
              className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initMut.isPending ? "Initiating…" : "Open KYC Case"}
            </button>
          </div>

          {/* KYB Card */}
          <div className="rounded-lg border border-border bg-surface-1 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">Business KYB</h3>
                <p className="text-xs text-text-faint">Know Your Business — entity verification</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4">
              8-step verification: email, ID, liveness, sanctions, plus UBO declaration, proof of address,
              source of funds, and business documents.
            </p>
            <ul className="text-xs text-text-faint space-y-1 mb-4">
              <li className="flex items-center gap-1.5">• All KYC steps (4)</li>
              <li className="flex items-center gap-1.5">• Ultimate Beneficial Owner Declaration</li>
              <li className="flex items-center gap-1.5">• Proof of Registered Address</li>
              <li className="flex items-center gap-1.5">• Source of Funds Declaration</li>
              <li className="flex items-center gap-1.5">• Business Documentation Review</li>
            </ul>
            <button
              onClick={() => handleInitCase("BUSINESS_KYB")}
              disabled={initMut.isPending}
              className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initMut.isPending ? "Initiating…" : "Open KYB Case"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Case exists — show 3-panel command console
  return (
    <>
      <div className="flex items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Identity Perimeter — Case File"
          description={`Track: ${vc.track} | User: ${vc.userId}`}
        />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text print:hidden"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Case File
        </button>
      </div>

      {/* 3-panel layout at ≥1280px */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-4">
        {/* Left: Case Summary */}
        <CaseSummaryCard verificationCase={vc} />

        {/* Center: Step Ladder */}
        <StepLadder steps={vc.steps} currentStepId={vc.nextRequiredStepId} />

        {/* Right: Decision & Evidence + Audit Log */}
        <div className="space-y-4">
          <DecisionPanel
            verificationCase={vc}
            userId={user?.id ?? ""}
            orgId={org?.id ?? ""}
          />
          <AuditLog audit={vc.audit} />
        </div>
      </div>
    </>
  );
}
