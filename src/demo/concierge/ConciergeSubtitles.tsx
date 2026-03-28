/* ================================================================
   CONCIERGE SUBTITLES — Real-time voice transcript display
   
   Hovers at the bottom of the screen during an active concierge
   session. Renders the AI's spoken words with a cinematic subtitle
   aesthetic:

   - Dark glassmorphism bar with gold accent
   - Sans-serif typography (system font stack)
   - Muted text for spoken words, bright white for the latest phrase
   - Smooth fade-in/out transitions
   - Auto-fades 2s after speech ends (handled by hook)
   
   Mounted in MissionLayout — persists across page navigations.
   ================================================================ */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTour } from "../tour-engine/TourProvider";

/** Z-index — above the highlighter overlay, below modals */
const SUBTITLE_Z = 100001;

/** How many recent characters to show as "bright" (the active phrase) */
const BRIGHT_TAIL_LENGTH = 80;

export function ConciergeSubtitles() {
  const { concierge } = useTour();
  const { activeTranscript, isSpeaking, status } = concierge;

  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to the end of the text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [activeTranscript]);

  if (!mounted) return null;
  if (status === "idle" || status === "error") return null;
  if (!visible && !activeTranscript) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: SUBTITLE_Z,
        maxWidth: "min(720px, 85vw)",
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
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 14,
          border: "1px solid rgba(198, 168, 107, 0.12)",
          padding: "14px 22px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(198, 168, 107, 0.4), transparent)",
          }}
        />

        {/* Speaking indicator dot + text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isSpeaking
                ? "#c6a86b"
                : "rgba(198, 168, 107, 0.3)",
              boxShadow: isSpeaking
                ? "0 0 8px rgba(198, 168, 107, 0.6)"
                : "none",
              transition: "all 0.3s ease",
              flexShrink: 0,
            }}
          />

          {/* Transcript text */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
              maskImage:
                "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)",
            }}
          >
            <p
              style={{
                fontFamily:
                  "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.5,
                margin: 0,
                display: "inline",
              }}
            >
              {/* Past words — muted */}
              {mutedText && (
                <span style={{ color: "rgba(148, 163, 184, 0.6)" }}>
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
                    height: 16,
                    background: "#c6a86b",
                    marginLeft: 3,
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
