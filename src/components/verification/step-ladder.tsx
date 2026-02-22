"use client";

import { cn } from "@/lib/utils";
import type { VerificationStep } from "@/lib/mock-data";
import Link from "next/link";
import { Lock, Clock, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOCKED: Lock,
  PENDING: Clock,
  PROCESSING: Loader2,
  SUBMITTED: Send,
  PASSED: CheckCircle2,
  FAILED: XCircle,
};

const STEP_COLORS: Record<string, { icon: string; bg: string; border: string }> = {
  LOCKED: { icon: "text-text-faint", bg: "bg-surface-3", border: "border-border" },
  PENDING: { icon: "text-info", bg: "bg-info/10", border: "border-info/30" },
  PROCESSING: { icon: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  SUBMITTED: { icon: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  PASSED: { icon: "text-success", bg: "bg-success/10", border: "border-success/30" },
  FAILED: { icon: "text-danger", bg: "bg-danger/10", border: "border-danger/30" },
};

interface StepLadderProps {
  steps: VerificationStep[];
  currentStepId?: string | null;
  className?: string;
}

export function StepLadder({ steps, currentStepId, className }: StepLadderProps) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-surface-1", className)}>
      <div className="p-4 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">Step Ladder</p>
      </div>
      <div className="divide-y divide-border" role="list" aria-label="Verification steps">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.status] ?? Clock;
          const colors = STEP_COLORS[step.status] ?? STEP_COLORS.LOCKED;
          const isCurrent = step.id === currentStepId;
          const isClickable = step.status === "PENDING";

          const content = (
            <div
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors",
                isClickable && "hover:bg-surface-2 cursor-pointer",
                isCurrent && "bg-surface-2",
              )}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              {/* Step number + icon */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border", colors.bg, colors.border)}>
                  <Icon className={cn("h-3.5 w-3.5", colors.icon, step.status === "PROCESSING" && "animate-spin")} />
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("w-px h-4", step.status === "PASSED" ? "bg-success/30" : "bg-border")} />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-sm font-medium", step.status === "LOCKED" ? "text-text-faint" : "text-text")}>
                    {step.title}
                  </p>
                  <span className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    colors.bg, colors.border, colors.icon,
                  )}>
                    {step.status}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-4 mt-1 text-[11px] text-text-faint tabular-nums">
                  {step.submittedAt && (
                    <span>Submitted: {new Date(step.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {step.decidedAt && (
                    <span>Decided: {new Date(step.decidedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} by {step.decidedBy}</span>
                  )}
                </div>

                {/* Reason code / notes */}
                {step.reasonCode && (
                  <p className="mt-1 text-[11px] font-mono text-warning">{step.reasonCode}</p>
                )}
                {step.notes && (
                  <p className="mt-0.5 text-[11px] text-text-faint">{step.notes}</p>
                )}
              </div>
            </div>
          );

          if (isClickable) {
            return (
              <Link key={step.id} href={`/verification/steps/${step.id}`}>
                {content}
              </Link>
            );
          }

          return <div key={step.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
