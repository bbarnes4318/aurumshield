/* ================================================================
   CONCIERGE SUBTITLES — Real-time voice transcript display (v2)
   
   Hovers at the bottom of the screen during an active concierge
   session. Renders the AI's spoken words with a cinematic subtitle
   aesthetic:

   - Dark glassmorphism bar with gold accent
   - Multi-line display (max 2 lines, word-wrapped)
   - Muted text for past words, bright white for active phrase
   - Gold accent pulse when AI is speaking
   - Smooth fade-in/out transitions
   - Increased font size for legibility
   - Bottom offset to avoid overlapping UI controls
   
   Mounted in MissionLayout — persists across page navigations.
   ================================================================ */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTour } from "../tour-engine/TourProvider";

/** Z-index — above the highlighter overlay, below modals */
const SUBTITLE_Z = 100001;

/** How many recent characters to show as "bright" (the active phrase) */
const BRIGHT_TAIL_LENGTH = 120;

export function ConciergeSubtitles() {
  const { concierge } = useTour();
  const { activeTranscript, isSpeaking, status } = concierge;

  const containerRef = useRef<HTMLDivElement>(null);
  const mounted = typeof window !== "undefined";

  // Derive visible / text directly from props — no cascading setState
  const hasText = activeTranscript.length > 0;
  const visible = hasText || isSpeaking;

  // Split the display text into "muted" (past) and "bright" (active) portions
  const { mutedText, brightText } = useMemo(() => {
    if (!activeTranscript) return { mutedText: "", brightText: "" };
    const brightStart = Math.max(0, activeTranscript.length - BRIGHT_TAIL_LENGTH);
    const adjustedStart =
      brightStart === 0 ? 0 : (activeTranscript.lastIndexOf(" ", brightStart) + 1);
    return {
      mutedText: activeTranscript.slice(0, adjustedStart),
      brightText: activeTranscript.slice(adjustedStart),
    };
  }, [activeTranscript]);

  // Auto-scroll to bottom of text area when content changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activeTranscript]);

  if (!mounted) return null;
  if (status === "idle" || status === "error") return null;
  if (!visible && !activeTranscript) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: SUBTITLE_Z,
        maxWidth: "min(760px, 88vw)",
        width: "100%",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
      aria-live="polite"
      aria-label="Voice assistant transcript"
    >
      <div
        style={{
          background: "rgba(3, 7, 18, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16,
          border: `1px solid rgba(198, 168, 107, ${isSpeaking ? 0.25 : 0.1})`,
          padding: "16px 24px",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.4s ease",
        }}
      >
        {/* Gold accent line at top — pulses when speaking */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: isSpeaking ? 2 : 1,
            background: isSpeaking
              ? "linear-gradient(90deg, transparent, rgba(198, 168, 107, 0.7), transparent)"
              : "linear-gradient(90deg, transparent, rgba(198, 168, 107, 0.3), transparent)",
            transition: "all 0.3s ease",
          }}
        />

        {/* Speaking indicator dot + text */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isSpeaking
                ? "#c6a86b"
                : "rgba(198, 168, 107, 0.3)",
              boxShadow: isSpeaking
                ? "0 0 10px rgba(198, 168, 107, 0.7)"
                : "none",
              transition: "all 0.3s ease",
              flexShrink: 0,
              marginTop: 7,
            }}
          />

          {/* Transcript text — multi-line with word-wrap */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflow: "hidden",
              maxHeight: "3.4em", /* ~2 lines */
              lineHeight: 1.7,
              maskImage:
                "linear-gradient(180deg, black 60%, rgba(0,0,0,0.6) 85%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, black 60%, rgba(0,0,0,0.6) 85%, transparent 100%)",
            }}
          >
            <p
              style={{
                fontFamily:
                  "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontSize: 15,
                fontWeight: 400,
                lineHeight: 1.7,
                margin: 0,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {/* Past words — muted */}
              {mutedText && (
                <span style={{ color: "rgba(148, 163, 184, 0.5)" }}>
                  {mutedText}
                </span>
              )}

              {/* Active phrase — bright white */}
              <span
                style={{
                  color: "#f1f5f9",
                  fontWeight: 450,
                }}
              >
                {brightText}
              </span>

              {/* Blinking cursor when speaking */}
              {isSpeaking && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 17,
                    background: "#c6a86b",
                    marginLeft: 4,
                    verticalAlign: "text-bottom",
                    animation: "conciergeCursorBlink 1s step-end infinite",
                  }}
                />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Inject cursor blink keyframe */}
      <style>{`
        @keyframes conciergeCursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
