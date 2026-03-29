"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   Must hit like a private bank entrance — sovereign, premium,
   and absolutely unmistakable authority.
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
  Lock,
  Fingerprint,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { useTour } from "@/demo/tour-engine/TourProvider";

/* ── Guided stages ── */
const GUIDED_STAGES = [
  {
    icon: Building2,
    label: "Entity Registration",
    description: "Corporate identity, jurisdiction of registration, and compliance case opening",
    detail: "40+ jurisdictions · SPVs, trusts, and offshore structures supported",
  },
  {
    icon: ShieldCheck,
    label: "KYB Compliance Perimeter",
    description: "8-document entity verification, UBO identification, and multi-jurisdiction AML screening",
    detail: "7 sanctions lists · OFAC · EU · UN · UK HMT · Chainalysis KYT",
  },
  {
    icon: Landmark,
    label: "Settlement Rail Configuration",
    description: "Select your clearing path — T+0 stablecoin bridge or Fedwire RTGS correspondent banking",
    detail: "USDC/USDT on Ethereum · Fedwire with 30-45 day underwriting",
  },
  {
    icon: BarChart3,
    label: "Asset Selection & Execution",
    description: "LBMA Good Delivery bars, allocated vault custody, and deterministic settlement",
    detail: "400oz bars · Zurich · London · Singapore · New York · Dubai",
  },
] as const;

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Principal Market Maker",
    stat: "Zero",
    statLabel: "Intermediary Risk",
    detail: "You buy from a single, legally accountable counterparty. Not a broker. Not a marketplace. Not a decentralized protocol.",
  },
  {
    icon: Fingerprint,
    title: "Allocated Custody",
    stat: "100%",
    statLabel: "Segregated",
    detail: "Your specific, serialized bars are physically separated under bailment law. If the custodian fails, your gold is untouchable by creditors.",
  },
  {
    icon: Truck,
    title: "Physical Redemption",
    stat: "T+0",
    statLabel: "Liquidation",
    detail: "Your gold is never trapped. Armored delivery via Brink's Global Services, or instant liquidation to fiat at live spot.",
  },
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
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ══════════════════════════════════════════════════════════
         HERO — The sovereign entrance
         ══════════════════════════════════════════════════════════ */}
      <div className="relative text-center py-6">
        {/* Radial gold glow behind the shield */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[200px] bg-[#C6A86B]/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-[#C6A86B]/40 bg-gradient-to-b from-[#C6A86B]/15 to-transparent mb-6 shadow-[0_0_60px_rgba(198,168,107,0.15)]">
            <Shield className="h-8 w-8 text-[#C6A86B]" strokeWidth={1.2} />
          </div>

          <h1 className="text-3xl font-heading font-bold text-white tracking-tight mb-2">
            Institutional Access
          </h1>

          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#C6A86B]/60" />
            <span className="font-mono text-[10px] text-[#C6A86B] tracking-[0.3em] uppercase font-bold">
              Sovereign Gold Settlement Infrastructure
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#C6A86B]/60" />
          </div>

          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Complete your perimeter integrity checks to begin principal-protected
            trading on the Goldwire Settlement Network.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         TRUST PILLARS — Three columns with stats
         ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">
        {TRUST_PILLARS.map((pillar) => {
          const PillarIcon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="group relative border border-slate-800/60 bg-gradient-to-b from-slate-900/60 to-slate-950/60 p-5 hover:border-[#C6A86B]/20 transition-all duration-500 overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#C6A86B]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center border border-[#C6A86B]/20 bg-[#C6A86B]/5">
                    <PillarIcon className="h-4 w-4 text-[#C6A86B]" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-white font-bold tabular-nums leading-none">
                      {pillar.stat}
                    </div>
                    <div className="font-mono text-[8px] text-[#C6A86B]/60 tracking-wider uppercase">
                      {pillar.statLabel}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-mono text-[10px] text-white font-bold tracking-wider uppercase mb-1.5">
                    {pillar.title}
                  </h3>
                  <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
                    {pillar.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
         ONBOARDING PHASES — Four cards with depth
         ══════════════════════════════════════════════════════════ */}
      <div data-tour="roadmap-bento">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-[#C6A86B]/20 to-transparent" />
          <span className="font-mono text-[9px] text-slate-600 tracking-[0.2em] uppercase shrink-0">
            Onboarding Phases
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-[#C6A86B]/20 to-transparent" />
        </div>

        <div className="space-y-2">
          {GUIDED_STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className="group flex items-start gap-4 p-4 border border-slate-800/40 bg-slate-900/20 hover:border-[#C6A86B]/20 hover:bg-slate-900/40 transition-all duration-300"
              >
                {/* Phase number + icon */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[9px] text-slate-700 font-bold w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center border border-slate-800 bg-slate-950 group-hover:border-[#C6A86B]/30 transition-colors">
                    <Icon className="h-4.5 w-4.5 text-[#C6A86B]" strokeWidth={1.2} />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-xs text-white font-bold tracking-wide mb-0.5 group-hover:text-[#C6A86B] transition-colors">
                    {stage.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-1">
                    {stage.description}
                  </p>
                  <p className="font-mono text-[9px] text-slate-600 tracking-wider">
                    {stage.detail}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-[#C6A86B]/60 shrink-0 mt-1 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         PERIMETER STATUS
         ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-center gap-8 py-2">
        {[
          { label: "Status", value: "ONLINE", color: "bg-emerald-500" },
          { label: "Security", value: "TLS 1.3 / AES-256", color: "bg-blue-500" },
          { label: "Engine", value: "GOLDWIRE V2.1", color: "bg-[#C6A86B]" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${stat.color} animate-pulse`} />
            <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
              {stat.label}:
            </span>
            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
         PRIMARY CTA
         ══════════════════════════════════════════════════════════ */}
      <StickyPrimaryAction
        label="Initialize Onboarding"
        href="/institutional/get-started/organization"
        icon={ArrowRight}
      />
    </div>
  );
}
