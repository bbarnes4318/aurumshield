"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   ZERO SCROLL. Single viewport. The voice does the talking,
   the screen provides gravitas and a single clear CTA.
   ================================================================ */

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  Shield,
  ArrowRight,
  Lock,
  Fingerprint,
  Truck,
} from "lucide-react";
import { useTour } from "@/demo/tour-engine/TourProvider";

/* ── Trust pillars — compact single-line format ── */
const TRUST_PILLARS = [
  { icon: Lock, label: "Principal Market Maker", stat: "Zero Intermediary Risk" },
  { icon: Fingerprint, label: "Allocated Custody", stat: "100% Segregated" },
  { icon: Truck, label: "Physical Redemption", stat: "T+0 Liquidation" },
] as const;

/* ── Demo tour ID ── */
const CONCIERGE_TOUR_ID = "institutional-concierge";

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { startTour, state: tourState, concierge } = useTour();

  const tourStartedRef = useRef(false);

  /* ── Auto-start concierge tour when ?demo=true ── */
  useEffect(() => {
    if (!isDemo) return;
    if (tourStartedRef.current) return;
    if (tourState.status === "active" && tourState.tourId === CONCIERGE_TOUR_ID) return;

    tourStartedRef.current = true;
    console.info("[Welcome] ?demo=true detected — starting institutional concierge tour");

    const timer = setTimeout(() => {
      startTour(CONCIERGE_TOUR_ID);
    }, 400);

    return () => clearTimeout(timer);
  }, [isDemo, startTour, tourState.status, tourState.tourId]);

  /* ── Auto-start voice once tour is active ── */
  useEffect(() => {
    if (!isDemo) return;
    if (tourState.status !== "active") return;
    if (tourState.tourId !== CONCIERGE_TOUR_ID) return;
    if (concierge.status !== "idle") return;

    const voiceTimer = setTimeout(() => {
      console.info("[Welcome] Tour active — starting concierge voice session");
      concierge.startSession().catch((err) => {
        console.warn("[Welcome] Voice session failed to start:", err);
      });
    }, 1200);

    return () => clearTimeout(voiceTimer);
  }, [isDemo, tourState.status, tourState.tourId, concierge]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ══════════════════════════════════════════════════════════
         HERO — Centered, dominant, single-viewport
         ══════════════════════════════════════════════════════════ */}
      <div className="relative text-center -mt-8">
        {/* Radial gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-[#C6A86B]/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative space-y-6">
          {/* Shield icon */}
          <div className="inline-flex h-20 w-20 items-center justify-center border-2 border-[#C6A86B]/30 bg-linear-to-b from-[#C6A86B]/10 to-transparent shadow-[0_0_80px_rgba(198,168,107,0.12)]">
            <Shield className="h-10 w-10 text-[#C6A86B]" strokeWidth={1} />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-heading font-bold text-white tracking-tight mb-3">
              Institutional Access
            </h1>

            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-linear-to-r from-transparent to-[#C6A86B]/50" />
              <span className="font-mono text-[10px] text-[#C6A86B] tracking-[0.3em] uppercase font-bold">
                Sovereign Gold Settlement Infrastructure
              </span>
              <div className="h-px w-10 bg-linear-to-l from-transparent to-[#C6A86B]/50" />
            </div>

            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Deterministic institutional gold settlement. Principal market making with
              zero intermediary risk. Allocated physical custody under bailment law.
            </p>
          </div>

          {/* ── Trust pillars — compact horizontal row ── */}
          <div className="flex items-center justify-center gap-6 pt-4">
            {TRUST_PILLARS.map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <div
                  key={pillar.label}
                  className="flex items-center gap-2.5 px-4 py-2.5 border border-slate-800/50 bg-slate-900/30"
                >
                  <PillarIcon className="h-4 w-4 text-[#C6A86B]/70" strokeWidth={1.5} />
                  <div className="text-left">
                    <div className="font-mono text-[9px] text-white font-bold tracking-wider uppercase">
                      {pillar.label}
                    </div>
                    <div className="font-mono text-[8px] text-[#C6A86B]/50 tracking-wider uppercase">
                      {pillar.stat}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Perimeter status line ── */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {[
              { label: "Status", value: "ONLINE", color: "bg-emerald-500" },
              { label: "Security", value: "TLS 1.3 / AES-256", color: "bg-blue-500" },
              { label: "Engine", value: "GOLDWIRE V2.1", color: "bg-[#C6A86B]" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <div className={`h-1 w-1 rounded-full ${stat.color} animate-pulse`} />
                <span className="font-mono text-[8px] text-slate-700 uppercase tracking-widest">
                  {stat.label}: {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="pt-4">
            <StickyPrimaryAction
              label="Initialize Onboarding"
              href={isDemo ? "/institutional/get-started/organization?demo=true" : "/institutional/get-started/organization"}
              icon={ArrowRight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
