"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useVerificationCase, useSubmitVerificationStep } from "@/hooks/use-mock-queries";
import { ArrowLeft, Send, Lock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  LOCKED: "bg-surface-3 text-text-faint border-border",
  PENDING: "bg-info/10 text-info border-info/30",
  SUBMITTED: "bg-warning/10 text-warning border-warning/30",
  PASSED: "bg-success/10 text-success border-success/30",
  FAILED: "bg-danger/10 text-danger border-danger/30",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOCKED: Lock,
  PENDING: Clock,
  SUBMITTED: Send,
  PASSED: CheckCircle2,
  FAILED: XCircle,
};

export default function StepDetailPage() {
  return (
    <RequireAuth>
      <StepDetailContent />
    </RequireAuth>
  );
}

function StepDetailContent() {
  const params = useParams<{ stepId: string }>();
  const router = useRouter();
  const { user, org } = useAuth();
  const caseQ = useVerificationCase(user?.id ?? null);
  const submitMut = useSubmitVerificationStep();

  const vc = caseQ.data;
  const step = vc?.steps.find((s) => s.id === params.stepId);

  if (caseQ.isLoading) return <LoadingState message="Loading verification step…" />;
  if (!vc) return <ErrorState title="No Case" message="No verification case found. Start verification from the Identity Perimeter page." />;
  if (!step) return <ErrorState title="Step Not Found" message={`Step "${params.stepId}" not found in the current case file.`} />;

  const StatusIcon = STATUS_ICONS[step.status] ?? Clock;
  const canSubmit = step.status === "PENDING";

  const handleSubmit = () => {
    if (!vc || !org) return;
    submitMut.mutate(
      { existingCase: vc, stepId: step.id, orgId: org.id, orgType: org.type },
      {
        onSuccess: () => {
          router.push("/verification");
        },
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/verification" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Case File
        </Link>
      </div>

      <PageHeader title={step.title} description={`Step ID: ${step.id}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Step Status */}
        <DashboardPanel title="Step Status" tooltip="Current verification step state" asOf={step.submittedAt ?? vc.updatedAt}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", STATUS_COLORS[step.status])}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                  STATUS_COLORS[step.status]
                )}>
                  {step.status}
                </span>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-faint">Step ID</dt>
                <dd className="font-mono text-xs text-text">{step.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-faint">Submitted At</dt>
                <dd className="text-xs tabular-nums text-text">
                  {step.submittedAt
                    ? new Date(step.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-faint">Decided At</dt>
                <dd className="text-xs tabular-nums text-text">
                  {step.decidedAt
                    ? new Date(step.decidedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-faint">Decided By</dt>
                <dd className="font-mono text-xs text-text">{step.decidedBy ?? "—"}</dd>
              </div>
              {step.reasonCode && (
                <div className="flex justify-between">
                  <dt className="text-text-faint">Reason Code</dt>
                  <dd className="font-mono text-xs text-warning">{step.reasonCode}</dd>
                </div>
              )}
              {step.notes && (
                <div className="flex justify-between">
                  <dt className="text-text-faint">Notes</dt>
                  <dd className="text-xs text-text-muted max-w-[200px] text-right">{step.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </DashboardPanel>

        {/* Submission Action */}
        <DashboardPanel title="Submission" tooltip="Submit this step for screening" asOf={vc.updatedAt}>
          <div className="space-y-4">
            {canSubmit ? (
              <>
                <p className="text-sm text-text-muted">
                  Submitting this step will trigger deterministic screening based on your identity and organization data.
                  Results are computed immediately using institutional adapter rules.
                </p>
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-2">Screening Parameters</p>
                  <dl className="text-xs space-y-1.5 text-text-muted">
                    <div className="flex justify-between">
                      <dt>User ID</dt>
                      <dd className="font-mono text-text">{user?.id ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Org ID</dt>
                      <dd className="font-mono text-text">{org?.id ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Org Type</dt>
                      <dd className="capitalize text-text">{org?.type ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Track</dt>
                      <dd className="font-mono text-text">{vc.track}</dd>
                    </div>
                  </dl>
                </div>

                {submitMut.isError && (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    {submitMut.error?.message ?? "Submission failed."}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitMut.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {submitMut.isPending ? "Screening…" : "Submit for Screening"}
                </button>
              </>
            ) : step.status === "LOCKED" ? (
              <div className="text-center py-8">
                <Lock className="h-8 w-8 text-text-faint mx-auto mb-3" />
                <p className="text-sm text-text-faint">This step is locked. Complete the preceding step to unlock.</p>
              </div>
            ) : step.status === "PASSED" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
                <p className="text-sm text-success font-medium">Step passed — decision rationale logged</p>
                {step.decidedAt && (
                  <p className="text-xs text-text-faint mt-1 tabular-nums">
                    Decided: {new Date(step.decidedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ) : step.status === "FAILED" ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-danger mx-auto mb-3" />
                <p className="text-sm text-danger font-medium">Step failed — requires Compliance Desk Review</p>
                {step.reasonCode && (
                  <p className="font-mono text-xs text-warning mt-2">Reason: {step.reasonCode}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-warning mx-auto mb-3" />
                <p className="text-sm text-warning font-medium">Submitted — awaiting decision</p>
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
