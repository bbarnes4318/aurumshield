/* ================================================================
   TOUR DEBUG PANEL — Dev-only diagnostic overlay

   Visible only when URL has ?demo=true&debugTours=1
   Shows: current route, tour + step id, target selector,
   target found status, click-gated status, last click target.
   ================================================================ */

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { useTour } from "./TourProvider";

export function TourDebugPanel() {
  const [mounted, setMounted] = useState(false);
  const [lastClickTarget, setLastClickTarget] = useState<string>("—");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, tour, currentStep, totalSteps } = useTour();

  const isDebug =
    searchParams.get("demo") === "true" &&
    searchParams.get("debugTours") === "1";

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Track clicks globally to capture last-clicked data-tour target
  useEffect(() => {
    if (!isDebug) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const tourAttr =
        el.closest("[data-tour]")?.getAttribute("data-tour") ?? null;
      if (tourAttr) {
        setLastClickTarget(tourAttr);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDebug]);

  if (!mounted || !isDebug) return null;

  const targetSelector = currentStep?.target ?? "—";
  const targetFound = currentStep?.target
    ? !!document.querySelector(currentStep.target)
    : false;
  const isClickGated = currentStep?.next.type === "click";

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 99999,
        width: 320,
        fontFamily: "monospace",
        fontSize: 11,
        background: "rgba(10, 10, 10, 0.92)",
        border: "1px solid rgba(198, 168, 107, 0.3)",
        borderRadius: 6,
        padding: "10px 12px",
        color: "#ccc",
        pointerEvents: "auto",
        lineHeight: 1.7,
      }}
    >
      <div style={{ color: "#c6a86b", fontWeight: 700, marginBottom: 6, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Tour Debug Panel
      </div>
      <Row label="Route" value={pathname} />
      <Row label="Tour" value={state.tourId ?? "—"} />
      <Row label="Step" value={currentStep?.id ?? "—"} />
      <Row label="Step #" value={`${state.stepIndex + 1} / ${totalSteps}`} />
      <Row label="Status" value={state.status} />
      <Row label="Target" value={targetSelector} />
      <Row
        label="Target Found"
        value={currentStep?.target ? (targetFound ? "✓ YES" : "✗ NO") : "N/A"}
        color={currentStep?.target ? (targetFound ? "#4ade80" : "#f87171") : "#888"}
      />
      <Row
        label="Click-Gated"
        value={isClickGated ? "YES" : "NO"}
        color={isClickGated ? "#facc15" : "#888"}
      />
      <Row label="Last Click" value={lastClickTarget} />
    </div>,
    document.body,
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "#888" }}>{label}:</span>
      <span style={{ color: color ?? "#eee", textAlign: "right", wordBreak: "break-all", maxWidth: 200 }}>
        {value}
      </span>
    </div>
  );
}
