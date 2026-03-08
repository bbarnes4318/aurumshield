"use client";

/* ================================================================
   /onboarding/compliance — Entity Verification Status
   ================================================================
   Deterministic 3-step KYB verification gate.
   Dark brutalist design matching the Trading Terminal aesthetic.
   
   Steps:
     1. Corporate Identity (UBO & Registration)
     2. AML / OFAC Global Sanctions Screening
     3. Bank Account Ownership Verification
   
   Flow:
     idle → verifying (sequential animation ~3s) → verified (emerald glow)
   ================================================================ */

import { useState, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Building2,
  Search,
  Landmark,
  Check,
  Loader2,
} from "lucide-react";

/* ----------------------------------------------------------------
   Types & Constants
   ---------------------------------------------------------------- */

type VerificationState = "idle" | "verifying" | "verified";

interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: "corporate-identity",
    label: "Corporate Identity",
    description: "UBO & Registration",
    icon: Building2,
  },
  {
    id: "aml-ofac",
    label: "AML / OFAC Screening",
    description: "Global Sanctions Check",
    icon: Search,
  },
  {
    id: "bank-ownership",
    label: "Bank Account Ownership",
    description: "Institutional Account Verification",
    icon: Landmark,
  },
];

/* ================================================================
   COMPONENT
   ================================================================ */

export default function CompliancePage() {
  const [state, setState] = useState<VerificationState>("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ── Cleanup helper ── */
  const clearTimers = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  /* ── Initiate verification flow ── */
  const handleInitiate = useCallback(() => {
    if (state === "verifying" || state === "verified") return;

    clearTimers();
    setState("verifying");
    setActiveStepIndex(0);
    setCompletedSteps(new Set());
    setProgress(0);

    const stepDuration = 1000; // 1s per step

    CHECKLIST_STEPS.forEach((step, idx) => {
      // Start progress for this step
      const progressStart = animationRef.current.length;
      void progressStart; // suppress unused

      // Mark step as active
      const activateTimer = setTimeout(() => {
        setActiveStepIndex(idx);
        // Animate progress bar
        setProgress(((idx) / CHECKLIST_STEPS.length) * 100);
      }, idx * stepDuration);
      animationRef.current.push(activateTimer);

      // Mark step as complete
      const completeTimer = setTimeout(() => {
        setCompletedSteps((prev) => {
          const next = new Set(prev);
          next.add(step.id);
          return next;
        });
        setProgress(((idx + 1) / CHECKLIST_STEPS.length) * 100);
      }, (idx + 1) * stepDuration - 200);
      animationRef.current.push(completeTimer);
    });

    // Final: resolve to verified
    const finalTimer = setTimeout(() => {
      setActiveStepIndex(-1);
      setState("verified");
      setProgress(100);
    }, CHECKLIST_STEPS.length * stepDuration + 100);
    animationRef.current.push(finalTimer);
  }, [state, clearTimers]);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center bg-slate-950 px-4 py-12">
      {/* ── Main card ── */}
      <div
        className={`
          w-full max-w-[580px] rounded-2xl border bg-slate-950/80 px-8 py-10 shadow-2xl backdrop-blur-sm
          transition-all duration-700 ease-out
          ${state === "verified"
            ? "border-emerald-500/40 shadow-emerald-500/10"
            : "border-slate-700/50 shadow-slate-900/50"
          }
        `}
      >
        {/* ── Header ── */}
        <div className="flex flex-col items-center text-center mb-10">
          <div
            className={`
              flex h-16 w-16 items-center justify-center rounded-full mb-5
              transition-all duration-700
              ${state === "verified"
                ? "bg-emerald-500/15 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                : "bg-slate-800/80"
              }
            `}
          >
            <ShieldCheck
              className={`
                h-8 w-8 transition-colors duration-700
                ${state === "verified" ? "text-emerald-400" : "text-slate-400"}
              `}
            />
          </div>

          <h1 className="text-xl font-semibold text-slate-100 tracking-tight mb-1 font-mono">
            Entity Verification Status
          </h1>

          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            {state === "verified"
              ? "All compliance checks cleared. Your entity is verified."
              : "Complete KYB verification to access the settlement network."}
          </p>
        </div>

        {/* ── VERIFIED Badge ── */}
        {state === "verified" && (
          <div className="flex justify-center mb-8 animate-in fade-in duration-500">
            <span
              className="
                inline-flex items-center gap-2 rounded-full border border-emerald-500/30
                bg-emerald-500/10 px-5 py-2 font-mono text-sm font-bold uppercase
                tracking-[0.2em] text-emerald-400
                shadow-[0_0_20px_rgba(16,185,129,0.15)]
              "
            >
              <Check className="h-4 w-4" />
              VERIFIED
            </span>
          </div>
        )}

        {/* ── Progress Bar (during verification) ── */}
        {state === "verifying" && (
          <div className="mb-8">
            <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── 3-Step Checklist ── */}
        <div className="space-y-3">
          {CHECKLIST_STEPS.map((step, idx) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = state === "verifying" && activeStepIndex === idx;
            const isVerified = state === "verified";
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 rounded-xl border px-5 py-4
                  transition-all duration-500 ease-out
                  ${isVerified || isComplete
                    ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                    : isActive
                      ? "border-amber-500/30 bg-amber-500/[0.04]"
                      : "border-slate-700/40 bg-slate-900/40"
                  }
                `}
              >
                {/* Step status icon */}
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                    transition-all duration-500
                    ${isVerified || isComplete
                      ? "bg-emerald-500/15"
                      : isActive
                        ? "bg-amber-500/15"
                        : "bg-slate-800"
                    }
                  `}
                >
                  {isVerified || isComplete ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5 text-slate-500" />
                  )}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`
                      text-sm font-medium tracking-wide transition-colors duration-500
                      ${isVerified || isComplete
                        ? "text-emerald-300"
                        : isActive
                          ? "text-amber-300"
                          : "text-slate-300"
                      }
                    `}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Right-side status indicator */}
                <div className="shrink-0">
                  {isVerified || isComplete ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500">
                      Passed
                    </span>
                  ) : isActive ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 animate-pulse">
                      Checking…
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CTA Button ── */}
        <div className="mt-10 flex justify-center">
          {state === "verified" ? (
            <button
              type="button"
              disabled
              className="
                inline-flex items-center gap-3 rounded-xl
                border border-emerald-500/30 bg-emerald-500/10
                px-10 py-4 font-mono text-sm font-bold uppercase tracking-wider
                text-emerald-400 cursor-default
                shadow-[0_0_24px_rgba(16,185,129,0.12)]
              "
            >
              <ShieldCheck className="h-5 w-5" />
              Entity Verified
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInitiate}
              disabled={state === "verifying"}
              className="
                group relative inline-flex items-center gap-3 rounded-xl
                border border-slate-600/50 bg-slate-800/80
                px-10 py-4 font-mono text-sm font-bold uppercase tracking-wider
                text-slate-200 transition-all duration-200
                hover:border-slate-500/60 hover:bg-slate-700/80 hover:text-white
                hover:shadow-lg hover:shadow-slate-900/50
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-600/50
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40
                focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
              "
            >
              {state === "verifying" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying Entity…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 transition-transform group-hover:scale-110" />
                  Initiate KYB Verification
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Trust Footer ── */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600">
          <ShieldCheck className="h-3 w-3 text-slate-700" />
          <span>256-bit TLS · SOC 2 Compliant · FinCEN Registered</span>
        </div>
      </div>
    </div>
  );
}
