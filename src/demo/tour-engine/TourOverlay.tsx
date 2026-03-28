/* ================================================================
   TOUR OVERLAY — Cinematic HUD Panel
   
   Fixed overlay panel showing:
   - Act label + step counter (ACT I — 3 / 9)
   - Title + body
   - Click-to-continue indicator
   - Back / Next buttons (Next disabled if click-gated)
   - Jump dropdown, Pause/Resume/Restart/Exit controls
   - Vapi speaking indicator with volume bars
   
   In cinematic mode: institutional dark glassmorphism styling.
   In standard mode: calm institutional card styling.
   ================================================================ */

"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  X,
  ChevronDown,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";
import { useTour } from "./TourProvider";
import { useTourTarget } from "./useTourTarget";
import { ROLE_DISPLAY } from "./tourTypes";
import type { UserRole } from "@/lib/mock-data";

/** Z-index for the overlay panel — above the Glass Shield */
const OVERLAY_Z = 100000;

/* Inject speaking pulse keyframe once */
const OV_STYLE_ID = "tour-overlay-keyframes";
function ensureOverlayStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(OV_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = OV_STYLE_ID;
  style.textContent = `
    @keyframes conciergeSpeakingPulse {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.3); }
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
    nextStep,
    prevStep,
    jumpToStep,
    pauseTour,
    resumeTour,
    exitTour,
    restartTour,
    completeCurrentStep,
    concierge: { isSpeaking },
  } = useTour();

  const [showJump, setShowJump] = useState(false);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);
  const mounted = typeof window !== "undefined";

  const isCinematic = tour?.cinematic === true;

  // Inject overlay keyframes
  useEffect(() => { ensureOverlayStyles(); }, []);

  // Reset step completion and dropdown on step change
  const stepKey = `${state.tourId}-${state.stepIndex}`;
  const prevStepKeyRef = useRef(stepKey);
  useEffect(() => {
    if (stepKey !== prevStepKeyRef.current) {
      prevStepKeyRef.current = stepKey;
      // Intentional sync reset when step changes — not a cascading side-effect
      // eslint-disable-next-line
      setStepCompleted(false);
      setShowJump(false);
      setMinimized(false);
    }
  }, [stepKey]);

  // Resolve target for click gating
  const targetSelector =
    currentStep?.next.type === "click" ? currentStep.next.target : undefined;
  const { element: targetElement } = useTourTarget(
    state.status === "active" ? targetSelector : undefined,
    currentStep?.id ?? "none",
  );

  // Click gating: listen for click on target element
  useEffect(() => {
    if (state.status !== "active") return;
    if (!currentStep || currentStep.next.type !== "click") return;
    if (!targetElement) return;

    const handleClick = () => {
      setStepCompleted(true);
      // Auto-advance after a brief delay
      setTimeout(() => {
        completeCurrentStep();
      }, 300);
    };

    targetElement.addEventListener("click", handleClick);
    return () => {
      targetElement.removeEventListener("click", handleClick);
    };
  }, [state.status, currentStep, targetElement, completeCurrentStep]);

  // Element completion: wait for element to appear
  useEffect(() => {
    if (state.status !== "active") return;
    if (!currentStep || currentStep.next.type !== "element") return;

    const target = currentStep.next.target;
    const startTime = performance.now();

    const check = () => {
      const el = document.querySelector(target);
      if (el) {
        setStepCompleted(true);
        setTimeout(() => completeCurrentStep(), 300);
        return;
      }
      if (performance.now() - startTime < 10000) {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  }, [state.status, currentStep, completeCurrentStep]);

  // Close jump dropdown on outside click
  useEffect(() => {
    if (!showJump) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) {
        setShowJump(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showJump]);

  // Determine if Next button should be disabled
  const isClickGated =
    currentStep?.next.type === "click" && !stepCompleted;
  const isElementGated =
    currentStep?.next.type === "element" && !stepCompleted;
  const nextDisabled = isClickGated || isElementGated;

  if (!mounted) return null;
  if (state.status === "idle") return null;
  if (!tour || !currentStep) {
    // Tour completed overlay
    if (state.status === "completed" && tour) {
      return createPortal(
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: OVERLAY_Z,
            width: 380,
          }}
        >
          <div
            style={isCinematic ? {
              background: "rgba(10, 17, 40, 0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(63, 174, 122, 0.4)",
              borderRadius: 12,
              padding: "20px 24px",
            } : undefined}
            className={isCinematic ? undefined : "card-base border border-border p-5"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <CheckCircle2
                style={{ width: 20, height: 20, color: "#3fae7a" }}
              />
              <span
                style={{
                  fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
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
                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#7f8ca3",
                lineHeight: "1.6",
                marginBottom: 16,
              }}
            >
              {totalSteps} steps executed across the AurumShield sovereign ecosystem.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={restartTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: "rgba(36, 54, 83, 0.5)",
                  border: "1px solid rgba(36, 54, 83, 0.8)",
                  borderRadius: 6,
                  color: "#aab6c8",
                  fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw style={{ width: 12, height: 12 }} />
                Restart
              </button>
              <button
                onClick={exitTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: "#c6a86b",
                  border: "none",
                  borderRadius: 6,
                  color: "#0a1128",
                  fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body,
      );
    }
    return null;
  }

  // Paused overlay
  if (state.status === "paused") {
    return createPortal(
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: OVERLAY_Z,
          width: 300,
        }}
      >
        <div
          style={isCinematic ? {
            background: "rgba(10, 17, 40, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(198, 168, 107, 0.25)",
            borderRadius: 12,
            padding: "14px 18px",
          } : undefined}
          className={isCinematic ? undefined : "card-base border border-border p-4"}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "#c6a86b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Tour Paused
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={resumeTour}
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
                }}
              >
                <Play style={{ width: 10, height: 10 }} />
                Resume
              </button>
              <button
                onClick={exitTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 8px",
                  background: "rgba(36, 54, 83, 0.5)",
                  border: "1px solid rgba(36, 54, 83, 0.8)",
                  borderRadius: 6,
                  color: "#7f8ca3",
                  cursor: "pointer",
                }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CINEMATIC OVERLAY — Premium institutional HUD
     Refined glassmorphism panel with gold accent line
     ═══════════════════════════════════════════════════════════ */
  if (isCinematic) {
    /* ── Minimized pill view ── */
    if (minimized) {
      return createPortal(
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 24,
            zIndex: OVERLAY_Z,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(3, 7, 18, 0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(198, 168, 107, 0.15)",
              borderRadius: 24,
              padding: "8px 18px",
            }}
          >
            {/* Live dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isSpeaking ? "#c6a86b" : "rgba(198, 168, 107, 0.4)",
                boxShadow: isSpeaking ? "0 0 8px rgba(198, 168, 107, 0.5)" : "none",
                transition: "all 0.3s ease",
              }}
            />
            <span
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "#94a3b8",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {state.stepIndex + 1}
              <span style={{ color: "#475569", margin: "0 2px" }}>/</span>
              {totalSteps}
            </span>
            <button
              onClick={() => setMinimized(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                background: "rgba(198, 168, 107, 0.1)",
                border: "1px solid rgba(198, 168, 107, 0.2)",
                borderRadius: 12,
                color: "#c6a86b",
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Expand
            </button>
          </div>
        </div>,
        document.body,
      );
    }

    /* ── Full cinematic HUD — top-right, compact ── */
    return createPortal(
      <div
        style={{
          position: "fixed",
          top: 72,
          right: 24,
          zIndex: OVERLAY_Z,
          width: 340,
        }}
      >
        <div
          style={{
            background: "rgba(3, 7, 18, 0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(198, 168, 107, 0.1)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Gold accent line */}
          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(198, 168, 107, 0.5), transparent)",
            }}
          />

          {/* Header — step counter + controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(30, 41, 59, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Live indicator */}
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isSpeaking ? "#c6a86b" : "rgba(198, 168, 107, 0.3)",
                  boxShadow: isSpeaking ? "0 0 8px rgba(198, 168, 107, 0.5)" : "none",
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#c6a86b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {currentStep.actLabel ?? "Concierge"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#475569",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {state.stepIndex + 1} / {totalSteps}
              </span>
              <button
                onClick={() => setMinimized(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 3,
                  background: "transparent",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                title="Minimize"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          {/* Step content */}
          <div style={{ padding: "14px 16px 12px" }}>
            <h3
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#e2e8f0",
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              {currentStep.title}
            </h3>
            <p
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 12,
                color: "#64748b",
                lineHeight: 1.6,
                marginBottom: 10,
              }}
            >
              {currentStep.body}
            </p>

            {/* Click-to-continue indicator */}
            {isClickGated && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(198, 168, 107, 0.06)",
                  border: "1px solid rgba(198, 168, 107, 0.15)",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <MousePointerClick style={{ width: 13, height: 13, color: "rgba(198, 168, 107, 0.6)" }} />
                <span
                  style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: 11,
                    color: "rgba(198, 168, 107, 0.7)",
                    fontWeight: 500,
                  }}
                >
                  Click the highlighted element to continue
                </span>
              </div>
            )}

            {/* Speaking indicator */}
            {isSpeaking && (
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
                    background: "#c6a86b",
                    boxShadow: "0 0 8px rgba(198, 168, 107, 0.5)",
                    animation: "conciergeSpeakingPulse 1.5s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: 9,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 600,
                  }}
                >
                  Speaking
                </span>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              padding: "8px 16px 12px",
              borderTop: "1px solid rgba(30, 41, 59, 0.4)",
            }}
          >
            <button
              onClick={prevStep}
              disabled={state.stepIndex <= 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "5px 12px",
                background: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(30, 41, 59, 0.6)",
                borderRadius: 7,
                color: state.stepIndex <= 0 ? "#1e293b" : "#94a3b8",
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 11,
                fontWeight: 500,
                cursor: state.stepIndex <= 0 ? "not-allowed" : "pointer",
                opacity: state.stepIndex <= 0 ? 0.4 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <ChevronLeft style={{ width: 11, height: 11 }} />
              Back
            </button>
            <div style={{ display: "flex", gap: 5 }}>
              <button
                onClick={pauseTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 8px",
                  background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(30, 41, 59, 0.6)",
                  borderRadius: 7,
                  color: "#64748b",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Pause"
              >
                <Pause style={{ width: 11, height: 11 }} />
              </button>
              <button
                onClick={exitTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 8px",
                  background: "rgba(127, 29, 29, 0.08)",
                  border: "1px solid rgba(127, 29, 29, 0.2)",
                  borderRadius: 7,
                  color: "#dc2626",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Exit Demo"
              >
                <X style={{ width: 11, height: 11 }} />
              </button>
              <button
                onClick={nextStep}
                disabled={nextDisabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "5px 14px",
                  background: nextDisabled ? "rgba(30, 41, 59, 0.4)" : "rgba(198, 168, 107, 0.9)",
                  border: nextDisabled ? "1px solid rgba(30, 41, 59, 0.6)" : "1px solid rgba(198, 168, 107, 0.5)",
                  borderRadius: 7,
                  color: nextDisabled ? "#1e293b" : "#020617",
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: nextDisabled ? "not-allowed" : "pointer",
                  opacity: nextDisabled ? 0.4 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                Next
                <ChevronRight style={{ width: 11, height: 11 }} />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STANDARD OVERLAY — Classic institutional step panel
     ═══════════════════════════════════════════════════════════ */

  const hasStructure = currentStep.structure && currentStep.structure.length > 0;
  const overlayStyle = getOverlayPositionStyle(currentStep.placement);

  return createPortal(
    <div
      style={{
        position: "fixed",
        ...overlayStyle,
        zIndex: OVERLAY_Z,
        width: 400,
        maxHeight: "80vh",
      }}
    >
      <div className="card-base border border-border overflow-hidden">
        {/* Top control bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-surface-2">
          <span className="typo-mono text-[10px] text-text-faint font-semibold tabular-nums">
            {state.stepIndex + 1} / {totalSteps}
          </span>
          <span className="text-[10px] text-text-faint uppercase tracking-widest font-semibold truncate mx-3">
            {ROLE_DISPLAY[tour.role as UserRole] ?? tour.role}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={pauseTour}
              className="rounded p-1 text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
              title="Pause Tour"
            >
              <Pause className="h-3 w-3" />
            </button>
            <button
              onClick={restartTour}
              className="rounded p-1 text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
              title="Restart Tour"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={exitTour}
              className="rounded p-1 text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
              title="Exit Tour"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Step content */}
        <div className="px-4 py-3.5 space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          <h3 className="text-sm font-semibold text-text">{currentStep.title}</h3>
          <p className="text-xs text-text-muted leading-relaxed">{currentStep.body}</p>

          {hasStructure && (
            <div className="space-y-2 pt-1">
              {currentStep.structure!.map((item, idx) => (
                <div key={idx}>
                  <span className="text-[9px] uppercase tracking-widest text-text-faint font-semibold">
                    {item.label}
                  </span>
                  <p className="mt-0.5 text-[11px] text-text-muted leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {isClickGated && (
            <div className="flex items-center gap-2 rounded-sm border border-gold/20 bg-gold/5 px-3 py-2">
              <MousePointerClick className="h-3.5 w-3.5 text-gold/70" />
              <span className="text-[11px] text-gold/80 font-medium">
                Click the highlighted element to continue
              </span>
            </div>
          )}

          {isElementGated && (
            <div className="flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-3 py-2">
              <span className="text-[11px] text-text-faint font-medium">
                Waiting for element to appear…
              </span>
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-surface-2">
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={state.stepIndex <= 0}
              className="flex items-center gap-1 rounded-sm border border-border bg-surface-1 px-2.5 py-1.5 text-[11px] font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Jump dropdown */}
            <div className="relative" ref={jumpRef}>
              <button
                onClick={() => setShowJump(!showJump)}
                className="flex items-center gap-1 rounded-sm border border-border bg-surface-1 px-2 py-1.5 text-[10px] font-medium text-text-faint transition-colors hover:text-text hover:bg-surface-3"
                title="Jump to step"
              >
                Jump
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
              {showJump && (
                <div
                  className="absolute bottom-full right-0 mb-1 w-56 max-h-64 overflow-y-auto rounded-sm border border-border bg-surface-1 py-1"
                  style={{ zIndex: OVERLAY_Z + 1 }}
                >
                  {tour.steps.map((step, idx) => (
                    <button
                      key={step.id}
                      onClick={() => {
                        jumpToStep(idx);
                        setShowJump(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                        idx === state.stepIndex
                          ? "bg-gold/10 text-gold font-medium"
                          : "text-text-muted hover:bg-surface-2 hover:text-text"
                      }`}
                    >
                      <span className="typo-mono text-[9px] text-text-faint mr-2 tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={nextStep}
              disabled={nextDisabled}
              className="flex items-center gap-1 rounded-sm bg-gold px-3 py-1.5 text-[11px] font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getOverlayPositionStyle(
  placement: string,
): React.CSSProperties {
  switch (placement) {
    case "center":
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "top":
    case "left":
      return { bottom: 24, left: 24 };
    case "right":
    case "bottom":
    default:
      return { bottom: 24, right: 24 };
  }
}
