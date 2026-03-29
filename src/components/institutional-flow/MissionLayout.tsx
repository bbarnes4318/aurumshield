"use client";
 
/* ================================================================
   MISSION LAYOUT — Institutional Guided Journey Shell
   ================================================================
   AUTHORITATIVE UI: This is the high-fidelity wrapper for the
   institutional onboarding and First Trade experience.
 
   BRUTALIST PRINCIPLES:
     1. Zero-Scroll Viewport: Uses h-screen and overflow-hidden.
     2. Monospaced Rigidity: Financial and mission data in JetBrains Mono.
     3. Cinematic Depth: Slow pulses, glassmorphism, and perimeter glows.
     4. High Density: Integrated sidebars for telemetry and roadmap.
 
   REUSABLE FOR:
     /get-started/welcome
     /get-started/organization
     /get-started/verification
     /get-started/funding
     /first-trade/layout.tsx (future)
   ================================================================ */
 
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AppLogo } from "@/components/app-logo";
import { SimpleProgress } from "@/components/institutional-flow/SimpleProgress";
import { type InstitutionalJourneyStage } from "@/lib/schemas/institutional-journey-schema";
 
import dynamic from "next/dynamic";
const ConciergeSubtitles = dynamic(() => import("@/demo/concierge/ConciergeSubtitles").then(m => m.ConciergeSubtitles), { ssr: false });
 
/* ── Context for Sidebar Injection ── */
interface MissionContextValue {
  setRightSidebar: (content: ReactNode) => void;
}
 
const MissionContext = createContext<MissionContextValue | undefined>(undefined);
 
export function useMissionLayout() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMissionLayout must be used within MissionLayout");
  return ctx;
}
 
interface MissionLayoutProps {
  currentStage?: InstitutionalJourneyStage;
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
      <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-slate-950 text-slate-300 font-sans selection:bg-[#C6A86B]/30 selection:text-white">
        {/* ── Perimeter Glow ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-full max-w-[1200px] bg-linear-to-b from-[#C6A86B]/5 to-transparent blur-[120px] pointer-events-none" />
        
        {/* ── Top Bar ── */}
        <div className="h-0.5 w-full bg-linear-to-r from-[#C6A86B]/0 via-[#C6A86B]/60 to-[#C6A86B]/0 shrink-0" />
 
        {/* ── Header ── */}
        <header className="shrink-0 border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-md px-8 py-5">
          <div className="mx-auto flex items-center justify-between">
            {/* Left — Mission Context (Monospace) */}
            <div className="w-64 hidden lg:inline-flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#C6A86B] animate-pulse" />
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                Mission: Perimeter Integrity
              </span>
            </div>
 
            {/* Center — Authoritative Brand Mark */}
            <div className="flex-1 flex justify-center">
              <AppLogo className="h-8 w-auto" variant="dark" />
            </div>
 
            {/* Right — Active Session Telemetry */}
            <div className="w-64 flex justify-end">
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-[9px] text-[#C6A86B] uppercase tracking-wider">
                  Authorized Session
                </span>
                <span className="font-mono text-[10px] text-slate-500 uppercase">
                  {new Date().toISOString().split('T')[0]} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </header>
 
        {/* ── Main Content — Wide-Screen Bento Layout ── */}
        {/* NO SCROLL. Content MUST fit viewport. */}
        <main className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
          <div className="mx-auto h-full grid grid-cols-12 gap-8 max-w-[1600px]">
            
            {/* ── Left Sidebar (3/12) — Journey Roadmap ── */}
            <aside className="col-span-3 h-full hidden xl:flex flex-col gap-6">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-6 backdrop-blur-sm">
                <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-6">
                  — Onboarding Roadmap
                </h3>
                {showProgress && currentStage !== undefined && (
                  <SimpleProgress currentStage={currentStage} />
                )}
              </div>
 
              <div className="rounded-xl border border-slate-800/30 bg-slate-900/5 p-6 mt-auto">
                <p className="font-mono text-[9px] text-slate-600 leading-relaxed uppercase tracking-widest">
                  &quot;Our deterministic settlement engine eliminates principal risk via atomic delivery-versus-payment escrow.&quot;
                </p>
              </div>
            </aside>
 
            {/* ── Center Stage (6/12) — Core Action Area ── */}
            <section className="col-span-12 xl:col-span-6 h-full flex flex-col items-center justify-start py-4">
              <div className="w-full max-w-2xl">
                {children}
              </div>
            </section>
 
            {/* ── Right Sidebar (3/12) — Institutional Trust or Injected Content ── */}
            <aside className="col-span-3 h-full hidden xl:flex flex-col gap-6">
              {rightSidebarContent ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full overflow-hidden">
                  {rightSidebarContent}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-6 backdrop-blur-sm">
                    <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4">
                      — Guardrails & Security
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: "Encryption", value: "AES-256-GCM" },
                        { label: "Integrity", value: "SOC 2 Type II" },
                        { label: "Custody", value: "Qualified Vault" },
                        { label: "Settlement", value: "T+0 Deterministic" }
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</span>
                          <span className="font-mono text-[10px] text-slate-400">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
 
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-6">
                    <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-3">
                      — Live Ops Desk
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Your dedicated compliance officer is on standby for real-time approval acceleration.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-medium text-slate-400">Response time: &lt; 2m</span>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </main>
 
        {/* ── Trust Footer ── */}
        <footer className="shrink-0 border-t border-slate-800/30 bg-slate-950 px-8 py-3 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <AppLogo className="h-4 w-auto opacity-20 filter grayscale hover:opacity-40 transition-opacity" variant="dark" />
              <div className="h-3 w-px bg-slate-800" />
              <span className="font-mono text-[9px] text-slate-700 tracking-[0.2em] uppercase">
                Operational Sovereignty Engine v1.216
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
               TLS 1.3 · End-to-End Encrypted Session · Support: compliance@aurumshield.com
            </p>
          </div>
        </footer>
 
        <ConciergeSubtitles />
      </div>
    </MissionContext.Provider>
  );
}
