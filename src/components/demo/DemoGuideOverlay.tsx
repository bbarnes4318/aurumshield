"use client";

/* ================================================================
   DEMO GUIDE OVERLAY — Active Guided Demo Pipeline (Vapi Voice)

   Architecture:
   1. ONLY renders when URL contains ?demo=active
   2. Auto-starts the Vapi voice call on mount (no double-click)
   3. Shows a RAILROAD progress bar at the top with the demo sequence
   4. Highlights the "Next Step" button the user needs to click
   5. Voice guide auto-injects context on every route change

   Demo Sequence:
   /perimeter/verify → /offtaker/marketplace → /checkout → /settlements

   Design: AurumShield institutional gold/slate palette.
   ================================================================ */

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Radio,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";

/* ---------- Cartesia Supported Languages ---------- */
const SUPPORTED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Polish",
  "Russian",
  "Chinese",
  "Japanese",
  "Korean",
  "Hindi",
  "Turkish",
  "Swedish",
];

/* ---------- Demo Railroad Sequence ---------- */
const DEMO_STEPS = [
  {
    id: "verify",
    label: "Verify Identity",
    path: "/perimeter/verify",
    nextLabel: "Proceed to Marketplace →",
    nextPath: "/offtaker/marketplace?demo=active",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "/offtaker/marketplace",
    nextLabel: "Execute Trade →",
    nextPath: "/checkout?demo=active",
  },
  {
    id: "checkout",
    label: "Checkout",
    path: "/checkout",
    nextLabel: "View Settlement →",
    nextPath: "/settlements?demo=active",
  },
  {
    id: "settlements",
    label: "Settlement Ledger",
    path: "/settlements",
    nextLabel: "",
    nextPath: "",
  },
] as const;

/* ---------- Helper: find current step index ---------- */
function getCurrentStepIndex(pathname: string): number {
  return DEMO_STEPS.findIndex((s) => pathname.includes(s.path));
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
  const currentStep = currentStepIdx >= 0 ? DEMO_STEPS[currentStepIdx] : null;

  /* ── Auto-Start: Begin Vapi call when ?demo=active lands ── */
  useEffect(() => {
    if (!isDemoActive) return;
    if (autoStarted.current) return;
    if (callStatus !== "inactive") return;

    autoStarted.current = true;
    // Small delay to let the page render before starting audio
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

    if (pathname.includes("/perimeter/verify")) {
      injectContext(
        "[SYSTEM EVENT: User is on the Verification Perimeter. Welcome them to the AurumShield institutional demo. Explain that this is the biometric KYB identity check powered by Veriff. Point out that no trading can occur until their identity perimeter is cleared. Tell them to click the 'Proceed to Marketplace' button when ready." +
          langSuffix
      );
    } else if (pathname.includes("/offtaker/marketplace")) {
      injectContext(
        "[SYSTEM EVENT: User navigated to the Institutional Marketplace. Explain the Bloomberg B-PIPE real-time pricing, the 400-oz Good Delivery bars sourced from LBMA-accredited refiners, and that all inventory is held at Malca-Amit sovereign vaults. Tell them to click 'Execute Trade' to proceed to checkout." +
          langSuffix
      );
    } else if (
      pathname.includes("/checkout") ||
      pathname.includes("/transactions")
    ) {
      injectContext(
        "[SYSTEM EVENT: User is on the Execution & Checkout terminal. Walk them through the term sheet: the price lock countdown, the Fedwire routing instructions, the vaulting vs shipping options, and the escrow initialization. Tell them to click 'View Settlement' when ready." +
          langSuffix
      );
    } else if (pathname.includes("/demo/security")) {
      injectContext(
        "[SYSTEM EVENT: User navigated to the Security Architecture page. Walk them through TLS 1.3, three-tier network isolation, immutable double-entry ledgers, HMAC-SHA256 webhook verification, KMS certificate signing, and the 24-point security checklist." +
          langSuffix
      );
    } else if (pathname.includes("/settlements")) {
      injectContext(
        "[SYSTEM EVENT: User is viewing the Master Settlement Ledger. This is the final stage. Explain atomic DvP swap, SHA-256 clearing certificates, the append-only audit trail, and cryptographic title transfer. Congratulate them on completing the full demo walkthrough." +
          langSuffix
      );
    }
  }, [pathname, callStatus, activeLanguage, injectContext]);

  /* Auto-scroll transcript feed */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  /* ── Navigate to next step ── */
  const goToNextStep = useCallback(() => {
    if (currentStep && currentStep.nextPath) {
      router.push(currentStep.nextPath);
    }
  }, [currentStep, router]);

  /* ── Don't render if demo is not active ── */
  if (!isDemoActive) return null;

  /* ---- Render: Railroad + NextStep + Voice Panel ---- */
  return (
    <>
      {/* ── RAILROAD PROGRESS BAR (top of screen) ── */}
      <div className="fixed top-0 left-0 right-0 z-60 bg-slate-950/95 backdrop-blur-md border-b border-gold/20">
        <div className="mx-auto max-w-4xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {DEMO_STEPS.map((step, idx) => {
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
                  {idx < DEMO_STEPS.length - 1 && (
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

      {/* ── NEXT STEP CTA (bottom-left) ── */}
      {currentStep && currentStep.nextLabel && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={goToNextStep}
            className="group flex items-center gap-3 rounded-xl border-2 border-gold/40 bg-gold/10 px-6 py-3.5 text-sm font-bold text-gold shadow-[0_0_30px_rgba(198,168,107,0.15)] backdrop-blur-sm transition-all duration-300 hover:border-gold/70 hover:bg-gold/20 hover:shadow-[0_0_40px_rgba(198,168,107,0.25)] animate-pulse hover:animate-none"
          >
            <span>{currentStep.nextLabel}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 w-80">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl">
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
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
                <p className="text-[11px] font-semibold text-text">
                  {callStatus === "loading"
                    ? "Connecting…"
                    : callStatus === "active"
                      ? "Voice Guide Active"
                      : "Demo Guide"}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-text-faint">
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
                className="rounded p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
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
                className="rounded p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
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
                <p className="text-center font-mono text-[10px] text-text-faint italic">
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
                      <p className="font-mono text-[10px] leading-relaxed text-text-muted">
                        {entry.text}
                      </p>
                      <p className="mt-0.5 text-right font-mono text-[8px] tabular-nums text-text-faint opacity-0 transition-opacity group-hover:opacity-100">
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
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => {
                  stopCall();
                  router.push("/");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] font-semibold text-danger transition-all hover:border-danger/50 hover:bg-danger/10"
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
              <div className="border-t border-border px-4 py-2.5">
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
                    className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-[11px] text-text-faint transition-all hover:bg-surface-2 hover:text-text"
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
