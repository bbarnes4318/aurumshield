"use client";

/* ================================================================
   SIMPLE PROGRESS — Macro-stage progress indicator
   ================================================================
   Shows 3 high-level phases, not the 9 individual stages.
   Calm, unobtrusive horizontal dots with connecting lines.

   Phases:
     1. Getting Started (WELCOME → FUNDING)
     2. First Trade (FIRST_TRADE_ASSET → FIRST_TRADE_SUCCESS)
     3. Complete
   ================================================================ */

import { Check } from "lucide-react";
import {
  getPhaseForStage,
  type InstitutionalJourneyStage,
} from "@/lib/schemas/institutional-journey-schema";

/* ── Phase definitions ── */

interface PhaseDefinition {
  key: string;
  label: string;
}

const PHASES: PhaseDefinition[] = [
  { key: "GETTING_STARTED", label: "Getting Started" },
  { key: "FIRST_TRADE", label: "First Trade" },
  { key: "COMPLETE", label: "Complete" },
];

/* ── Resolve which phase index we're on ── */

function resolvePhaseIndex(stage: InstitutionalJourneyStage | null): number {
  if (!stage) return 2; // null stage = skip guided, effectively complete
  if (stage === "FIRST_TRADE_SUCCESS") return 2; // terminal
  const phase = getPhaseForStage(stage);
  if (phase === "GETTING_STARTED") return 0;
  return 1; // FIRST_TRADE
}

/* ── Component ── */

interface SimpleProgressProps {
  /** Current journey stage — null means journey is complete */
  currentStage: InstitutionalJourneyStage | null;
}

export function SimpleProgress({ currentStage }: SimpleProgressProps) {
  const activeIndex = resolvePhaseIndex(currentStage);

  return (
    <div
      className="flex items-center justify-center gap-0"
      role="progressbar"
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-label="Journey progress"
    >
      {PHASES.map((phase, i) => {
        const isComplete = i < activeIndex;
        const isCurrent = i === activeIndex;

        return (
          <div key={phase.key} className="flex items-center">
            {/* Connector line (before, except first) */}
            {i > 0 && (
              <div
                className={`
                  h-px w-8 sm:w-12 transition-colors duration-300
                  ${isComplete || isCurrent ? "bg-[#C6A86B]/40" : "bg-slate-800"}
                `}
              />
            )}

            {/* Dot + Label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full
                  transition-all duration-300 border
                  ${
                    isComplete
                      ? "bg-[#C6A86B]/15 border-[#C6A86B]/40"
                      : isCurrent
                        ? "bg-[#C6A86B]/10 border-[#C6A86B]/50 shadow-[0_0_12px_rgba(198,168,107,0.15)]"
                        : "bg-slate-900/50 border-slate-800"
                  }
                `}
              >
                {isComplete ? (
                  <Check className="h-3 w-3 text-[#C6A86B]" />
                ) : (
                  <div
                    className={`
                      h-1.5 w-1.5 rounded-full
                      ${isCurrent ? "bg-[#C6A86B]" : "bg-slate-700"}
                    `}
                  />
                )}
              </div>
              <span
                className={`
                  font-mono text-[9px] tracking-wider uppercase whitespace-nowrap
                  ${
                    isComplete
                      ? "text-[#C6A86B]/60"
                      : isCurrent
                        ? "text-[#C6A86B]/80"
                        : "text-slate-700"
                  }
                `}
              >
                {phase.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
