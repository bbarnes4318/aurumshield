"use client";

/* ================================================================
   MISSION LAYOUT — Institutional Guided Shell (v3)
   ================================================================
   Full-viewport cinematic layout for the institutional onboarding.
   
   Architecture:
   - Fixed full-screen dark container
   - Gold accent bar at top
   - Compact header with brand + session info
   - FULL-WIDTH center stage (no cramped sidebars)
   - Progress stepper inline in header
   - Trust footer
   - Concierge subtitles overlay (portal)
   ================================================================ */

import {
  type ReactNode,
  useState,
  createContext,
  useContext,
} from "react";
import dynamic from "next/dynamic";
import { AppLogo } from "@/components/app-logo";

/* Lazy-load the subtitles overlay (only needed in demo mode) */
const ConciergeSubtitles = dynamic(
  () =>
    import("@/demo/concierge/ConciergeSubtitles").then(
      (m) => m.ConciergeSubtitles,
    ),
  { ssr: false },
);

/* Lazy-load the tour overlay pill (renders via portal) */
const TourOverlay = dynamic(
  () =>
    import("@/demo/tour-engine/TourOverlay").then(
      (m) => m.TourOverlay,
    ),
  { ssr: false },
);

/* Lazy-load the spotlight ring for highlighted elements */
const GlassShieldSpotlight = dynamic(
  () =>
    import("@/components/demo/GlassShieldSpotlight").then(
      (m) => m.GlassShieldSpotlight,
    ),
  { ssr: false },
);

/* ── Progress Steps ── */
const JOURNEY_STAGES = [
  { key: "WELCOME", label: "Welcome" },
  { key: "ORGANIZATION", label: "Entity" },
  { key: "VERIFICATION", label: "Compliance" },
  { key: "FUNDING", label: "Funding" },
  { key: "FIRST_TRADE_ASSET", label: "Asset" },
  { key: "FIRST_TRADE_DELIVERY", label: "Delivery" },
  { key: "FIRST_TRADE_REVIEW", label: "Review" },
  { key: "FIRST_TRADE_AUTHORIZE", label: "Authorize" },
] as const;

type JourneyStageKey = (typeof JOURNEY_STAGES)[number]["key"];

function getStageIndex(stage: string | undefined): number {
  if (!stage) return 0;
  const idx = JOURNEY_STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 0;
}

/* ── Inline Progress Bar ── */
function InlineProgress({ currentStage }: { currentStage: string }) {
  const currentIdx = getStageIndex(currentStage);

  return (
    <div className="flex items-center gap-1">
      {JOURNEY_STAGES.map((stage, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isCompleted
                  ? "w-6 bg-[#C6A86B]"
                  : isCurrent
                    ? "w-8 bg-[#C6A86B]/60"
                    : "w-3 bg-slate-800"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Context for sidebar injection ── */
interface MissionContextValue {
  setRightSidebar: (content: ReactNode) => void;
}

const MissionContext = createContext<MissionContextValue>({
  setRightSidebar: () => {},
});

export function useMissionLayout() {
  return useContext(MissionContext);
}

/* ── Props ── */
interface MissionLayoutProps {
  currentStage?: JourneyStageKey | string;
  showProgress?: boolean;
  children: ReactNode;
}

export function MissionLayout({
  currentStage = "WELCOME",
  showProgress = true,
  children,
}: MissionLayoutProps) {
  const [rightSidebarContent, setRightSidebarContent] = useState<ReactNode>(null);

  return (
    <MissionContext.Provider value={{ setRightSidebar: setRightSidebarContent }}>
      <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-[#060b18] text-slate-300 font-sans selection:bg-[#C6A86B]/30 selection:text-white">
        {/* ── Ambient glow ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-[1400px] bg-linear-to-b from-[#C6A86B]/4 to-transparent blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-full max-w-[800px] bg-linear-to-t from-[#C6A86B]/3 to-transparent blur-[100px] pointer-events-none" />

        {/* ── Gold accent bar ── */}
        <div className="h-[2px] w-full bg-linear-to-r from-transparent via-[#C6A86B]/70 to-transparent shrink-0" />

        {/* ── Header ── */}
        <header className="shrink-0 border-b border-slate-800/30 bg-[#060b18]/90 backdrop-blur-xl px-8 py-4">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            {/* Left — Brand */}
            <div className="flex items-center gap-4">
              <AppLogo className="h-7 w-auto" variant="dark" />
              <div className="h-5 w-px bg-slate-800/60" />
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.2em]">
                  Secure Session
                </span>
              </div>
            </div>

            {/* Center — Progress */}
            {showProgress && currentStage !== undefined && (
              <InlineProgress currentStage={currentStage} />
            )}

            {/* Right — Session Info */}
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">
                {new Date().toISOString().split("T")[0]}
              </span>
              <div className="h-4 w-px bg-slate-800/40" />
              <span className="font-mono text-[9px] text-[#C6A86B]/50 uppercase tracking-wider">
                Institutional
              </span>
            </div>
          </div>
        </header>

        {/* ── Main Content — Full Width Scrollable ── */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-10 min-h-full">
            {rightSidebarContent ? (
              /* When right sidebar is injected (e.g. verification evidence), use grid */
              <div className="grid grid-cols-12 gap-8 min-h-full">
                <div className="col-span-12 lg:col-span-7 flex flex-col items-center">
                  <div className="w-full max-w-2xl">
                    {children}
                  </div>
                </div>
                <aside className="col-span-5 hidden lg:flex flex-col self-start sticky top-10">
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    {rightSidebarContent}
                  </div>
                </aside>
              </div>
            ) : (
              /* Default: full-width centered content */
              <div className="flex flex-col items-center">
                <div className="w-full max-w-3xl">
                  {children}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Trust Footer ── */}
        <footer className="shrink-0 border-t border-slate-800/20 bg-[#060b18] px-8 py-2.5">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AppLogo className="h-3.5 w-auto opacity-15 filter grayscale" variant="dark" />
              <span className="font-mono text-[8px] text-slate-800 tracking-[0.15em] uppercase">
                Goldwire Settlement Network
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[8px] text-slate-800 uppercase tracking-wider">
                TLS 1.3 · AES-256
              </span>
              <div className="h-3 w-px bg-slate-800/30" />
              <span className="font-mono text-[8px] text-slate-800 uppercase tracking-wider">
                compliance@aurumshield.com
              </span>
            </div>
          </div>
        </footer>

        <ConciergeSubtitles />
        <TourOverlay />
        <GlassShieldSpotlight />
      </div>
    </MissionContext.Provider>
  );
}
