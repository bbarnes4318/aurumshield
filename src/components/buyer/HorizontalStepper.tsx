"use client";

import { cn } from "@/lib/utils";
import {
  Lock,
  Fingerprint,
  Landmark,
  Award,
  Truck,
  Check,
  Loader2,
} from "lucide-react";
import type { BuyerLifecyclePhase } from "@/components/buyer/TransactionProgressSidebar";

/* ================================================================
   HorizontalStepper — 5-step lifecycle progress bar (hero visual)
   ================================================================
   Mobile: overflow-x:auto with hidden scrollbar (swipeable).
   Desktop: fills available width, no scroll.
   ================================================================ */

interface StepDef {
  phase: BuyerLifecyclePhase;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { phase: 1, label: "Inventory Lock",     sublabel: "Gold reserved", icon: Lock },
  { phase: 2, label: "Identity Perimeter", sublabel: "KYC / KYB",    icon: Fingerprint },
  { phase: 3, label: "Capital Activation", sublabel: "Payment",      icon: Landmark },
  { phase: 4, label: "Finality",           sublabel: "Certificate",  icon: Award },
  { phase: 5, label: "Secure Delivery",    sublabel: "Logistics",    icon: Truck },
];

interface HorizontalStepperProps {
  currentPhase: BuyerLifecyclePhase;
  selectedStep: BuyerLifecyclePhase;
  onSelectStep: (phase: BuyerLifecyclePhase) => void;
  timestamps?: (string | null)[];
  className?: string;
}

export function HorizontalStepper({
  currentPhase,
  selectedStep,
  onSelectStep,
  timestamps = [],
  className,
}: HorizontalStepperProps) {
  return (
    <div
      className={cn(
        /* Mobile: horizontal scroll with hidden scrollbar (Condition #3) */
        "overflow-x-auto scrollbar-hidden",
        className,
      )}
    >
      <div
        className="flex items-start min-w-[640px] px-2 py-3"
        role="tablist"
        aria-label="Transaction lifecycle steps"
      >
        {STEPS.map((step, idx) => {
          const isCompleted = step.phase < currentPhase;
          const isCurrent = step.phase === currentPhase;
          const isPending = step.phase > currentPhase;
          const isSelected = step.phase === selectedStep;
          const Icon = step.icon;
          const ts = timestamps[idx] ?? null;

          return (
            <div key={step.phase} className="flex items-start flex-1 min-w-0">
              {/* Step node */}
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${step.label}: ${isCompleted ? "completed" : isCurrent ? "in progress" : "pending"}`}
                onClick={() => onSelectStep(step.phase)}
                className={cn(
                  "flex flex-col items-center gap-1.5 group cursor-pointer",
                  "transition-all duration-200 min-w-[80px]",
                  isSelected && "scale-[1.02]",
                )}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted && "border-success bg-success/10 text-success",
                    isCurrent && !isSelected && "border-gold bg-gold/10 text-gold",
                    isCurrent && isSelected && "border-gold bg-gold/15 text-gold shadow-[0_0_16px_rgba(198,168,107,0.35)]",
                    isPending && !isSelected && "border-border bg-surface-2 text-text-faint",
                    isPending && isSelected && "border-text-faint bg-surface-3 text-text-muted",
                    /* Selection ring for non-current non-completed */
                    isSelected && !isCurrent && !isCompleted && "ring-1 ring-gold/30",
                    isSelected && isCompleted && "ring-1 ring-success/30",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4.5 w-4.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Icon className={cn("h-4 w-4", isPending && "opacity-50")} />
                  )}

                  {/* Active pulse ring */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-20" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-[11px] font-semibold leading-tight whitespace-nowrap",
                      isCompleted && "text-success",
                      isCurrent && "text-gold",
                      isPending && "text-text-faint",
                      isSelected && isPending && "text-text-muted",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[9px] text-text-faint leading-tight mt-0.5 whitespace-nowrap">
                    {step.sublabel}
                  </p>
                  {/* Completed timestamp */}
                  {isCompleted && ts && (
                    <p className="text-[8px] text-text-faint tabular-nums mt-0.5">
                      {new Date(ts).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </button>

              {/* Connector line (not after last step) */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 flex items-center pt-5 px-1 min-w-[20px]">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-colors duration-300",
                      step.phase < currentPhase ? "bg-success/50" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
