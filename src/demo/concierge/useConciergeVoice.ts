/* ================================================================
   USE-CONCIERGE-VOICE — Gemini Live API voice agent hook
   
   Manages a direct browser-to-Gemini WebSocket connection for
   real-time bidirectional audio with tool-call-driven UI control.
   
   Architecture:
   1. Fetches ephemeral token from POST /api/concierge/token
   2. Connects browser directly to Gemini via @google/genai SDK
   3. Captures microphone → 16kHz PCM → Gemini
   4. Receives 24kHz PCM audio → playback queue
   5. Tool calls dispatch INSTANTLY to onToolCall callback
   6. Barge-in flushes playback buffer immediately
   
   No audio proxying. No server-side WebSocket relay.
   ================================================================ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { ConciergeStatus, ConciergeToolCall, OnToolCallFn } from "./conciergeTypes";
import {
  CONCIERGE_TOOL_DECLARATIONS,
  CONCIERGE_SYSTEM_INSTRUCTION,
} from "./conciergeTypes";
import {
  createMicrophoneStream,
  createAudioPlayer,
  type MicrophoneStream,
  type AudioPlayer,
} from "./audioUtils";

/* ---------- Constants ---------- */

const MODEL = "gemini-3.1-flash-live-preview";
const TOKEN_ENDPOINT = "/api/concierge/token";
/** How often to sample volume level (ms) */
const VOLUME_POLL_MS = 100;

/* ---------- Hook Interface ---------- */

export interface UseConciergeVoiceReturn {
  /** Current connection status */
  status: ConciergeStatus;
  /** Start the voice session (requests mic permission) */
  startSession: () => Promise<void>;
  /** End the voice session and release all resources */
  endSession: () => void;
  /** Whether the AI agent is currently speaking */
  isSpeaking: boolean;
  /** Volume level of outgoing AI speech (0-1) for waveform display */
  volumeLevel: number;
  /** Current transcript text being spoken by the AI */
  activeTranscript: string;
  /** True if the WebSocket failed and the UI should show manual controls */
  fallbackMode: boolean;
  /** Attempt to reconnect after a failure (one manual retry) */
  retrySession: () => Promise<void>;
}

/* ---------- Hook ---------- */

