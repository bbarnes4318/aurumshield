"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   Must exude institutional trust and premium quality.

   One headline. Four steps previewed. One action.

   DEMO MODE:
   When ?demo=true is present in the URL, the page auto-starts the
   institutional concierge tour which drives the Gemini Live voice
   agent and the full cinematic UI overlay system.
   ================================================================ */

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { Building2, ShieldCheck, Landmark, BarChart3, Shield, Loader2 } from "lucide-react";
import { useTour } from "@/demo/tour-engine/TourProvider";

/* ── Guided stages (macro framing — preview of what's ahead) ── */
const GUIDED_STAGES = [
  {
    icon: Building2,
    label: "Organization Setup",
    description: "Entity name, jurisdiction, and authorized signatory",
  },
  {
    icon: ShieldCheck,
    label: "Identity Verification",
    description: "KYB, UBO review, and OFAC sanctions screening",
  },
  {
    icon: Landmark,
    label: "Funding Readiness",
    description: "Connect settlement rails — stablecoin or Fedwire",
  },
  {
    icon: BarChart3,
    label: "First Allocation",
    description: "Select an asset, choose custody, and confirm intent",
  },
] as const;

/* ── Demo tour ID — must match the key in TOUR_REGISTRY ── */
const CONCIERGE_TOUR_ID = "institutional-concierge";

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { startTour, state: tourState, concierge } = useTour();

  /* ── Track whether we've already kicked off the tour this mount ── */
  const tourStartedRef = useRef(false);

  /* ── Auto-start the concierge tour when ?demo=true is present ── */
  useEffect(() => {
    if (!isDemo) return;
    if (tourStartedRef.current) return;
    if (tourState.status === "active" && tourState.tourId === CONCIERGE_TOUR_ID) return;

    tourStartedRef.current = true;
    console.info("[Welcome] ?demo=true detected — starting institutional concierge tour");

    // Small delay to let the page render + MissionLayout mount
    // before the tour engine starts navigation
    const timer = setTimeout(() => {
      startTour(CONCIERGE_TOUR_ID);
    }, 400);

    return () => clearTimeout(timer);
  }, [isDemo, startTour, tourState.status, tourState.tourId]);

  /* ── Auto-start the voice concierge once the tour is active ── */
  useEffect(() => {
    if (!isDemo) return;
    if (tourState.status !== "active") return;
    if (tourState.tourId !== CONCIERGE_TOUR_ID) return;
    if (concierge.status !== "idle") return;

    // Give the tour engine time to settle, then start voice
    const voiceTimer = setTimeout(() => {
      console.info("[Welcome] Tour active — starting concierge voice session");
      concierge.startSession().catch((err) => {
        console.warn("[Welcome] Voice session failed to start:", err);
        // Tour overlay will show fallback "click to continue" buttons
      });
    }, 1200);

    return () => clearTimeout(voiceTimer);
  }, [isDemo, tourState.status, tourState.tourId, concierge]);

  /* ── Demo loading state while tour is initializing ── */
  if (isDemo && tourState.status !== "active") {
    return (
      <StepShell
        icon={Shield}
        headline="Initializing Concierge"
        description="Connecting to your dedicated execution concierge…"
      >
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
          <p className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Establishing secure voice channel
          </p>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      icon={Shield}
      headline="Institutional Onboarding"
      description="Complete your compliance review to begin trading physical gold. 4&nbsp;steps&nbsp;·&nbsp;~10&nbsp;minutes."
    >
      {/* ── Macro Progress Framing ── */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 divide-y divide-slate-800/40 overflow-hidden">
          {GUIDED_STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-slate-800/20"
              >
                {/* Step Number + Icon */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80">
                  <Icon className="h-4 w-4 text-[#C6A86B]" strokeWidth={1.5} />
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                    {i + 1}
                  </span>
                </div>

                {/* Step Info */}
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-tight">
                    {stage.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trust Signal ── */}
      <p className="text-[10px] text-slate-600 font-mono tracking-wider uppercase mb-2">
        SOC 2 Compliant · Bank-Grade Encryption · OFAC Screened
      </p>

      {/* ── Primary CTA ── */}
      <StickyPrimaryAction
        label="Get Started"
        href="/institutional/get-started/organization"
      />
    </StepShell>
  );
}
