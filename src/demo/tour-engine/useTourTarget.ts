/* ================================================================
   USE TOUR TARGET — Resolves a CSS selector to a DOM element
   
   Uses MutationObserver + rAF polling for resilient element
   resolution across Next.js route changes.
   
   Amendment 3: Route-Change Resilience
   - MutationObserver watches for DOM additions after navigation
   - Safe retry with configurable timeout (5s for route transitions)
   - Never crashes if target doesn't exist — gracefully waits
   ================================================================ */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TourTargetResult {
  element: HTMLElement | null;
  found: boolean;
  searching: boolean;
}

/** Maximum time (ms) to search for a target element */
const MAX_SEARCH_MS = 5000;

/**
 * Resolve a target selector string to a DOM element.
 * Uses MutationObserver for resilient detection across route changes,
 * with rAF polling as a fallback.
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
  const observerRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!selector) {
      setResult({ element: null, found: false, searching: false });
      cleanup();
      return;
    }

    setResult({ element: null, found: false, searching: true });

    // Immediate check
    const immediateEl = document.querySelector<HTMLElement>(selector);
    if (immediateEl) {
      setResult({ element: immediateEl, found: true, searching: false });
      return;
    }

    // Strategy: MutationObserver + rAF polling for maximum resilience
    let resolved = false;

    const resolve = (el: HTMLElement) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      setResult({ element: el, found: true, searching: false });
    };

    const fail = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      console.warn(`[Tour] Target not found: "${selector}" (step: ${stepId})`);
      setResult({ element: null, found: false, searching: false });
    };

    // MutationObserver: watch for new DOM nodes
    const observer = new MutationObserver(() => {
      if (resolved) return;
      const el = document.querySelector<HTMLElement>(selector);
      if (el) resolve(el);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    observerRef.current = observer;

    // rAF polling fallback (catches cases MutationObserver misses)
    const poll = () => {
      if (resolved) return;
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        resolve(el);
        return;
      }
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);

    // Hard timeout — give up after MAX_SEARCH_MS
    timeoutRef.current = setTimeout(() => {
      if (!resolved) fail();
    }, MAX_SEARCH_MS);

    return () => {
      resolved = true;
      cleanup();
    };
  }, [selector, stepId, cleanup]);

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
