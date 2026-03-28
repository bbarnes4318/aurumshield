"use client";

/* ================================================================
   DEMO GUIDE OVERLAY — Active Guided Demo Pipeline (Vapi Voice)

   Architecture:
   1. ONLY renders when URL contains ?demo=active
   2. Auto-starts the Vapi voice call on mount
   3. Shows a RAILROAD progress bar at the top with the demo sequence
   4. Voice guide auto-injects context on every route change
   5. NO "Next Step" buttons — tour advances via native page buttons

   Demo Sequence (Institutional Portal — 5 Steps):
   /institutional/get-started/welcome → /institutional/get-started/verification →
   /institutional/marketplace → /institutional/orders →
   /institutional/compliance

   Design: AurumShield institutional gold/slate palette.
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Radio,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";
import { DEMO_TOUR_STEPS, getDemoStepIndex } from "@/hooks/use-demo-tour";

/* ---------- Helper: find current step index ---------- */
function getCurrentStepIndex(pathname: string): number {
  return getDemoStepIndex(pathname);
}

export function DemoGuideOverlay() {
  const {
    callStatus,
    volumeLevel,
    transcript,
    activeLanguage,
    startCall,
    stopCall,
    injectContext,
  } = useVapi();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isDemoActive = searchParams.get("demo") === "active";
  const autoStarted = useRef(false);

  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedLang] = useState("English");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const currentStepIdx = getCurrentStepIndex(pathname);
  const redirected = useRef(false);

  /* ── Auto-Redirect: If ?demo=active but NOT on a demo step, redirect ── */
  useEffect(() => {
    if (!isDemoActive) return;
    if (redirected.current) return;
    if (currentStepIdx >= 0) return; // Already on a demo step

    redirected.current = true;
    router.replace(`${DEMO_TOUR_STEPS[0].path}?demo=active`);
  }, [isDemoActive, currentStepIdx, router]);

  /* ── Auto-Start: Begin Vapi call when ?demo=active lands ── */
  useEffect(() => {
    if (!isDemoActive) return;
    if (autoStarted.current) return;
    if (callStatus !== "inactive") return;

    autoStarted.current = true;
    const t = setTimeout(() => {
      startCall(selectedLang);
    }, 800);
    return () => clearTimeout(t);
  }, [isDemoActive, callStatus, startCall, selectedLang]);

  /* ── Routing Engine — Dynamic Context Injection ── */
  useEffect(() => {
    if (callStatus !== "active") return;

    const langSuffix =
      " DELIVER THIS EXPLANATION EXCLUSIVELY IN " + activeLanguage + ".]";

    if (pathname.includes("/institutional/get-started/welcome")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Institutional Welcome Screen. Welcome them to the AurumShield institutional demo. Explain that they must complete identity verification and entity registration to establish their institutional perimeter. Guide them through the onboarding steps." +
          langSuffix
      );
    } else if (pathname.includes("/institutional/get-started/verification")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Verification Screen. Explain that Veriff ensures OFAC compliance and performs biometric liveness detection for all Ultimate Beneficial Owners. The corporate entity is validated against GLEIF registries. Once verification clears, they can proceed to the institutional marketplace." +
          langSuffix
      );
    } else if (pathname.includes("/institutional/marketplace")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Marketplace. Explain the Bloomberg B-PIPE real-time pricing, the 400-oz Good Delivery bars sourced from LBMA-accredited refiners, and that all inventory is held at Malca-Amit sovereign vaults. Tell them to select the 400-oz bar and click 'INITIATE EXECUTION QUOTE' to generate a cryptographic 30-second price lock." +
          langSuffix
      );
    } else if (pathname.includes("/institutional/orders")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Orders & Execution page. Explain that they are viewing their Institutional Allocation Ledger showing all settlement positions. Walk them through the dual-authorization gate where both the Maker and Checker must approve, followed by the WebAuthn biometric signing ceremony. After execution, they will see the Fedwire clearing hash and ERC-3643 title transfer. Congratulate them on completing the full AurumShield institutional demo. Remind them to book a consultation at aurumshield.com to discuss their sovereign gold acquisition strategy." +
          langSuffix
      );
    } else if (pathname.includes("/institutional/compliance")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Compliance page. Explain the institutional compliance dashboard showing AML/KYB status, audit trails, and regulatory framework adherence." +
          langSuffix
      );
    } else if (currentStepIdx < 0) {
      injectContext(
        "[SYSTEM EVENT: User just arrived. Briefly welcome them and let them know you are redirecting them to the institutional demo starting with the welcome screen." +
          langSuffix
      );
    }
  }, [pathname, callStatus, activeLanguage, injectContext, currentStepIdx]);

  /* Auto-scroll transcript feed */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  /* ── Don't render if demo is not active ── */
  if (!isDemoActive) return null;

  /* ---- Render: Railroad + Voice Panel (NO next-step CTA) ---- */
  return (
    <>
      {/* ── RAILROAD PROGRESS BAR (top of screen) ── */}
      <div className="fixed top-0 left-0 right-0 z-120 bg-slate-950/95 backdrop-blur-md border-b border-gold/20">
        <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {DEMO_TOUR_STEPS.map((step, idx) => {
              const isActive = idx === currentStepIdx;
              const isComplete = idx < currentStepIdx;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-gold/15 border border-gold/40 text-gold"
                        : isComplete
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-slate-900 border border-slate-800 text-slate-600"
                    }`}
                  >
                    <span className="font-mono">
                      {isComplete ? "✓" : `0${idx + 1}`}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {idx < DEMO_TOUR_STEPS.length - 1 && (
                    <div
                      className={`w-4 h-px mx-0.5 ${
                        isComplete ? "bg-emerald-500/50" : "bg-slate-800"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              stopCall();
              router.push("/");
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border border-slate-800 hover:text-white hover:border-slate-600 transition-all"
          >
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">Exit Demo</span>
          </button>
        </div>
      </div>

      {/* ── VOICE PANEL (bottom-right) ── */}
      <div className="fixed bottom-4 right-4 z-120 w-80">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
              {/* Status indicator */}
              <div className="relative flex items-center justify-center">
                {callStatus === "active" && (
                  <div
                    className="absolute inset-0 rounded-full border border-gold/40"
                    style={{
                      transform: `scale(${1 + volumeLevel * 0.6})`,
                      opacity: 0.3 + volumeLevel * 0.7,
                      transition:
                        "transform 0.1s ease-out, opacity 0.1s ease-out",
                    }}
                  />
                )}
                <div
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                    callStatus === "active"
                      ? "bg-gold/20 text-gold"
                      : "animate-pulse bg-gold/10 text-gold/60"
                  }`}
                >
                  {callStatus === "active" ? (
                    <Radio className="h-3 w-3" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">
                  {callStatus === "loading"
                    ? "Connecting…"
                    : callStatus === "active"
                      ? "Voice Guide Active"
                      : "Demo Guide"}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500">
                  {callStatus === "loading"
                    ? "Establishing link"
                    : callStatus === "active"
                      ? activeLanguage
                      : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize toggle */}
              <button
                onClick={() => setIsMinimized((p) => !p)}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {/* End call */}
              <button
                onClick={() => {
                  stopCall();
                  router.push("/");
                }}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="End Demo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Transcript Feed ── */}
          {!isMinimized && (
            <div className="max-h-48 overflow-y-auto px-4 py-3">
              {transcript.length === 0 ? (
                <p className="text-center font-mono text-[10px] text-slate-500 italic">
                  {callStatus === "loading"
                    ? "Initializing voice guide…"
                    : callStatus === "active"
                      ? "Waiting for assistant…"
                      : "Starting demo…"}
                </p>
              ) : (
                <div className="space-y-2">
                  {transcript.map((entry, idx) => (
                    <div key={idx} className="group">
                      <p className="font-mono text-[10px] leading-relaxed text-slate-400">
                        {entry.text}
                      </p>
                      <p className="mt-0.5 text-right font-mono text-[8px] tabular-nums text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          )}

          {/* ── Footer Controls ── */}
          {!isMinimized && callStatus === "active" && (
            <div className="border-t border-slate-800 px-4 py-2.5">
              <button
                onClick={() => {
                  stopCall();
                  router.push("/");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] font-semibold text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10"
              >
                <MicOff className="h-3 w-3" />
                <span>End Demo</span>
              </button>
            </div>
          )}

          {/* ── Inactive footer (call ended) ── */}
          {!isMinimized &&
            callStatus === "inactive" &&
            transcript.length > 0 && (
              <div className="border-t border-slate-800 px-4 py-2.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => startCall(selectedLang)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[11px] font-semibold text-gold transition-all hover:border-gold/50 hover:bg-gold/10"
                  >
                    <Mic className="h-3 w-3" />
                    <span>Restart Guide</span>
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="flex items-center justify-center rounded-lg border border-slate-800 px-3 py-2 text-[11px] text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
                    title="Exit Demo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
