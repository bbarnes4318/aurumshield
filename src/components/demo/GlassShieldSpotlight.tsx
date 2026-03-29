"use client";

/* ================================================================
   GLASS SHIELD SPOTLIGHT — Visible gold ring around highlighted elements
   ================================================================
   Reads `highlightSelector` from tour state and renders a pulsing
   gold ring around the targeted DOM element. This is what connects
   the voice narration to something visible on screen.
   ================================================================ */

import { useEffect, useState, useCallback, useRef } from "react";
import { useTour } from "@/demo/tour-engine/TourProvider";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GlassShieldSpotlight() {
  const { state } = useTour();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!state.highlightSelector) {
      setVisible(false);
      return;
    }

    const el = document.querySelector(state.highlightSelector);
    if (!el) {
      setVisible(false);
      return;
    }

    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - 6,
      left: r.left - 6,
      width: r.width + 12,
      height: r.height + 12,
    });
    setVisible(true);
  }, [state.highlightSelector]);

  // Measure on selector change
  useEffect(() => {
    // Defer measurement to next frame to avoid sync setState in effect
    rafRef.current = requestAnimationFrame(measure);

    if (!state.highlightSelector) return;

    // Re-measure on scroll/resize
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);

    // Re-measure periodically (DOM may shift)
    const interval = setInterval(() => {
      rafRef.current = requestAnimationFrame(measure);
    }, 500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
      clearInterval(interval);
    };
  }, [state.highlightSelector, measure]);

  if (!visible || !rect) return null;

  return (
    <div
      className="fixed pointer-events-none z-9999 transition-all duration-500 ease-out"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    >
      {/* Gold ring */}
      <div className="absolute inset-0 border-2 border-[#C6A86B]/60 rounded-lg animate-pulse" />
      {/* Outer glow */}
      <div className="absolute -inset-2 border border-[#C6A86B]/20 rounded-xl" />
      {/* Ambient glow */}
      <div className="absolute -inset-4 bg-[#C6A86B]/5 rounded-2xl blur-md" />
    </div>
  );
}
