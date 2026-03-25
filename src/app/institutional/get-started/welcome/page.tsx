"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   Uses the shared guided-flow component system.

   One headline. One explanation. One action.
   Macro progress framing without dashboard clutter.
   ================================================================ */

import { Building2, Shield } from "lucide-react";
import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";

/* ── Guided stages (macro framing — preview of what's ahead) ── */
const GUIDED_STAGES = [
  { label: "Organization Setup", description: "Register your entity" },
  { label: "Verification", description: "KYB and compliance checks" },
  { label: "Funding Readiness", description: "Source of funds and agreements" },
  { label: "First Allocation", description: "Place your first gold position" },
] as const;

export default function WelcomePage() {
  return (
    <StepShell
      icon={Building2}
      headline="Welcome to AurumShield"
      description="We'll guide you through setting up your institutional account in a few simple steps. Each step takes only a few minutes, and your progress is saved automatically."
      footer={
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Bank-Grade Security · End-to-End Encryption
          </span>
        </div>
      }
    >
      {/* ── Macro Progress Framing ── */}
      <div className="w-full max-w-sm mx-auto mb-2">
        <div className="space-y-0">
          {GUIDED_STAGES.map((stage, i) => (
            <div
              key={stage.label}
              className="flex items-center gap-4 px-4 py-3 border-b border-slate-800/50 last:border-0"
            >
              {/* Step Number */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60">
                <span className="font-mono text-xs text-slate-400 font-bold">
                  {i + 1}
                </span>
              </div>

              {/* Step Info */}
              <div className="text-left">
                <p className="text-sm font-medium text-slate-300">
                  {stage.label}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <StickyPrimaryAction
        label="Get Started"
        href="/institutional/get-started/organization"
      />
    </StepShell>
  );
}
