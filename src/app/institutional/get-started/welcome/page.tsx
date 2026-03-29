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


import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  Building2,
  ShieldCheck,
  Landmark,
  BarChart3,
  Shield,
  ArrowRight,
} from "lucide-react";
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

  /* ── Demo mode: real page renders immediately, voice starts in background ── */

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Intro Header ── */}
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C6A86B]/30 bg-slate-900/40 mb-6 shadow-[0_0_40px_rgba(198,168,107,0.12)]">
          <Shield className="h-6 w-6 text-[#C6A86B]" />
        </div>
        <h1 className="text-4xl font-heading font-semibold text-white tracking-tight mb-4">
          Institutional Access
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
          Welcome to the AurumShield Settlement Network. Complete your perimeter integrity checks to begin principal-protected trading.
        </p>
      </div>

      {/* ── Bento Grid Roadmap ── */}
      <div className="grid grid-cols-2 gap-4" data-tour="roadmap-bento">
        {GUIDED_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.label}
              className="group relative flex flex-col p-6 rounded-2xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-sm transition-all hover:border-[#C6A86B]/30 hover:bg-slate-900/60 overflow-hidden"
            >
              {/* Cinematic Background Gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-[#C6A86B]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                {/* Step Number + Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 group-hover:border-[#C6A86B]/40 transition-colors">
                    <Icon className="h-5 w-5 text-[#C6A86B]" strokeWidth={1} />
                  </div>
                  <span className="font-mono text-[10px] text-slate-600 font-bold group-hover:text-[#C6A86B]/60 transition-colors">
                    PHASE {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Step Info */}
                <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-[#C6A86B] transition-colors">
                  {stage.label}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-mono uppercase tracking-wider">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Trust Summary & Perimeter Status ── */}
      <div className="pt-4 border-t border-slate-800/40">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            {[
              { label: "Status", value: "ONLINE", color: "bg-emerald-500" },
              { label: "Security", value: "TLS 1.3", color: "bg-blue-500" },
              { label: "Pipeline", value: "SETTLEMENT V1.2", color: "bg-[#C6A86B]" }
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2">
                <div className={`h-1 w-1 rounded-full ${stat.color} animate-pulse`} />
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">{stat.label}:</span>
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">{stat.value}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase text-center max-w-md opacity-40">
            Authentication established via sovereign-grade encryption protocol. All data is confined to hardened infrastructure.
          </p>
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <div className="pt-2">
        <StickyPrimaryAction
          label="Initialize Onboarding"
          href="/institutional/get-started/organization"
          icon={ArrowRight}
        />
      </div>
    </div>
  );
}
