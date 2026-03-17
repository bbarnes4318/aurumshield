/* ================================================================
   TOUR PROVIDER — State machine + context for tour runtime
   
   Manages: current step, navigation (next/back/jump), route 
   transitions, target resolution with retry. State persisted to 
   localStorage and synced with URL params.
   
   Cinematic Mode: When tour.cinematic is true, dispatches Vapi
   voice scripts on step change via useVapiSync.
   
   Exposes: startTour, nextStep, prevStep, jumpToStep, 
   pauseTour, resumeTour, exitTour, restartTour.
   ================================================================ */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type {
  TourState,
  TourStep,
  TourDefinition,
  TourStatus,
} from "./tourTypes";
import { INITIAL_TOUR_STATE } from "./tourTypes";
import { getTourForRole } from "../tours";
import { useVapiSync } from "../autopilot/useVapiSync";

/* ---------- Context Shape ---------- */

interface TourContextValue {
  /** Current tour state */
  state: TourState;
  /** Current tour definition (null if no tour active) */
  tour: TourDefinition | null;
  /** Current step definition (null if no tour active) */
  currentStep: TourStep | null;
  /** Total steps in current tour */
  totalSteps: number;
  /** Start a tour by role ID */
  startTour: (roleId: string) => void;
  /** Advance to next step */
  nextStep: () => void;
  /** Go back to previous step */
  prevStep: () => void;
  /** Jump to a specific step index */
  jumpToStep: (index: number) => void;
  /** Pause the tour */
  pauseTour: () => void;
  /** Resume the tour */
  resumeTour: () => void;
  /** Exit the tour entirely */
  exitTour: () => void;
  /** Restart the current tour from step 0 */
  restartTour: () => void;
  /** Mark current step as completed (used by click/element observers) */
  completeCurrentStep: () => void;
  /** Whether Vapi is currently speaking */
  isSpeaking: boolean;
  /** Vapi volume level for waveform displays */
  volumeLevel: number;
}

const TourContext = createContext<TourContextValue | null>(null);

/* ---------- Hook ---------- */

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}

/* ---------- Reducer ---------- */

type TourAction =
  | { type: "START"; tourId: string; stepIndex?: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "JUMP"; index: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "EXIT" }
  | { type: "COMPLETE" };

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START":
      return {
        tourId: action.tourId,
        stepIndex: action.stepIndex ?? 0,
        status: "active",
      };
    case "NEXT":
      return { ...state, stepIndex: state.stepIndex + 1 };
    case "PREV":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "JUMP":
      return { ...state, stepIndex: action.index };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "RESUME":
      return { ...state, status: "active" };
    case "EXIT":
      return INITIAL_TOUR_STATE;
    case "COMPLETE":
      return { ...state, status: "completed" };
    default:
      return state;
  }
}

/* ---------- Persistence Keys ---------- */

const SS_KEY = "aurumshield:tour-state";

function loadPersistedState(): TourState {
  if (typeof window === "undefined") return INITIAL_TOUR_STATE;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return INITIAL_TOUR_STATE;
    const parsed = JSON.parse(raw) as TourState;
    if (parsed.tourId && typeof parsed.stepIndex === "number") {
      return parsed;
    }
  } catch {
    // Ignore corrupt state
  }
  return INITIAL_TOUR_STATE;
}

function persistState(state: TourState): void {
  if (typeof window === "undefined") return;
  if (state.status === "idle") {
    sessionStorage.removeItem(SS_KEY);
  } else {
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }
}

