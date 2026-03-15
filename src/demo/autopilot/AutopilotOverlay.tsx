"use client";

/* ================================================================
   AUTOPILOT OVERLAY — Minimal HUD during autonomous demo execution
   
   Fixed bottom-left, shows:
   - Current phase name
   - Step counter (3/10)
   - Speaking waveform indicator
   - Pause / Abort controls
   
   Hidden when autopilot is idle.
   ================================================================ */

import { createPortal } from "react-dom";

import { Pause, Play, Square, Radio } from "lucide-react";
import { useAutopilot } from "./AutopilotProvider";
import { PHASE_LABELS } from "./autopilotTypes";

const OVERLAY_Z = 9999;

export function AutopilotOverlay() {
  const {
    state,
    currentLabel,
    currentPhaseName,
    abort,
    pause,
    resume,
    isSpeaking,
    volumeLevel,
  } = useAutopilot();

  const mounted = typeof window !== "undefined";
  if (!mounted) return null;
  if (state.status === "idle") return null;

  // Completed state
  if (state.status === "completed") {
    return createPortal(
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: OVERLAY_Z,
          width: 360,
        }}
      >
        <div
          style={{
            background: "rgba(10, 17, 40, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(63, 174, 122, 0.4)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#3fae7a",
                boxShadow: "0 0 8px rgba(63, 174, 122, 0.6)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#3fae7a",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Demonstration Complete
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "#7f8ca3",
              marginTop: 8,
              lineHeight: "1.5",
            }}
          >
            All 6 phases executed. {state.totalSteps} steps completed.
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  // Aborted state
  if (state.status === "aborted") {
    return createPortal(
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: OVERLAY_Z,
          width: 320,
        }}
      >
        <div
          style={{
            background: "rgba(10, 17, 40, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(209, 106, 93, 0.4)",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#d16a5d",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Demo Aborted
          </span>
        </div>
      </div>,
      document.body,
    );
  }

  // Active/Running HUD
  const phaseKey = currentPhaseName;
  const phaseLabel =
    PHASE_LABELS[phaseKey as keyof typeof PHASE_LABELS] ?? phaseKey;
  const isPaused = state.status === "paused";

  // Volume bars for speaking indicator
  const bars = Array.from({ length: 5 }, (_, i) => {
    const threshold = (i + 1) * 0.15;
    const active = isSpeaking && volumeLevel > threshold;
    return (
      <div
        key={i}
        style={{
          width: 3,
          height: active ? 12 + i * 2 : 4,
          borderRadius: 2,
          background: active ? "#c6a86b" : "#243653",
          transition: "height 0.15s ease, background 0.15s ease",
        }}
      />
    );
  });

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: OVERLAY_Z,
        width: 380,
      }}
    >
      <div
        style={{
          background: "rgba(10, 17, 40, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(198, 168, 107, 0.25)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Top bar — phase + step counter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(36, 54, 83, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Radio
              style={{
                width: 14,
                height: 14,
                color: isPaused ? "#7f8ca3" : "#c6a86b",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#c6a86b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Autopilot {isPaused ? "· Paused" : "· Live"}
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#7f8ca3",
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {state.stepIndex + 1} / {state.totalSteps}
          </span>
        </div>

        {/* Phase + Step label */}
        <div style={{ padding: "10px 16px" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "#7f8ca3",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 4,
            }}
          >
            {phaseLabel}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#e7ecf4",
            }}
          >
            {currentLabel}
          </div>

          {/* Status indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  state.status === "speaking"
                    ? "#c6a86b"
                    : state.status === "animating"
                      ? "#5a8ccb"
                      : state.status === "navigating"
                        ? "#7f8ca3"
                        : "#3fae7a",
                boxShadow:
                  state.status === "speaking"
                    ? "0 0 6px rgba(198, 168, 107, 0.5)"
                    : "none",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "#7f8ca3",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 500,
              }}
            >
              {state.status}
            </span>

            {/* Volume bars */}
            {isSpeaking && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                  marginLeft: "auto",
                  height: 20,
                }}
              >
                {bars}
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px 12px",
            borderTop: "1px solid rgba(36, 54, 83, 0.4)",
          }}
        >
          {/* Pause / Resume */}
          <button
            onClick={isPaused ? resume : pause}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              background: "rgba(36, 54, 83, 0.5)",
              border: "1px solid rgba(36, 54, 83, 0.8)",
              borderRadius: 6,
              color: "#aab6c8",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isPaused ? (
              <Play style={{ width: 10, height: 10 }} />
            ) : (
              <Pause style={{ width: 10, height: 10 }} />
            )}
            {isPaused ? "Resume" : "Pause"}
          </button>

          {/* Abort */}
          <button
            onClick={abort}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              background: "rgba(209, 106, 93, 0.1)",
              border: "1px solid rgba(209, 106, 93, 0.3)",
              borderRadius: 6,
              color: "#d16a5d",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Square style={{ width: 8, height: 8, fill: "currentColor" }} />
            Abort
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
