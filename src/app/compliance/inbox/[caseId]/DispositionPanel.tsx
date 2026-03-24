"use client";

/* ================================================================
   DISPOSITION PANEL — Manual Case Verdict
   ================================================================
   Slide-out panel for rendering a final APPROVED or REJECTED
   verdict on a compliance case. Enforces:

     1. All required tasks must be complete
     2. Rationale is mandatory (min 10 chars)
     3. Four-Eyes dual-signoff — visually blocks same-reviewer
        disposition on high-risk/high-priority cases
     4. Handles DualSignoffRequiredError from server gracefully

   Uses Shadcn Sheet component pattern (pure Radix dialog).
   ================================================================ */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { submitDispositionAction } from "@/actions/compliance-decisions";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gavel,
  Loader2,
  Lock,
} from "lucide-react";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface DispositionPanelProps {
  caseId: string;
  caseStatus: string;
  casePriority: number;
  assignedReviewerId: string | null;
  currentUserId: string;
  subjectRiskTier: string;
  hasIncompleteRequiredTasks: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── FOUR-EYES DETERMINATION ───────────────────────────────────────────────────

const FOUR_EYES_THRESHOLD = 80;
const FOUR_EYES_RISK_TIERS = new Set(["HIGH", "ENHANCED"]);

function requiresFourEyes(priority: number, riskTier: string): boolean {
  return priority >= FOUR_EYES_THRESHOLD || FOUR_EYES_RISK_TIERS.has(riskTier);
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export default function DispositionPanel({
  caseId,
  caseStatus,
  casePriority,
  assignedReviewerId,
  currentUserId,
  subjectRiskTier,
  hasIncompleteRequiredTasks,
  onClose,
  onSuccess,
}: DispositionPanelProps) {
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fourEyesRequired = requiresFourEyes(casePriority, subjectRiskTier);
  const isSameReviewer = assignedReviewerId === currentUserId;
  const fourEyesBlocked = fourEyesRequired && isSameReviewer;

  const notReady = caseStatus !== "READY_FOR_DISPOSITION";
  const canSubmit =
    !notReady &&
    !hasIncompleteRequiredTasks &&
    rationale.trim().length >= 10 &&
    !loading &&
    !success;

  const handleSubmit = useCallback(
    async (verdict: "APPROVED" | "REJECTED") => {
      if (!canSubmit) return;
      if (fourEyesBlocked && verdict === "APPROVED") return;

      setLoading(true);
      setError(null);

      const result = await submitDispositionAction(
        caseId,
        currentUserId,
        verdict,
        rationale.trim(),
      );

      setLoading(false);

      if (result.success) {
        setSuccess(`Case ${verdict.toLowerCase()} successfully.`);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        if (result.errorType === "DualSignoffRequiredError") {
          setError(
            "Four-Eyes control violated: A secondary reviewer is required for final signoff. " +
              "You cannot approve a case you were assigned to review.",
          );
        } else {
          setError(result.error ?? "Disposition failed.");
        }
      }
    },
    [canSubmit, fourEyesBlocked, caseId, currentUserId, rationale, onSuccess],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-border bg-surface-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-text-faint" />
            <h2 className="text-sm font-semibold text-text tracking-tight">Case Disposition</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
            disabled={loading}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Success state */}
          {success && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          {/* Blocking conditions */}
          {notReady && (
            <div className="flex items-center gap-2 rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
              <Lock className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">
                Case status is <span className="font-bold">{caseStatus}</span> — must be READY_FOR_DISPOSITION.
              </p>
            </div>
          )}

          {hasIncompleteRequiredTasks && !notReady && (
            <div className="flex items-center gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">
                Required tasks are still incomplete. Complete or waive all required tasks before disposition.
              </p>
            </div>
          )}

          {/* Four-Eyes indicator */}
          <div className={cn(
            "rounded border px-3 py-2",
            fourEyesRequired
              ? fourEyesBlocked
                ? "border-red-500/20 bg-red-500/5"
                : "border-emerald-500/20 bg-emerald-500/5"
              : "border-border bg-surface-3/30",
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-text-faint" />
              <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                Four-Eyes Control
              </span>
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                fourEyesRequired
                  ? "text-amber-400 bg-amber-400/10"
                  : "text-slate-400 bg-slate-400/10",
              )}>
                {fourEyesRequired ? "Required" : "Not Required"}
              </span>
            </div>
            {fourEyesRequired && (
              <p className={cn(
                "text-xs",
                fourEyesBlocked ? "text-red-400" : "text-emerald-400",
              )}>
                {fourEyesBlocked
                  ? "⚠ You are the assigned reviewer. A secondary reviewer is required for final signoff."
                  : "✓ Different reviewer confirmed. Four-Eyes control satisfied."}
              </p>
            )}
            {!fourEyesRequired && (
              <p className="text-xs text-text-faint">
                Standard risk — single reviewer disposition allowed.
              </p>
            )}
          </div>

          {/* Rationale textarea */}
          {!success && (
            <>
              <div>
                <label htmlFor="disposition-rationale" className="block text-xs font-semibold text-text mb-1.5">
                  Rationale <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="disposition-rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Document your reasoning for this disposition (minimum 10 characters)…"
                  className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-text placeholder:text-text-faint/40 focus:outline-none focus:ring-1 focus:ring-gold/30 resize-none"
                  rows={4}
                  disabled={loading || notReady || hasIncompleteRequiredTasks}
                />
                <p className="text-[10px] text-text-faint mt-1 tabular-nums">
                  {rationale.trim().length} / 10 min characters
                </p>
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSubmit("APPROVED")}
                  disabled={!canSubmit || fourEyesBlocked}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    canSubmit && !fourEyesBlocked
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                      : "border-border bg-surface-3 text-text-faint/40 cursor-not-allowed",
                  )}
                  title={fourEyesBlocked ? "Secondary reviewer required for approval" : undefined}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </button>

                <button
                  onClick={() => handleSubmit("REJECTED")}
                  disabled={!canSubmit}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    canSubmit
                      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                      : "border-border bg-surface-3 text-text-faint/40 cursor-not-allowed",
                  )}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