/* ---------- Provider ---------- */

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Vapi sync for cinematic voice dispatch
  const {
    isSpeaking,
    speak,
    ensureCallActive,
    volumeLevel,
    stopCall,
  } = useVapiSync();

  // Initialize from localStorage or URL
  const initialState = useMemo(() => {
    const persisted = loadPersistedState();
    // URL params take priority if present
    const urlTour = searchParams.get("tour");
    const urlStep = searchParams.get("step");
    if (urlTour) {
      return {
        tourId: urlTour,
        stepIndex: urlStep ? parseInt(urlStep, 10) : persisted.stepIndex,
        status: "active" as TourStatus,
      };
    }
    return persisted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatch] = useReducer(tourReducer, initialState);
  const navigatingRef = useRef(false);
  const vapiStartedRef = useRef(false);
  const lastSpokenStepRef = useRef<string | null>(null);

  // Resolve current tour & step
  const tour = state.tourId ? (getTourForRole(state.tourId) ?? null) : null;
  const totalSteps = tour?.steps.length ?? 0;
  const currentStep =
    tour && state.stepIndex >= 0 && state.stepIndex < totalSteps
      ? tour.steps[state.stepIndex]
      : null;

  const isCinematic = tour?.cinematic === true;

  // Detect tour completion
  useEffect(() => {
    if (tour && state.stepIndex >= totalSteps && state.status === "active") {
      dispatch({ type: "COMPLETE" });
      console.info(`[Tour] Completed: ${tour.id}`);
      if (isCinematic) {
        stopCall();
      }
    }
  }, [tour, state.stepIndex, totalSteps, state.status, isCinematic, stopCall]);

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  // Handle route navigation for current step (Fix 4: no magic timeouts)
  useEffect(() => {
    if (!currentStep?.route || state.status !== "active") return;
    const targetPath = currentStep.route.split("?")[0];
    if (pathname !== targetPath && !navigatingRef.current) {
      navigatingRef.current = true;
      const separator = currentStep.route.includes("?") ? "&" : "?";
      const url = currentStep.route.includes("demo=true")
        ? currentStep.route
        : `${currentStep.route}${separator}demo=true`;
      router.push(url);
      // navigatingRef resets deterministically when pathname matches
    }
    // Reset navigation flag when we arrive at the correct route
    if (pathname === targetPath && navigatingRef.current) {
      navigatingRef.current = false;
    }
  }, [currentStep, pathname, router, state.status]);

  /* ── Cinematic Vapi Dispatch: fire voice script on step change ── */
  useEffect(() => {
    if (!isCinematic || state.status !== "active" || !currentStep) return;
    if (!currentStep.vapiScript) return;

    // Prevent re-speaking the same step
    const stepKey = `${state.tourId}-${state.stepIndex}`;
    if (lastSpokenStepRef.current === stepKey) return;
    lastSpokenStepRef.current = stepKey;

    // Ensure Vapi is started, then speak
    const controller = new AbortController();
    const signal = controller.signal;

    const run = async () => {
      if (!vapiStartedRef.current) {
        vapiStartedRef.current = true;
        try {
          await ensureCallActive(signal);
        } catch {
          // Vapi unavailable — fallback will handle it
        }
      }

      // Apply delay if specified (e.g. KYB step waits 3 seconds)
      if (currentStep.delayMs) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, currentStep.delayMs);
          signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        });
      }

      if (signal.aborted) return;

      try {
        await speak(currentStep.vapiScript!, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[Tour] Vapi speech failed:", err);
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, [isCinematic, state.status, state.stepIndex, state.tourId, currentStep, speak, ensureCallActive]);

  /* ---------- Actions ---------- */

  const startTour = useCallback(
    (roleId: string) => {
      const tourDef = getTourForRole(roleId);
      if (!tourDef) {
        console.warn(`[Tour] No tour found for role: ${roleId}`);
        return;
      }
      console.info(`[Tour] Started: ${roleId}`);
      lastSpokenStepRef.current = null;
      vapiStartedRef.current = false;
      dispatch({ type: "START", tourId: roleId });
      // Navigate to start route
      const separator = tourDef.startRoute.includes("?") ? "&" : "?";
      const url = tourDef.startRoute.includes("demo=true")
        ? tourDef.startRoute
        : `${tourDef.startRoute}${separator}demo=true`;
      router.push(url);
    },
    [router],
  );

  const nextStep = useCallback(() => {
    if (!tour || state.stepIndex >= totalSteps - 1) {
      dispatch({ type: "COMPLETE" });
      return;
    }
    const nextIdx = state.stepIndex + 1;
    console.info(`[Tour] Step: ${tour.steps[nextIdx]?.id ?? "end"}`);
    dispatch({ type: "NEXT" });
  }, [tour, state.stepIndex, totalSteps]);

  const prevStep = useCallback(() => {
    if (state.stepIndex <= 0) return;
    dispatch({ type: "PREV" });
  }, [state.stepIndex]);

  const jumpToStep = useCallback(
    (index: number) => {
      if (!tour || index < 0 || index >= totalSteps) return;
      console.info(`[Tour] Jump to step: ${tour.steps[index].id}`);
      dispatch({ type: "JUMP", index });
    },
    [tour, totalSteps],
  );

  const pauseTour = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resumeTour = useCallback(() => dispatch({ type: "RESUME" }), []);
  const exitTour = useCallback(() => {
    console.info("[Tour] Exited");
    dispatch({ type: "EXIT" });
    if (isCinematic) {
      stopCall();
      vapiStartedRef.current = false;
    }
  }, [isCinematic, stopCall]);

  const restartTour = useCallback(() => {
    if (!state.tourId) return;
    console.info(`[Tour] Restarted: ${state.tourId}`);
    lastSpokenStepRef.current = null;
    dispatch({ type: "START", tourId: state.tourId, stepIndex: 0 });
  }, [state.tourId]);

  const completeCurrentStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // Log current step on change
  useEffect(() => {
    if (currentStep && state.status === "active") {
      console.info(`[Tour] Step: ${currentStep.id}`);
    }
  }, [currentStep, state.status]);

  const value = useMemo<TourContextValue>(
    () => ({
      state,
      tour,
      currentStep,
      totalSteps,
      startTour,
      nextStep,
      prevStep,
      jumpToStep,
      pauseTour,
      resumeTour,
      exitTour,
      restartTour,
      completeCurrentStep,
      isSpeaking,
      volumeLevel,
    }),
    [
      state,
      tour,
      currentStep,
      totalSteps,
      startTour,
      nextStep,
      prevStep,
      jumpToStep,
      pauseTour,
      resumeTour,
      exitTour,
      restartTour,
      completeCurrentStep,
      isSpeaking,
      volumeLevel,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
