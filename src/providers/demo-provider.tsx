"use client";

/* ================================================================
   DEMO PROVIDER — Orchestration context for demo mode
   
   Rules:
   1. Demo mode requires BOTH conditions:
      - process.env.NEXT_PUBLIC_DEMO_MODE === "true"
      - URL contains ?demo=true
   2. Presentation mode toggles CSS class on <body>
      Also activatable via ?present=true
   3. Does NOT change component tree or layout logic
   4. Uses useRef for session-level seed guard (not module scope)
   5. Exposes demo role switching and reset
   6. Hides DemoScriptOverlay when tour is active (overlay collision prevention)
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
import {
  getDemoRole,
  setDemoRole as persistDemoRole,
  resetDemoState,
} from "@/demo/demo-mode";

/* ---------- Context Shape ---------- */
interface DemoContextValue {
  /** True when BOTH env flag and URL param are set */
  isDemo: boolean;
  /** SHIFT+D or ?present=true toggles presentation mode (CSS-only) */
  presentationMode: boolean;
  /** Toggle presentation mode imperatively */
  togglePresentationMode: () => void;
  /** Current demo scenario name */
  scenarioName: string;
  /** Whether demo data has finished seeding */
  seeded: boolean;
  /** Current demo role (real UserRole ID) */
  demoRole: string | null;
  /** Set the demo role for tour selection */
  setDemoRole: (role: string) => void;
  /** Reset all demo state (clears seed, role, tour) */
  resetDemo: () => void;
  /** Whether a tour is currently active (for overlay collision) */
  tourActive: boolean;
  /** Set tour active flag (called by TourProvider) */
  setTourActive: (active: boolean) => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  presentationMode: false,
  togglePresentationMode: () => {},
  scenarioName: "",
  seeded: false,
  demoRole: null,
  setDemoRole: () => {},
  resetDemo: () => {},
  tourActive: false,
  setTourActive: () => {},
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

  // Check for ?present=true
  const presentParam = searchParams.get("present") === "true";

  // Initialize presentation mode from URL param (avoids setState in effect)
  const [presentationMode, setPresentationMode] = useState(presentParam && envFlag && urlParam);
  const [seeded, setSeeded] = useState(false);
  // Initialize demo role from localStorage (avoids setState in effect)
  const [demoRole, setDemoRoleState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    if (!(envFlag && urlParam)) return null;
    return getDemoRole();
  });
  const [tourActive, setTourActive] = useState(false);

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

  const setDemoRole = useCallback((role: string) => {
    setDemoRoleState(role);
    persistDemoRole(role);
  }, []);

  const resetDemo = useCallback(() => {
    resetDemoState();
    setDemoRoleState(null);
    setSeeded(false);
    seededOnceRef.current = false;
    setTourActive(false);
    // Re-seed on next render cycle
    window.location.reload();
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo,
      presentationMode,
      togglePresentationMode,
      scenarioName: isDemo ? getDemoScenarioName() : "",
      seeded,
      demoRole,
      setDemoRole,
      resetDemo,
      tourActive,
      setTourActive,
    }),
    [
      isDemo,
      presentationMode,
      togglePresentationMode,
      seeded,
      demoRole,
      setDemoRole,
      resetDemo,
      tourActive,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
