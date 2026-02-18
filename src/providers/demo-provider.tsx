"use client";

/* ================================================================
   DEMO PROVIDER — Orchestration context for demo mode
   
   Rules:
   1. Demo mode requires BOTH conditions:
      - process.env.NEXT_PUBLIC_DEMO_MODE === "true"
      - URL contains ?demo=true
   2. Presentation mode only toggles CSS class on <body>
   3. Does NOT change component tree or layout logic
   4. Uses useRef for session-level seed guard (not module scope)
   ================================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { getDemoScenarioName, seedDemoScenario } from "@/lib/demo-seeder";

/* ---------- Context Shape ---------- */
interface DemoContextValue {
  /** True when BOTH env flag and URL param are set */
  isDemo: boolean;
  /** SHIFT+D toggles presentation mode (CSS-only) */
  presentationMode: boolean;
  /** Toggle presentation mode imperatively */
  togglePresentationMode: () => void;
  /** Current demo scenario name */
  scenarioName: string;
  /** Whether demo data has finished seeding */
  seeded: boolean;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  presentationMode: false,
  togglePresentationMode: () => {},
  scenarioName: "",
  seeded: false,
});

/* ---------- Hook ---------- */
export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}

/* ---------- Provider ---------- */
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  // Dual activation: env flag AND URL param
  const envFlag = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const urlParam = searchParams.get("demo") === "true";
  const isDemo = envFlag && urlParam;

  const [presentationMode, setPresentationMode] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Session-level guard: prevent re-seeding on navigation or toggle
  const seededOnceRef = useRef(false);

  // SHIFT+D keyboard shortcut for presentation mode
  useEffect(() => {
    if (!isDemo) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === "D") {
        e.preventDefault();
        setPresentationMode((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemo]);

  // Toggle presentation-mode CSS class on <body>
  useEffect(() => {
    if (presentationMode) {
      document.body.classList.add("presentation-mode");
    } else {
      document.body.classList.remove("presentation-mode");
    }
    return () => {
      document.body.classList.remove("presentation-mode");
    };
  }, [presentationMode]);

  // Seed demo data on mount when demo mode is active
  useEffect(() => {
    if (!isDemo) return;

    // Session guard: if already seeded in this React lifecycle, skip
    if (seededOnceRef.current) return;
    seededOnceRef.current = true;

    let cancelled = false;
    seedDemoScenario()
      .then((didSeed) => {
        if (cancelled) return;
        setSeeded(true);
        if (didSeed) {
          console.log("[DemoProvider] Demo scenario seeded successfully.");
        }
      })
      .catch((err) => {
        console.error("[DemoProvider] Seed failed:", err);
        if (!cancelled) setSeeded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const togglePresentationMode = useCallback(() => {
    setPresentationMode((prev) => !prev);
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo,
      presentationMode,
      togglePresentationMode,
      scenarioName: isDemo ? getDemoScenarioName() : "",
      seeded,
    }),
    [isDemo, presentationMode, togglePresentationMode, seeded],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
