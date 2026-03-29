/* ================================================================
   TOUR HIGHLIGHTER — Cinematic Spotlight Engine (v3)
   
   Ultra-premium highlighting for institutional gold demo:

   1. Full-screen backdrop-blur dim overlay (bg-black/40 + blur-md)
      with an SVG mask cutout around the target element. The dim
      fades smoothly in/out with CSS transitions.

   2. Double-ring gold pulse animation around the active element:
      - Outer ring: slow ambient glow (3s cycle)
      - Inner ring: crisp 1px border for precision

   3. Concierge-driven highlights: When the Gemini voice agent calls
      highlight_element, state.highlightSelector is set. We use that
      as a secondary target source (alongside the tour step target).

   4. Target element is elevated above the overlay via z-index
      injection so it remains interactive.
   ================================================================ */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./TourProvider";
import { useTourTarget, getScrollParent, ensureElementVisible } from "./useTourTarget";

/** Padding around the highlighted element (px) */
const HIGHLIGHT_PAD = 12;
/** Z-index for the dim overlay */
const OVERLAY_Z = 99998;
/** Z-index applied to the target element itself */
const TARGET_Z = 99999;

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/* ── Inject global keyframes once ── */
const STYLE_ID = "cinematic-highlighter-v3";
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes conciergeRingPulse {
      0%, 100% {
        box-shadow:
          0 0 0 1px rgba(198, 168, 107, 0.5),
          0 0 20px rgba(198, 168, 107, 0.15),
          0 0 40px rgba(198, 168, 107, 0.05);
      }
      50% {
        box-shadow:
          0 0 0 1px rgba(198, 168, 107, 0.8),
          0 0 30px rgba(198, 168, 107, 0.3),
          0 0 60px rgba(198, 168, 107, 0.1);
      }
    }
    @keyframes conciergeRingBreathe {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.015); }
    }
    @keyframes conciergeFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function TourHighlighter() {
  const { state, currentStep } = useTour();
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

  // Determine the active selector: concierge highlight takes priority,
  // then fall back to the current tour step's target
  const conciergeSelector = state.highlightSelector;
  const stepSelector = currentStep?.target;
  const activeSelector = conciergeSelector || stepSelector;

  const { element, found } = useTourTarget(
    state.status === "active" ? activeSelector : undefined,
    `${currentStep?.id ?? "none"}-${conciergeSelector ?? ""}`,
  );

  // Sync hook return into mutable ref
  useEffect(() => {
    elementRef.current = element;
  }, [element]);

  const mounted = typeof window !== "undefined";

  // Inject keyframes on mount
  useEffect(() => {
    ensureStyles();
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

  /* ── Z-Index injection on target element ── */
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
    if (!el || state.status !== "active") return;

    // Back up original styles
    targetStyleBackupRef.current = {
      position: el.style.position,
      zIndex: el.style.zIndex,
      pointerEvents: el.style.pointerEvents,
      isolation: el.style.isolation,
    };
    lastTargetRef.current = el;

    // Inject z-index elevation — target pokes above the dim overlay
    el.style.position = "relative";
    el.style.zIndex = String(TARGET_Z);
    el.style.pointerEvents = "auto";
    el.style.isolation = "isolate";

    return () => {
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
  }, [element, state.status]);

  // Attach scroll + resize listeners
  useEffect(() => {
    if (!element || state.status !== "active") {
      return;
    }

    ensureElementVisible(element).then(() => {
      updateRect();
    });

    const scrollParent = getScrollParent(element);

    const handleUpdate = () => {
      updateRect();
    };

    scrollParent.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });

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

  // Don't render anything if not active or no target
  if (!mounted || state.status !== "active") return null;
  if (!activeSelector || !found || !rect) return null;

  /* ═══════════════════════════════════════════════════════════
     CINEMATIC SPOTLIGHT — Premium dim + gold ring
     
     Uses a full-screen dark overlay with backdrop-blur and an
     SVG mask to create a crisp rectangular cutout around the
     target element. The gold ring pulses outside the cutout.
     ═══════════════════════════════════════════════════════════ */

  // SVG mask dimensions
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

  // Corner radius for the cutout
  const cutoutRadius = 10;

  return createPortal(
    <>
      {/* ── Full-screen dim overlay with cutout ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: OVERLAY_Z,
          pointerEvents: "none",
          animation: "conciergeFadeIn 0.4s ease forwards",
        }}
        aria-hidden="true"
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${vw} ${vh}`}
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <mask id="concierge-spotlight-mask">
              {/* White = visible (dim), Black = hidden (cutout) */}
              <rect width={vw} height={vh} fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={cutoutRadius}
                ry={cutoutRadius}
                fill="black"
              />
            </mask>
          </defs>
          {/* The dim layer — masked to exclude the target area */}
          <rect
            width={vw}
            height={vh}
            fill="rgba(0, 0, 0, 0.45)"
            mask="url(#concierge-spotlight-mask)"
          />
        </svg>

        {/* Backdrop blur layer — same mask via clip-path */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%,
              0% ${rect.top}px,
              ${rect.left}px ${rect.top}px,
              ${rect.left}px ${rect.top + rect.height}px,
              0% ${rect.top + rect.height}px
            )`,
          }}
        />
      </div>

      {/* ── Outer gold glow ring — ambient pulse ── */}
      <div
        style={{
          position: "fixed",
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          zIndex: TARGET_Z + 1,
          borderRadius: cutoutRadius + 4,
          pointerEvents: "none",
          animation: "conciergeRingPulse 3s ease-in-out infinite",
        }}
        aria-hidden="true"
      />

      {/* ── Inner precision ring — crisp gold border ── */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: TARGET_Z + 1,
          border: "1.5px solid rgba(198, 168, 107, 0.7)",
          borderRadius: cutoutRadius,
          pointerEvents: "none",
          animation: "conciergeRingBreathe 3s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
    </>,
    document.body,
  );
}
