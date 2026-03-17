"use client";

/* ================================================================
   USE-VAPI-SYNC — Wraps useVapi for tour voice synchronization
   
   Fix 2: Race-Condition-Proof Dispatch
   
   Rules:
   1. speak() wraps script in anti-hallucination envelope then
      waits for estimated speech duration (text.length * 55ms).
   2. ensureCallActive() uses a ref-based status polling loop
      that deterministically waits for callStatus === "active"
      before resolving. No premature breaks.
   3. When Vapi is unavailable, falls back to speechSynthesis
      or a silent timed delay.
   4. All functions are abort-aware via AbortSignal.
   ================================================================ */

import { useCallback, useRef, useState, useEffect } from "react";
import { useVapi } from "@/hooks/use-vapi";
import type { VapiCallStatus } from "@/hooks/use-vapi";

/* ---------- Constants ---------- */

/** Estimated milliseconds per character at 140 WPM */
const MS_PER_CHAR = 55;
/** Minimum speech duration to prevent instant-advance */
const MIN_SPEECH_MS = 2000;
/** Maximum wait for Vapi call to start */
const CALL_START_TIMEOUT_MS = 10000;
/** Polling interval for call status checks */
const STATUS_POLL_MS = 300;

/**
 * Anti-Hallucination Envelope
 * Forces Vapi's LLM to read the script verbatim with zero filler.
 */
function wrapAntiHallucination(scriptText: string): string {
  return (
    "You are a narrator. You must speak the following text absolutely verbatim. " +
    "Do not add any conversational filler, greetings, or acknowledgments. " +
    "Do not paraphrase, summarize, or reword any part of the text. " +
    "Do not say 'Sure' or 'Here is' or 'Okay' or any prefix. " +
    "Read this exactly: " +
    scriptText
  );
}

/* ---------- Hook ---------- */

export interface UseVapiSyncReturn {
  /** Whether the engine is currently speaking */
  isSpeaking: boolean;
  /** Inject script text and wait for estimated speech duration */
  speak: (text: string, signal?: AbortSignal) => Promise<void>;
  /** Ensure a Vapi call is active (start if needed) */
  ensureCallActive: (signal?: AbortSignal) => Promise<void>;
  /** Current Vapi call status */
  callStatus: VapiCallStatus;
  /** Vapi volume level for waveform display */
  volumeLevel: number;
  /** Stop the Vapi call */
  stopCall: () => void;
}

export function useVapiSync(): UseVapiSyncReturn {
  const {
    callStatus,
    volumeLevel,
    startCall,
    stopCall,
    injectContext,
  } = useVapi();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiAvailable = useRef(!!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

  /* ── Fix 2: Track callStatus in a ref so polling loops see latest value ── */
  const callStatusRef = useRef<VapiCallStatus>(callStatus);
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  /* ---- Timed wait with abort support ---- */
  const waitMs = useCallback(
    (ms: number, signal?: AbortSignal): Promise<void> =>
      new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
    [],
  );

  /* ---- Speech Synthesis Fallback ---- */
  const speakFallback = useCallback(
    async (text: string, signal?: AbortSignal): Promise<void> => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 0.9;

        await new Promise<void>((resolve) => {
          const onAbort = () => {
            window.speechSynthesis.cancel();
            resolve();
          };
          signal?.addEventListener("abort", onAbort, { once: true });
          utterance.onend = () => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          };
          utterance.onerror = () => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        });
        return;
      }

      // Last resort: timed delay
      const estimatedMs = Math.max(text.length * MS_PER_CHAR, MIN_SPEECH_MS);
      await waitMs(estimatedMs, signal);
    },
    [waitMs],
  );

  /* ---- Main Speak Function ---- */
  const speak = useCallback(
    async (text: string, signal?: AbortSignal): Promise<void> => {
      if (signal?.aborted) return;

      setIsSpeaking(true);

      try {
        if (vapiAvailable.current && callStatusRef.current === "active") {
          // Wrap in anti-hallucination envelope
          const wrappedScript = wrapAntiHallucination(text);
          injectContext(wrappedScript);

          // Wait for estimated speech duration
          const estimatedMs = Math.max(
            text.length * MS_PER_CHAR,
            MIN_SPEECH_MS,
          );
          await waitMs(estimatedMs, signal);
        } else {
          // Fallback: browser speechSynthesis or timed delay
          await speakFallback(text, signal);
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [injectContext, speakFallback, waitMs],
  );

  /* ── Fix 2: Deterministic ensureCallActive with ref-based polling ── */
  const ensureCallActive = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!vapiAvailable.current) {
        console.info("[useVapiSync] Vapi not configured — running in silent/fallback mode.");
        return;
      }

      // Already active — nothing to do
      if (callStatusRef.current === "active") return;

      // Start the call
      startCall();

      // Poll until callStatus === "active" or timeout
      const start = performance.now();
      while (performance.now() - start < CALL_START_TIMEOUT_MS) {
        if (signal?.aborted) return;

        // Check ref — cast needed because TS narrows after early return above,
        // but the ref mutates asynchronously via useEffect between awaits
        if ((callStatusRef.current as VapiCallStatus) === "active") {
          // Extra buffer for Vapi internals to fully initialize
          await waitMs(500, signal).catch(() => {});
          return;
        }

        // Wait before next poll
        await waitMs(STATUS_POLL_MS, signal).catch(() => {});
      }

      console.warn("[useVapiSync] Vapi call did not reach active status within timeout.");
    },
    [startCall, waitMs],
  );

  return {
    isSpeaking,
    speak,
    ensureCallActive,
    callStatus,
    volumeLevel,
    stopCall,
  };
}
