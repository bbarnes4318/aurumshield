/* ================================================================
   TOUR HIGHLIGHTER — Clean outline around target element
   
   Positions a 2px solid outline around the target element.
   NO full-page dimming mask — the user must be able to see and
   interact with the entire page at all times.
   
   Handles scroll containers, resize, and auto-scrolls
   the target into view if not visible.
   ================================================================ */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./TourProvider";
import { useTourTarget, getScrollParent, ensureElementVisible } from "./useTourTarget";

/** Padding around the highlighted element (px) */
const HIGHLIGHT_PAD = 6;
/** Z-index for the highlight outline */
const HIGHLIGHT_Z = 9991;

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourHighlighter() {
  const { state, currentStep } = useTour();
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const selector = currentStep?.target;
  const { element, found } = useTourTarget(
    state.status === "active" ? selector : undefined,
    currentStep?.id ?? "none",
  );

  // Client-side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
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

  // Attach scroll + resize listeners
  useEffect(() => {
    if (!element || state.status !== "active") {
      setRect(null);
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

  // Don't render anything if not active or no target
  if (!mounted || state.status !== "active") return null;

  // If no selector or target not found — render nothing (no mask, no overlay)
  if (!selector || !found || !rect) return null;

  // Render ONLY the highlight outline — NO full-page dimming mask
  return createPortal(
    <>
      {/* Highlight outline — 2px solid, no glow, no pulse */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: HIGHLIGHT_Z,
          border: "2px solid var(--gold, #c6a86b)",
          borderRadius: "var(--radius-sm, 10px)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Optional dashed inner ring */}
      <div
        style={{
          position: "fixed",
          top: rect.top + 3,
          left: rect.left + 3,
          width: rect.width - 6,
          height: rect.height - 6,
          zIndex: HIGHLIGHT_Z,
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
