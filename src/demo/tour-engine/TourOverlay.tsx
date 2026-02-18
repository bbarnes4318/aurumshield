/* ================================================================
   TOUR OVERLAY — Institutional step panel
   
   Fixed overlay panel showing:
   - Step counter (3 / 18)
   - Title + body
   - Structured Risk / Control / Why block
   - Back / Next buttons (Next disabled if click-gated)
   - "Click target to continue" label
   - Jump dropdown, Pause/Resume/Restart/Exit controls
   
   Calm institutional styling. No gradients.
   ================================================================ */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

/** Z-index for the overlay panel */
const OVERLAY_Z = 9995;

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
  } = useTour();

  const [mounted, setMounted] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [stepCompleted, setStepCompleted] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  // Client mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset step completion on step change
  useEffect(() => {
    setStepCompleted(false);
    setShowJump(false);
  }, [state.stepIndex, state.tourId]);

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

  // Route completion: watch for pathname changes
  // (Handled in TourProvider's route navigation logic)

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
          <div className="card-base border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm font-semibold text-text">
                Tour Complete
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              You have completed the{" "}
              {ROLE_DISPLAY[tour.role as UserRole] ?? tour.role} guided tour.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={restartTour}
                className="flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-3 hover:text-text transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Restart
              </button>
              <button
                onClick={exitTour}
                className="flex items-center gap-1.5 rounded-sm bg-gold px-3 py-1.5 text-xs font-medium text-bg hover:bg-gold-hover transition-colors"
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
        <div className="card-base border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-faint uppercase tracking-wider">
              Tour Paused
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={resumeTour}
                className="flex items-center gap-1 rounded-sm border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
                title="Resume"
              >
                <Play className="h-3 w-3" />
                Resume
              </button>
              <button
                onClick={exitTour}
                className="flex items-center rounded-sm border border-border bg-surface-2 p-1 text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
                title="Exit Tour"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Active step overlay
  const hasStructure = currentStep.structure && currentStep.structure.length > 0;

  // Compute overlay position based on target and placement
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
          {/* Title */}
          <h3 className="text-sm font-semibold text-text">{currentStep.title}</h3>

          {/* Body */}
          <p className="text-xs text-text-muted leading-relaxed">
            {currentStep.body}
          </p>

          {/* Structured Risk / Control / Why block */}
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

          {/* Click-to-continue indicator */}
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

/**
 * Compute overlay position style. For center placement, use center of screen.
 * For directional placements, anchor to bottom-right for stability.
 */
function getOverlayPositionStyle(
  placement: string,
): React.CSSProperties {
  // For institutional demo, always anchor overlay to bottom-right for stability
  // This prevents the overlay from jumping around and maintains a professional feel
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
