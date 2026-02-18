/* ================================================================
   USE TOUR TARGET — Resolves a CSS selector to a DOM element
   
   Uses requestAnimationFrame loop for up to 1500ms.
   Returns { element, found, searching }.
   Logs console.warn if target not found.
   ================================================================ */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TourTargetResult {
  element: HTMLElement | null;
  found: boolean;
  searching: boolean;
}

/** Maximum time (ms) to search for a target element */
const MAX_SEARCH_MS = 1500;

/**
 * Resolve a target selector string to a DOM element.
 * Retries via rAF loop for up to MAX_SEARCH_MS.
 */
export function useTourTarget(
  selector: string | undefined,
  stepId: string,
): TourTargetResult {
  const [result, setResult] = useState<TourTargetResult>({
    element: null,
    found: false,
    searching: !!selector,
  });
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const search = useCallback(() => {
    if (!selector) {
      setResult({ element: null, found: false, searching: false });
      return;
    }

    startTimeRef.current = performance.now();

    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        setResult({ element: el, found: true, searching: false });
        return;
      }

      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed >= MAX_SEARCH_MS) {
        console.warn(`[Tour] Target not found: "${selector}" (step: ${stepId})`);
        setResult({ element: null, found: false, searching: false });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [selector, stepId]);

  useEffect(() => {
    if (!selector) {
      setResult({ element: null, found: false, searching: false });
      return;
    }

    setResult({ element: null, found: false, searching: true });
    search();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [selector, search]);

  return result;
}

/* ---------- Scroll Parent Detection ---------- */

/**
 * Find the nearest scrollable ancestor of an element.
 * Used by TourHighlighter to attach scroll listeners.
 */
export function getScrollParent(el: HTMLElement): HTMLElement {
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowX === "auto" ||
      overflowX === "scroll"
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

/**
 * Scroll element into view if not visible using IntersectionObserver fallback.
 */
export function ensureElementVisible(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    if (inView) {
      resolve();
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Wait for scroll to settle
    setTimeout(resolve, 400);
  });
}
