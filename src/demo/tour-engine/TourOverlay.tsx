/* ================================================================
   TOUR OVERLAY — Minimal Concierge Status Indicator (v4)

   A tiny, premium pill in the top-right corner that shows:
   - Speaking indicator (gold dot)
   - Current act label
   - Step counter
   - Exit button
   - Fallback banner if voice fails

   This does NOT block interaction with the real application.
   The real product UI is the star — the concierge guides via
   voice + subtitles, not via a card overlay.
   ================================================================ */

"use client";

import { createPortal } from "react-dom";
import { X, Volume2, VolumeX } from "lucide-react";
import { useTour } from "./TourProvider";

const PILL_Z = 100000;

/* Inject keyframe once */
const STYLE_ID = "tour-pill-keyframes";
function ensurePillStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes conciergePillPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(198, 168, 107, 0); }
      50% { box-shadow: 0 0 0 4px rgba(198, 168, 107, 0.15); }
    }
    @keyframes conciergePillFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

export function TourOverlay() {
  const {
    state,
    tour,
    currentStep,
    totalSteps,
    exitTour,
    concierge: { isSpeaking, status: conciergeStatus, fallbackMode },
  } = useTour();

  ensurePillStyles();

  const mounted = typeof window !== "undefined";

  if (!mounted) return null;
  if (state.status === "idle") return null;
  if (!tour) return null;

  /* ── Completed state — small "done" pill ── */
  if (state.status === "completed") {
    return createPortal(
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 24,
          zIndex: PILL_Z,
          animation: "conciergePillFadeIn 0.3s ease forwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(63, 174, 122, 0.3)",
            borderRadius: 20,
            padding: "6px 14px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#3fae7a",
            }}
          />
          <span
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "#3fae7a",
            }}
          >
            Demo Complete
          </span>
          <button
            onClick={exitTour}
            style={{
              display: "flex",
              alignItems: "center",
              padding: 2,
              background: "transparent",
              border: "none",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  /* ── Paused state — small "paused" pill ── */
  if (state.status === "paused") {
    return createPortal(
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 24,
          zIndex: PILL_Z,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(198, 168, 107, 0.2)",
            borderRadius: 20,
            padding: "6px 14px",
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "#c6a86b",
            }}
          >
            Demo Paused
          </span>
          <button
            onClick={exitTour}
            style={{
              display: "flex",
              alignItems: "center",
              padding: 2,
              background: "transparent",
              border: "none",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  /* ═════════════════════════════════════════════════════════════
     ACTIVE STATE — Minimal concierge pill + optional fallback banner
     ═════════════════════════════════════════════════════════════ */

  return createPortal(
    <>
      {/* ── Concierge Status Pill (top-right) ── */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 24,
          zIndex: PILL_Z,
          animation: "conciergePillFadeIn 0.3s ease forwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(16px)",
            border: `1px solid rgba(198, 168, 107, ${isSpeaking ? 0.3 : 0.1})`,
            borderRadius: 24,
            padding: "7px 16px",
            transition: "border-color 0.3s ease",
            animation: isSpeaking ? "conciergePillPulse 2s ease-in-out infinite" : "none",
          }}
        >
          {/* Speaking indicator */}
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isSpeaking
                ? "#c6a86b"
                : conciergeStatus === "active"
                  ? "rgba(198, 168, 107, 0.4)"
                  : fallbackMode
                    ? "rgba(220, 38, 38, 0.5)"
                    : "rgba(100, 116, 139, 0.4)",
              boxShadow: isSpeaking
                ? "0 0 10px rgba(198, 168, 107, 0.6)"
                : "none",
              transition: "all 0.3s ease",
            }}
          />

          {/* Act label */}
          {currentStep && (
            <span
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: isSpeaking ? "#c6a86b" : "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                transition: "color 0.3s ease",
              }}
            >
              {currentStep.actLabel ?? currentStep.title ?? "Concierge"}
            </span>
          )}

          {/* Step counter */}
          <span
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: "#475569",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {state.stepIndex + 1}
            <span style={{ color: "#1e293b", margin: "0 2px" }}>/</span>
            {totalSteps}
          </span>

          {/* Voice status icon */}
          {fallbackMode ? (
            <VolumeX style={{ width: 12, height: 12, color: "#dc2626", opacity: 0.6 }} />
          ) : conciergeStatus === "active" ? (
            <Volume2
              style={{
                width: 12,
                height: 12,
                color: isSpeaking ? "#c6a86b" : "#334155",
                transition: "color 0.3s ease",
              }}
            />
          ) : null}

          {/* Exit button */}
          <button
            onClick={exitTour}
            style={{
              display: "flex",
              alignItems: "center",
              padding: 3,
              background: "transparent",
              border: "none",
              color: "#334155",
              cursor: "pointer",
              transition: "color 0.2s ease",
              marginLeft: 2,
            }}
            title="Exit Demo"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* ── Voice Fallback Banner (bottom, non-blocking) ── */}
      {fallbackMode && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: PILL_Z,
            animation: "conciergePillFadeIn 0.4s ease forwards",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(3, 7, 18, 0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(100, 116, 139, 0.2)",
              borderRadius: 12,
              padding: "10px 20px",
            }}
          >
            <VolumeX style={{ width: 14, height: 14, color: "#64748b", flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 12,
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              Voice guidance unavailable. You may continue the live demo manually.
            </span>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
