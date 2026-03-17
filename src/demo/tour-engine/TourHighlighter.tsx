/* ================================================================
   TOUR HIGHLIGHTER — Glass Shield Engine
   
   Amendment 1: Bulletproof Click Control via Z-Index Method
   
   Architecture:
   1. Full-screen dark overlay at z-index 99998 with pointer-events: auto
      → Physically blocks all clicks on the page
   2. Target element gets dynamically injected inline styles:
      position: relative; z-index: 99999; pointer-events: auto;
      → The ONLY clickable element on the page
   3. Pulsing gold glow ring + animated arrow pointing at target
   4. On-screen script tooltip mirroring Vapi voice
   ================================================================ */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./TourProvider";
import { useTourTarget, getScrollParent, ensureElementVisible } from "./useTourTarget";

/** Padding around the highlighted element (px) */
const HIGHLIGHT_PAD = 8;
/** Z-index for the dark blocking overlay */
const SHIELD_Z = 99998;
/** Z-index applied to the target element itself */
const TARGET_Z = 99999;

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/* ── Keyframe injection (runs once) ── */
const STYLE_ID = "glass-shield-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes glassShieldPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(198,168,107,0.3), 0 0 30px rgba(198,168,107,0.1); }
      50% { box-shadow: 0 0 25px rgba(198,168,107,0.6), 0 0 50px rgba(198,168,107,0.2); }
    }
    @keyframes glassShieldArrow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes glassShieldFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function TourHighlighter() {
  const { state, currentStep, tour } = useTour();
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const targetStyleBackupRef = useRef<{
    position: string;
    zIndex: string;
    pointerEvents: string;
    isolation: string;
  } | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const isCinematic = tour?.cinematic === true;
  const selector = currentStep?.target;
  const { element, found } = useTourTarget(
    state.status === "active" ? selector : undefined,
    currentStep?.id ?? "none",
  );

  // Sync hook return into mutable ref via effect (React compiler forbids ref writes during render)
  useEffect(() => {
    elementRef.current = element;
  }, [element]);

  const mounted = typeof window !== "undefined";

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Calculate and track element position
  const updateRect = useCallback(() => {
    if (!element) {
      setRect(null);
      return;
    }
    const r = element.getBoundingClientRect();
    setRect({
      top: r.top - HIGHLIGHT_PAD,
      left: r.left - HIGHLIGHT_PAD,
      width: r.width + HIGHLIGHT_PAD * 2,
      height: r.height + HIGHLIGHT_PAD * 2,
    });
  }, [element]);

  /* ── Amendment 1: Z-Index injection on target element ── */
  useEffect(() => {
    // Restore previous target styles
    if (lastTargetRef.current && targetStyleBackupRef.current) {
      const prev = lastTargetRef.current;
      const backup = targetStyleBackupRef.current;
      prev.style.position = backup.position;
      prev.style.zIndex = backup.zIndex;
      prev.style.pointerEvents = backup.pointerEvents;
      prev.style.isolation = backup.isolation;
      lastTargetRef.current = null;
      targetStyleBackupRef.current = null;
    }

    const el = elementRef.current;
    if (!el || state.status !== "active" || !isCinematic) return;

    // Back up original styles
    targetStyleBackupRef.current = {
      position: el.style.position,
      zIndex: el.style.zIndex,
      pointerEvents: el.style.pointerEvents,
      isolation: el.style.isolation,
    };
    lastTargetRef.current = el;

    // Inject z-index elevation
    el.style.position = "relative";
    el.style.zIndex = String(TARGET_Z);
    el.style.pointerEvents = "auto";
    el.style.isolation = "isolate";

    return () => {
      // Cleanup on unmount or element change
      if (lastTargetRef.current && targetStyleBackupRef.current) {
        const el = lastTargetRef.current;
        const backup = targetStyleBackupRef.current;
        el.style.position = backup.position;
        el.style.zIndex = backup.zIndex;
        el.style.pointerEvents = backup.pointerEvents;
        el.style.isolation = backup.isolation;
        lastTargetRef.current = null;
        targetStyleBackupRef.current = null;
      }
    };
  }, [element, state.status, isCinematic]);

  // Attach scroll + resize listeners
  useEffect(() => {
    if (!element || state.status !== "active") {
      return;
    }

    // Auto-scroll into view
    ensureElementVisible(element).then(() => {
      updateRect();
    });

    // Find nearest scroll parent and attach listener
    const scrollParent = getScrollParent(element);

    const handleUpdate = () => {
      updateRect();
    };

    // Scroll listener on scroll parent + window
    scrollParent.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });

    // ResizeObserver for element size changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleUpdate);
      resizeObserver.observe(element);
    }

    scrollCleanupRef.current = () => {
      scrollParent.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
      resizeObserver?.disconnect();
    };

    return () => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
    };
  }, [element, state.status, updateRect]);

  // Don't render anything if not active
  if (!mounted || state.status !== "active") return null;

  /* ── Non-cinematic: simple outline (backward compat) ── */
  if (!isCinematic) {
    if (!selector || !found || !rect) return null;
    return createPortal(
      <>
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: 9991,
            border: "2px solid var(--gold, #c6a86b)",
            borderRadius: "var(--radius-sm, 10px)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: "fixed",
            top: rect.top + 3,
            left: rect.left + 3,
            width: rect.width - 6,
            height: rect.height - 6,
            zIndex: 9991,
            border: "1px dashed var(--gold, #c6a86b)",
            borderRadius: "calc(var(--radius-sm, 10px) - 3px)",
            opacity: 0.4,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </>,
      document.body,
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CINEMATIC GLASS SHIELD MODE
     ═══════════════════════════════════════════════════════════ */

  // Compute arrow position
  const arrowTop = rect ? rect.top - 40 : -100;
  const arrowLeft = rect ? rect.left + rect.width / 2 - 12 : -100;

  return createPortal(
    <>
      {/* ── Full-screen dark overlay — blocks ALL clicks ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: SHIELD_Z,
          backgroundColor: "rgba(2, 6, 23, 0.75)",
          pointerEvents: "auto",
          animation: "glassShieldFadeIn 0.3s ease forwards",
        }}
        aria-hidden="true"
      />

      {/* ── Spotlight glow ring ── */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: TARGET_Z + 1,
            border: "2px solid #c6a86b",
            borderRadius: 8,
            pointerEvents: "none",
            animation: "glassShieldPulse 2s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Animated directional arrow ── */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: arrowTop,
            left: arrowLeft,
            zIndex: TARGET_Z + 1,
            pointerEvents: "none",
            animation: "glassShieldArrow 1.2s ease-in-out infinite",
          }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="32"
            viewBox="0 0 24 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 0L12 24M12 24L4 16M12 24L20 16"
              stroke="#c6a86b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* ── On-screen script tooltip ── */}
      {currentStep?.tooltipText && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top + rect.height + 16,
            left: Math.max(16, Math.min(rect.left, window.innerWidth - 420)),
            zIndex: TARGET_Z + 2,
            maxWidth: 400,
            pointerEvents: "none",
            animation: "glassShieldFadeIn 0.5s ease forwards",
          }}
        >
          <div
            style={{
              background: "rgba(10, 17, 40, 0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(198, 168, 107, 0.3)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            {currentStep.actLabel && (
              <div
                style={{
                  fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#c6a86b",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                }}
              >
                {currentStep.actLabel}
              </div>
            )}
            <p
              style={{
                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#c9d1d9",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              {currentStep.tooltipText}
            </p>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