export function useConciergeVoice(
  onToolCall: OnToolCallFn,
): UseConciergeVoiceReturn {
  const [status, setStatus] = useState<ConciergeStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [activeTranscript, setActiveTranscript] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);
  const retryCountRef = useRef(0);
  /** Max automatic retries before entering fallback mode */
  const MAX_AUTO_RETRIES = 1;

  // Mutable refs for resources that survive re-renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const micRef = useRef<MicrophoneStream | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onToolCallRef = useRef<OnToolCallFn>(onToolCall);
  const activeRef = useRef(false);

  // Keep onToolCall ref current without causing re-subscriptions
  useEffect(() => {
    onToolCallRef.current = onToolCall;
  }, [onToolCall]);

  /* ── Cleanup helper ── */
  const teardown = useCallback(() => {
    activeRef.current = false;

    // Stop mic
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
    }

    // Stop player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Close Gemini session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // Session may already be closed
      }
      sessionRef.current = null;
    }

    // Clear volume polling
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }

    setIsSpeaking(false);
    setVolumeLevel(0);
    setActiveTranscript("");
  }, []);

  /* ── Parse and dispatch a tool call from Gemini ── */
  const dispatchToolCall = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fc: { name: string; id: string; args: Record<string, any> }) => {
      const call = {
        name: fc.name,
        args: fc.args ?? {},
      } as ConciergeToolCall;

      console.info(`[Concierge] Tool call: ${fc.name}`, fc.args);

      // Fire IMMEDIATELY — don't wait for audio
      onToolCallRef.current(call);

      return { id: fc.id, name: fc.name, response: { result: "ok" } };
    },
    [],
  );

  /* ── Start Session ── */
  const startSession = useCallback(async () => {
    if (activeRef.current) return;

    setStatus("connecting");

    try {
      // 1. Fetch ephemeral token from our API
      const tokenRes = await fetch(TOKEN_ENDPOINT, { method: "POST" });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(
          `Token request failed: ${tokenRes.status} — ${err.error ?? "Unknown error"}`,
        );
      }
      const { token } = await tokenRes.json();

      // 2. Create audio player for AI speech output
      const player = createAudioPlayer();
      playerRef.current = player;

      // 3. Connect to Gemini Live API directly from the browser
      const ai = new GoogleGenAI({ apiKey: token });

      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0.2,
          systemInstruction: CONCIERGE_SYSTEM_INSTRUCTION,
          tools: CONCIERGE_TOOL_DECLARATIONS,
        },
        callbacks: {
          onopen() {
            console.info("[Concierge] Session connected");
          },

          onmessage(message) {
            // Handle tool calls — INSTANT dispatch, no waiting
            const toolCall = message.toolCall as
              | {
                  functionCalls: Array<{
                    name: string;
                    id: string;
                    args: Record<string, unknown>;
                  }>;
                }
              | undefined;

            if (toolCall?.functionCalls) {
              const functionResponses = toolCall.functionCalls.map((fc) =>
                dispatchToolCall(fc),
              );

              // Send tool responses back so Gemini continues speaking
              try {
                session.sendToolResponse({ functionResponses });
              } catch (err) {
                console.warn("[Concierge] Failed to send tool response:", err);
              }
              return;
            }

            // Handle audio content from the model
            const serverContent = message.serverContent as
              | {
                  modelTurn?: {
                    parts?: Array<{
                      inlineData?: { data: string; mimeType: string };
                    }>;
                  };
                  interrupted?: boolean;
                  turnComplete?: boolean;
                }
              | undefined;

            if (serverContent) {
              // Barge-in: Gemini signals the model was interrupted
              if (serverContent.interrupted) {
                console.info("[Concierge] Barge-in detected — flushing audio");
                player.interrupt();
                setIsSpeaking(false);
                setActiveTranscript("");
                setStatus("interrupted");
                // Status resets to active on next user or model turn
                setTimeout(() => {
                  if (activeRef.current) setStatus("active");
                }, 300);
                return;
              }

              // Audio data and transcript from the model
              if (serverContent.modelTurn?.parts) {
                for (const part of serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    player.enqueue(part.inlineData.data);
                    setIsSpeaking(true);
                  }
                  // Capture text transcript when Gemini sends it alongside audio
                  const textPart = part as { text?: string };
                  if (textPart.text) {
                    setActiveTranscript((prev) => prev + textPart.text);
                  }
                }
              }

              // Turn complete — model finished speaking
              if (serverContent.turnComplete) {
                // Clear transcript after a delay so the subtitle can linger
                setTimeout(() => {
                  setActiveTranscript("");
                }, 2000);
              }
            }
          },

          onerror(e: { message: string }) {
            console.error("[Concierge] WebSocket error:", e.message);
            // Don't immediately show raw error — attempt silent retry
            if (retryCountRef.current < MAX_AUTO_RETRIES && activeRef.current) {
              console.info(`[Concierge] Auto-retry attempt ${retryCountRef.current + 1}/${MAX_AUTO_RETRIES}`);
              retryCountRef.current += 1;
              teardown();
              // Brief delay before retry to avoid hammering the server
              setTimeout(() => {
                startSession().catch(() => {
                  console.error("[Concierge] Auto-retry failed — entering fallback mode");
                  setFallbackMode(true);
                  setStatus("error");
                });
              }, 1500);
            } else {
              // Exhausted retries — graceful fallback
              console.warn("[Concierge] Entering manual fallback mode");
              setFallbackMode(true);
              setStatus("error");
              teardown();
            }
          },

          onclose(e: { reason: string }) {
            console.info("[Concierge] Session closed:", e.reason);
            if (activeRef.current) {
              // Unexpected close during active session → try recovery
              if (retryCountRef.current < MAX_AUTO_RETRIES) {
                console.info("[Concierge] Unexpected close — attempting reconnect");
                retryCountRef.current += 1;
                teardown();
                setTimeout(() => {
                  startSession().catch(() => {
                    setFallbackMode(true);
                    setStatus("error");
                  });
                }, 1500);
              } else {
                console.warn("[Concierge] Unexpected close — entering fallback mode");
                setFallbackMode(true);
                setStatus("idle");
                teardown();
              }
            }
          },
        },
      });

      sessionRef.current = session;
      activeRef.current = true;

      // 4. Start microphone capture
      const mic = await createMicrophoneStream((base64Pcm) => {
        if (!activeRef.current || !sessionRef.current) return;
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64Pcm,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // Session may have closed between check and send
        }
      });
      micRef.current = mic;

      // 5. Poll volume level for waveform display
      volumeTimerRef.current = setInterval(() => {
        if (playerRef.current) {
          const vol = playerRef.current.getVolume();
          setVolumeLevel(vol);
          if (!playerRef.current.isPlaying() && isSpeaking) {
            setIsSpeaking(false);
          }
        }
      }, VOLUME_POLL_MS);

      setStatus("active");
      setFallbackMode(false); // Clear fallback on successful connect
      retryCountRef.current = 0; // Reset retry counter
      console.info("[Concierge] Session fully active — mic and playback ready");
    } catch (err) {
      console.error("[Concierge] Failed to start session:", err);
      // Don't surface raw errors — enter fallback gracefully
      setFallbackMode(true);
      setStatus("error");
      teardown();
    }
  }, [dispatchToolCall, teardown, isSpeaking]);

  /* ── End Session ── */
  const endSession = useCallback(() => {
    console.info("[Concierge] Ending session");
    teardown();
    setStatus("idle");
    setFallbackMode(false);
    retryCountRef.current = 0;
  }, [teardown]);

  /* ── Manual Retry (user-initiated) ── */
  const retrySession = useCallback(async () => {
    console.info("[Concierge] Manual retry requested");
    setFallbackMode(false);
    retryCountRef.current = 0;
    teardown();
    await startSession();
  }, [teardown, startSession]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  return {
    status,
    startSession,
    endSession,
    isSpeaking,
    volumeLevel,
    activeTranscript,
    fallbackMode,
    retrySession,
  };
}
