"use client";

/* ================================================================
   DEMO GUIDE OVERLAY — Vapi Voice Guide Panel (Multilingual)

   Floating panel (bottom-right) that connects to a Vapi assistant.
   Three states: Inactive → Loading → Active.
   Dynamic Context Injection: usePathname drives system messages
   into the live Vapi session on route changes.
   
   Multilingual: 22-language dropdown (Cartesia-supported) forces
   the LLM to conduct the entire demo in the selected language.

   Design: Matches AurumShield institutional gold/slate palette.
   
   Env vars required:
   - NEXT_PUBLIC_VAPI_PUBLIC_KEY
   - NEXT_PUBLIC_VAPI_ASSISTANT_ID
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic, MicOff, Radio, X, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";

/* ---------- Cartesia Supported Languages ---------- */
const SUPPORTED_LANGUAGES = [
  "English (American)",
  "English (British)",
  "Spanish",
  "Portuguese (Brazilian)",
  "French",
  "German",
  "Italian",
  "Dutch",
  "Polish",
  "Swedish",
  "Japanese",
  "Korean",
  "Chinese",
  "Hindi",
  "Turkish",
  "Georgian",
  "Croatian",
  "Slovak",
  "Kannada",
  "Marathi",
  "Punjabi",
  "Malayalam",
];

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

  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English (American)");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  /* ── Routing Engine — Dynamic Context Injection (Language-Enforced) ── */
  useEffect(() => {
    if (callStatus !== "active") return;

    const langSuffix =
      " DELIVER THIS EXPLANATION EXCLUSIVELY IN " + activeLanguage + ".]";

    if (pathname.includes("/perimeter/verify")) {
      injectContext(
        "[SYSTEM EVENT: User navigated to the Verification Perimeter. Explain the live Veriff KYB biometric check." +
          langSuffix
      );
    } else if (pathname.includes("/offtaker/marketplace")) {
      injectContext(
        "[SYSTEM EVENT: User navigated to the Institutional Marketplace. Point out the Bloomberg B-PIPE pricing and 400-oz Good Delivery bars." +
          langSuffix
      );
    } else if (
      pathname.includes("/transactions") ||
      pathname.includes("checkout")
    ) {
      injectContext(
        "[SYSTEM EVENT: User is on the Execution Term Sheet. Prompt them to select between Vaulting and Malca-Amit transit, and explain the Fedwire math." +
          langSuffix
      );
    } else if (pathname.includes("/demo/security")) {
      injectContext(
        "[SYSTEM EVENT: User navigated to the Security Architecture page. Walk them through the key security controls: TLS 1.3, three-tier network isolation, immutable double-entry ledgers, HMAC-SHA256 webhook verification, KMS certificate signing, and the 24-point security checklist. Emphasize zero plaintext credentials and OIDC-based CI/CD." +
          langSuffix
      );
    } else if (pathname.includes("/settlements")) {
      injectContext(
        "[SYSTEM EVENT: User is viewing the Master Settlement Ledger. Explain the atomic swap and cryptographic title transfer." +
          langSuffix
      );
    }
  }, [pathname, callStatus, activeLanguage, injectContext]);

  /* Auto-scroll transcript feed */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  /* ---- Inactive State: Language Selector + CTA ---- */
  if (callStatus === "inactive" && transcript.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl">
          {/* Language Selector */}
          <div className="border-b border-border px-4 py-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-gold" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-text-faint">
                Demo Language
              </span>
            </div>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-300 outline-none transition-colors focus:border-[#c6a86b]"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Start CTA */}
          <div className="px-4 py-3">
            <button
              onClick={() => startCall(selectedLang)}
              className="group flex w-full items-center justify-center gap-2.5 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2.5 text-xs font-semibold tracking-wide text-gold transition-all duration-200 hover:border-gold/60 hover:bg-gold/10"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-gold/10 transition-colors group-hover:bg-gold/20">
                <Mic className="h-3 w-3" />
              </div>
              <span>Initiate Voice Guide</span>
            </button>
            <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-widest text-text-faint">
              {selectedLang !== "English (American)"
                ? `Demo will be conducted in ${selectedLang}`
                : "Default: English"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Loading / Active Panel ---- */
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="relative flex items-center justify-center">
              {/* Volume-reactive ring (active only) */}
              {callStatus === "active" && (
                <div
                  className="absolute inset-0 rounded-full border border-gold/40"
                  style={{
                    transform: `scale(${1 + volumeLevel * 0.6})`,
                    opacity: 0.3 + volumeLevel * 0.7,
                    transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
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
                  : "Voice Guide Active"}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-text-faint">
                {callStatus === "loading"
                  ? "Establishing link"
                  : activeLanguage}
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
              onClick={stopCall}
              className="rounded p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
              title="End Voice Guide"
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
                  : "Waiting for assistant…"}
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
              onClick={stopCall}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] font-semibold text-danger transition-all hover:border-danger/50 hover:bg-danger/10"
            >
              <MicOff className="h-3 w-3" />
              <span>End Voice Guide</span>
            </button>
          </div>
        )}

        {/* ── Inactive footer (call ended, transcript still visible) ── */}
        {!isMinimized && callStatus === "inactive" && transcript.length > 0 && (
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
                onClick={stopCall}
                className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-[11px] text-text-faint transition-all hover:bg-surface-2 hover:text-text"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
