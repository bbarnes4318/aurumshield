"use client";

/* ================================================================
   USE-VAPI HOOK — Encapsulates the Vapi Web SDK client
   
   Rules:
   1. Singleton Vapi instance via useRef (never re-created).
   2. Volume level batched through rAF to avoid render-thrashing.
   3. Transcript accumulates assistant messages only.
   4. All listeners detached on unmount.
   5. injectContext() sends system messages into the live session
      for dynamic context injection (e.g. pathname changes).
   6. startCall() accepts a language parameter to force the
      assistant to conduct the demo in the selected language.
   7. activeLanguage is exposed so consumers can append language
      reminders to every context injection payload.
   
   Env vars required:
   - NEXT_PUBLIC_VAPI_PUBLIC_KEY  (Vapi dashboard → Project → Public Key)
   - NEXT_PUBLIC_VAPI_ASSISTANT_ID (Vapi dashboard → Assistants → ID)
   ================================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

/* ---------- Types ---------- */
export type VapiCallStatus = "inactive" | "loading" | "active";

export interface TranscriptEntry {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
}

export interface UseVapiReturn {
  callStatus: VapiCallStatus;
  volumeLevel: number;
  transcript: TranscriptEntry[];
  activeLanguage: string;
  startCall: (language?: string) => void;
  stopCall: () => void;
  injectContext: (contextString: string) => void;
}

/* ---------- Hook ---------- */
export function useVapi(): UseVapiReturn {
  const vapiRef = useRef<Vapi | null>(null);
  const volumeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingLanguageRef = useRef<string>("English");

  const [callStatus, setCallStatus] = useState<VapiCallStatus>("inactive");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeLanguage, setActiveLanguage] = useState("English");

  /* ---- Instantiate Vapi (once) ---- */
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("[useVapi] NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set.");
      return;
    }

    const client = new Vapi(publicKey);
    vapiRef.current = client;

    /* ---- Event Listeners ---- */

    const onCallStart = () => {
      setCallStatus("active");

      // Now that the call is ACTUALLY joined, inject the language mandate
      const lang = pendingLanguageRef.current;
      if (lang && lang !== "English") {
        client.send({
          type: "add-message",
          message: {
            role: "system",
            content:
              "[CRITICAL SYSTEM MANDATE: The user has selected " +
              lang +
              " as their preferred language. You MUST conduct this entire demonstration, " +
              "read all teleprompter cues, and answer all questions EXCLUSIVELY in " +
              lang +
              ". Do not speak English unless explicitly requested.]",
          },
        });
      }
    };

    const onCallEnd = () => {
      setCallStatus("inactive");
      setVolumeLevel(0);
      volumeRef.current = 0;
    };

    const onVolumeLevel = (level: number) => {
      // Batch volume updates through rAF to prevent render-thrashing
      volumeRef.current = level;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setVolumeLevel(volumeRef.current);
          rafRef.current = null;
        });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMessage = (msg: any) => {
      if (
        msg.type === "transcript" &&
        msg.transcriptType === "final" &&
        msg.role === "assistant"
      ) {
        setTranscript((prev) => [
          ...prev,
          {
            role: "assistant",
            text: msg.transcript,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    const onError = (error: unknown) => {
      console.error("[useVapi] Error:", error);
      setCallStatus("inactive");
    };

    client.on("call-start", onCallStart);
    client.on("call-end", onCallEnd);
    client.on("volume-level", onVolumeLevel);
    client.on("message", onMessage);
    client.on("error", onError);

    /* ---- Cleanup ---- */
    return () => {
      client.removeListener("call-start", onCallStart);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("volume-level", onVolumeLevel);
      client.removeListener("message", onMessage);
      client.removeListener("error", onError);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /* ---- Context Injector ---- */
  const injectContext = useCallback((contextString: string) => {
    if (!vapiRef.current) {
      console.warn("[useVapi] Cannot inject context — client not initialized.");
      return;
    }
    vapiRef.current.send({
      type: "add-message",
      message: { role: "system", content: contextString },
    });
  }, []);

  /* ---- Actions ---- */
  const startCall = useCallback(
    (language: string = "English") => {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      if (!vapiRef.current) {
        console.error("[useVapi] Vapi client not initialized.");
        return;
      }
      if (!assistantId) {
        console.error("[useVapi] NEXT_PUBLIC_VAPI_ASSISTANT_ID is not set.");
        return;
      }

      // Store language in ref so the onCallStart handler can read it
      pendingLanguageRef.current = language;
      setActiveLanguage(language);
      setCallStatus("loading");
      setTranscript([]);
      vapiRef.current.start(assistantId);
    },
    []
  );

  const stopCall = useCallback(() => {
    if (!vapiRef.current) return;
    vapiRef.current.stop();
    setCallStatus("inactive");
  }, []);

  return {
    callStatus,
    volumeLevel,
    transcript,
    activeLanguage,
    startCall,
    stopCall,
    injectContext,
  };
}
