"use client";

/* ================================================================
   GHOST CURSOR — Animated SVG cursor for autopilot demonstrations
   
   Rules:
   1. Rendered via createPortal to document.body
   2. Positioned via framer-motion for fluid easing
   3. Exposed via forwardRef + useImperativeHandle
   4. Click animation: scale pulse + ripple
   5. Hidden when autopilot is idle
   ================================================================ */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, animate } from "framer-motion";

/* ---------- Imperative Handle ---------- */

export interface GhostCursorHandle {
  /** Smoothly move cursor to (x, y) over durationMs */
  moveTo: (x: number, y: number, durationMs?: number) => Promise<void>;
  /** Move to element center and perform click animation */
  clickAt: (x: number, y: number) => Promise<void>;
  /** Move to a DOM selector's center */
  moveToSelector: (selector: string, durationMs?: number) => Promise<void>;
  /** Hide the cursor */
  hide: () => void;
  /** Show the cursor */
  show: () => void;
}

/* ---------- Component ---------- */

export const GhostCursor = forwardRef<GhostCursorHandle>(
  function GhostCursor(_props, ref) {
    const mounted = typeof window !== "undefined";
    const [visible, setVisible] = useState(false);
    const [clicking, setClicking] = useState(false);
    const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
    const initialPos = { x: mounted ? window.innerWidth / 2 : 0, y: mounted ? window.innerHeight / 2 : 0 };
    const posRef = useRef(initialPos);
    const [pos, setPos] = useState(initialPos);

    const moveTo = useCallback(
      async (x: number, y: number, durationMs: number = 600) => {
        setVisible(true);
        const startX = posRef.current.x;
        const startY = posRef.current.y;

        await new Promise<void>((resolve) => {
          animate(0, 1, {
            duration: durationMs / 1000,
            ease: [0.33, 1, 0.68, 1], // easeOutCubic
            onUpdate: (progress) => {
              const newX = startX + (x - startX) * progress;
              const newY = startY + (y - startY) * progress;
              posRef.current = { x: newX, y: newY };
              setPos({ x: newX, y: newY });
            },
            onComplete: resolve,
          });
        });
      },
      [],
    );

    const clickAt = useCallback(
      async (x: number, y: number) => {
        await moveTo(x, y, 400);
        setClicking(true);
        setRipple({ x, y });
        await new Promise<void>((r) => setTimeout(r, 300));
        setClicking(false);
        await new Promise<void>((r) => setTimeout(r, 200));
        setRipple(null);
      },
      [moveTo],
    );

    const moveToSelector = useCallback(
      async (selector: string, durationMs: number = 600) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        await moveTo(cx, cy, durationMs);
      },
      [moveTo],
    );

    const hide = useCallback(() => setVisible(false), []);
    const show = useCallback(() => setVisible(true), []);

    useImperativeHandle(ref, () => ({
      moveTo,
      clickAt,
      moveToSelector,
      hide,
      show,
    }));

    if (!mounted) return null;

    return createPortal(
      <>
        {/* Cursor SVG */}
        <motion.div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            x: pos.x,
            y: pos.y,
            zIndex: 10000,
            pointerEvents: "none",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          animate={{
            scale: clicking ? 0.85 : 1,
          }}
          transition={{ duration: 0.15 }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
              fill="#c6a86b"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </svg>
        </motion.div>

        {/* Ripple effect on click */}
        {ripple && (
          <motion.div
            style={{
              position: "fixed",
              left: ripple.x,
              top: ripple.y,
              zIndex: 9999,
              pointerEvents: "none",
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              borderRadius: "50%",
              border: "2px solid #c6a86b",
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </>,
      document.body,
    );
  },
);
